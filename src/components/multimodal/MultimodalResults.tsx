import { useMemo, useState } from "react"
import {
  CloudSun, Database, Navigation, Save, Bookmark,
  ShieldAlert, ShieldCheck, Users, Activity, Clock, Sparkles, AlertCircle, Compass, Bus,
  Armchair, User, Check,
} from "lucide-react"
import RouteCard from "./RouteCard"
import SegmentTimeline from "./SegmentTimeline"
import WeatherBanner from "./WeatherBanner"
import Button from "../ui/Button"
import Badge from "../ui/Badge"
import type { MultimodalRoute, RouteSegment, CrowdLevel, WeatherReport } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"
import { intelligenceService } from "../../services/intelligenceService"
import { stripLeadingEmoji } from "../../utils/text"

interface Props {
  routes: MultimodalRoute[]
  selectedIndex: number
  onSelectRoute: (index: number) => void
  origin: GeoLocation
  destination: GeoLocation
  onSaveJourney?: (route: MultimodalRoute) => Promise<void>
  saveStatus?: "idle" | "saving" | "saved" | "error"
  saveMessage?: string
  // Problem 10 — Save Route (reusable snapshot), distinct from Save Journey above.
  onSaveRoute?: (route: MultimodalRoute) => Promise<void>
  saveRouteStatus?: "idle" | "saving" | "saved" | "error"
  saveRouteMessage?: string
  // Set only when a bus stop exists near both origin and destination but no
  // bus-involving route won the ranking — explains an absence that would
  // otherwise look like a missing feature. See multimodalController.ts.
  busAlternativeNote?: string
  // The weather the routes were planned for, and what was done about bad weather.
  weatherReport?: WeatherReport
  // Voice-guided turn-by-turn navigation (ActiveNavigationView.tsx) — a pure
  // mode switch, synchronous, no loading state needed.
  onStartNavigation?: (route: MultimodalRoute) => void
}

function transitSegments(route: MultimodalRoute): RouteSegment[] {
  return route.segments.filter((segment) => segment.mode === "metro" || segment.mode === "bus")
}

// Icon-card crowd-level picker, matching the "how full is it" pattern real
// transit apps use — same three CrowdLevel values the backend already
// accepts, just presented as tappable cards instead of a <select>.
const CROWD_OPTIONS: Array<{ value: CrowdLevel; label: string; icon: typeof Armchair }> = [
  { value: "LOW", label: "Lots of open seats", icon: Armchair },
  { value: "MEDIUM", label: "Few if any seats", icon: User },
  { value: "HIGH", label: "Packed like sardines", icon: Users },
]

function sourceLabel(source?: string) {
  if (source === "RECENT_USER_REPORT") return "Recent user reports"
  if (source === "LIVE_USER_REPORT") return "User report"
  if (source === "DEMO_DATA") return "Demo data"
  if (source === "HISTORICAL_DATA") return "Historical data"
  if (source === "NOT_APPLICABLE") return "No metro or bus leg"
  return "Unavailable"
}

// A white panel, the same on every information card below the routes.
const PANEL = "rounded-panel border border-navy-100 bg-white p-4 shadow-card"

export default function MultimodalResults({
  routes,
  selectedIndex,
  onSelectRoute,
  origin,
  destination,
  onSaveJourney,
  saveStatus = "idle",
  saveMessage = "",
  onSaveRoute,
  saveRouteStatus = "idle",
  saveRouteMessage = "",
  busAlternativeNote = "",
  weatherReport,
  onStartNavigation,
}: Props) {
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>("MEDIUM")
  const [accessibilityIssue, setAccessibilityIssue] = useState("lift_unavailable")
  const [reportMessage, setReportMessage] = useState("")
  const [reportError, setReportError] = useState("")
  const selected = routes[selectedIndex]
  // Phase 10 — found by testing this component with a genuinely empty
  // `routes` array (not just an out-of-range selectedIndex): `selected ??
  // routes[0]` still evaluates to undefined when routes itself is [], and
  // transitSegments(undefined) then threw reading `.segments`, crashing the
  // whole component instead of falling through to the `if (!selected)
  // return null` below. Currently unreachable in the app (PlanTripPage only
  // mounts this component when routes.length > 0), but the same class of
  // bug as B7 — a component contract this component's own early-return
  // implies it should honor regardless of what the current caller happens
  // to guarantee.
  const reportTarget = selected ?? routes[0]
  const reportStation = useMemo(() => (reportTarget ? transitSegments(reportTarget)[0] : undefined), [reportTarget])

  // These read `selected` defensively (it may be undefined here) so they can
  // sit above the early return below, alongside every other hook.
  const checkedStations = selected?.accessibility?.checkedStations ?? []
  const crowdStations = selected?.crowd?.stations ?? []

  // Phase 4 fix (B7) — this useMemo used to come AFTER `if (!selected) return
  // null`, so it ran on some renders and not others depending on `selected`.
  // That's a Rules-of-Hooks violation: React requires every hook to run in
  // the same order on every render of this component, or it throws
  // "Rendered fewer hooks than expected". Moving both this memo and the
  // early return below it (instead of between them) fixes that — every hook
  // in this component now runs unconditionally on every render.
  const reportStationId = useMemo(() => {
    if (!reportStation) return null
    const match =
      checkedStations.find((s) => s.stationName === reportStation.from.name) ??
      crowdStations.find((s) => s.stationName === reportStation.from.name)
    return match?.stationId ?? null
  }, [reportStation, checkedStations, crowdStations])

  if (!selected) return null

  const weather = selected.weatherImpact?.weather

  async function submitCrowdReport() {
    if (!reportStation || !reportStationId) return
    setReportMessage("")
    setReportError("")
    try {
      await intelligenceService.reportCrowd({
        stationId: reportStationId,
        stationName: reportStation.from.name,
        transportMode: reportStation.mode === "metro" ? "metro" : "bus",
        crowdLevel,
      })
      setReportMessage("Crowd report submitted.")
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Crowd report failed.")
    }
  }

  async function submitAccessibilityReport() {
    if (!reportStation || !reportStationId) return
    setReportMessage("")
    setReportError("")
    try {
      await intelligenceService.reportAccessibilityIssue({
        stationId: reportStationId,
        stationName: reportStation.from.name,
        issueType: accessibilityIssue,
        description: `User reported ${accessibilityIssue.split("_").join(" ")} at ${reportStation.from.name}.`,
      })
      setReportMessage("Accessibility issue submitted for verification.")
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Accessibility report failed.")
    }
  }

  // What you can do with the chosen route: start it (the one green button), or keep it. It sits directly under the chosen
  // card, so the choice and its actions are never far apart however many options there are.
  const actions = (
    <div className="space-y-2.5 rounded-panel border border-brand-100 bg-brand-50/60 p-3">
      {selected.transitDnaScore !== undefined && (
        <Badge variant="brand" className="font-bold">
          TransitDNA Match: {selected.transitDnaScore}%
        </Badge>
      )}
      {onStartNavigation && (
        <Button variant="go" size="lg" fullWidth onClick={() => onStartNavigation(selected)} icon={<Navigation className="h-4 w-4" />}>
          Start Journey
        </Button>
      )}
      <div className="flex gap-2 [&>*]:flex-1">
        {onSaveRoute && (
          <Button variant="outline" onClick={() => void onSaveRoute(selected)} loading={saveRouteStatus === "saving"} icon={<Bookmark className="h-3.5 w-3.5" />}>
            Save Route
          </Button>
        )}
        {onSaveJourney && (
          <Button onClick={() => void onSaveJourney(selected)} loading={saveStatus === "saving"} icon={<Save className="h-3.5 w-3.5" />}>
            Save Journey
          </Button>
        )}
      </div>
      {saveMessage && (
        <p role="status" className={`text-xs font-medium ${saveStatus === "error" ? "text-red-800" : "text-go-800"}`}>{saveMessage}</p>
      )}
      {saveRouteMessage && (
        <p role="status" className={`text-xs font-medium ${saveRouteStatus === "error" ? "text-red-800" : "text-go-800"}`}>{saveRouteMessage}</p>
      )}
    </div>
  )

  // One option: its card, and (when it is the chosen one) the actions right under it.
  const renderOption = (route: MultimodalRoute, i: number) => (
    <div key={route.id} className="space-y-3">
      <RouteCard route={route} selected={i === selectedIndex} onSelect={() => onSelectRoute(i)} index={i} />
      {i === selectedIndex && actions}
    </div>
  )

  return (
    <div className="space-y-4">
      <WeatherBanner weather={weatherReport} />

      {/* Where from and to, and a reminder that the data is a demonstration */}
      <div className="flex items-center justify-between gap-3 px-1 text-xs text-navy-600">
        <p className="min-w-0 truncate">
          <span className="font-semibold text-navy-800">{origin.name}</span> → <span className="font-semibold text-navy-800">{destination.name}</span>
        </p>
        <Badge variant="warning" dot className="flex-shrink-0">Demo data</Badge>
      </div>

      {busAlternativeNote && (
        <div className="flex items-start gap-2 rounded-panel bg-brand-50 px-3 py-2.5">
          <Bus className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700" aria-hidden="true" />
          <p className="text-xs font-medium text-brand-800">{busAlternativeNote}</p>
        </div>
      )}

      {/* Accessibility profiles: why this route suits the rider (decided by the profile's own rules) */}
      {selected.profileFit && (
        <section aria-label="Why this route suits you" className="space-y-2 rounded-panel border border-go-200 bg-go-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-go-900">
            <Sparkles className="h-4 w-4 text-go-700" aria-hidden="true" />
            {selected.profileFit.headline}
          </div>
          <ul className="space-y-1">
            {selected.profileFit.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-1.5 text-xs font-medium text-go-900">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-go-700" aria-hidden="true" />
                <span>{stripLeadingEmoji(reason)}</span>
              </li>
            ))}
          </ul>
          {selected.profileFit.tips.length > 0 && (
            <ul className="space-y-1 border-t border-go-200 pt-2">
              {selected.profileFit.tips.map((tip) => (
                <li key={tip} className="text-[11px] text-go-800">Tip: {tip}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Why Recommended Explainable Box */}
      {!selected.profileFit && selected.whyRecommended && selected.whyRecommended.length > 0 && (
        <div className="space-y-2 rounded-panel bg-brand-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-900">
            <Sparkles className="h-4 w-4 text-brand-700" aria-hidden="true" />
            Why TransitSwap Recommends This Route
          </div>
          <div className="space-y-1.5 pt-1">
            {selected.whyRecommended.map((reason, idx) => (
              <p key={idx} className="flex items-start gap-1.5 text-xs font-medium text-brand-800">
                <span>{stripLeadingEmoji(reason)}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Accessibility profiles: the best route up front, the other suitable options tucked away */}
      {routes.length > 1 && routes[0].profileFit && (
        <div className="space-y-3">
          {renderOption(routes[0], 0)}
          <details className="rounded-panel bg-navy-100/60 px-5 py-3" open={selectedIndex > 0 ? true : undefined}>
            <summary className="cursor-pointer text-sm font-medium text-navy-700">
              Show other suitable options ({routes.length - 1})
            </summary>
            <div className="mt-3 space-y-3">
              {routes.slice(1).map((route, i) => renderOption(route, i + 1))}
            </div>
          </details>
        </div>
      )}

      {/* Available Routes List */}
      {routes.length > 1 && !routes[0].profileFit && (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-navy-500">Candidate Journeys Ranked by Preference</p>
          <div className="space-y-3">
            {routes.map((route, i) => renderOption(route, i))}
          </div>
        </div>
      )}

      {routes.length === 1 && renderOption(routes[0], 0)}

      {/* Segment Details Timeline */}
      <SegmentTimeline route={selected} profile={selected.accessibility?.profile} />

      {/* Reliability & Predictive Intelligence */}
      <div className="grid grid-cols-1 gap-3">
        {/* Confidence Interval Card */}
        <div className={`${PANEL} space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <Clock className="h-4 w-4 text-brand-700" aria-hidden="true" /> Arrival Confidence Interval
            </div>
            <Badge variant="info">
              {!selected.confidenceInterval
                ? "Unavailable"
                : selected.confidenceInterval.isDataDriven === false
                ? "Prototype estimate"
                : `${selected.confidenceInterval.confidenceLevelPercent}% Confidence`}
            </Badge>
          </div>
          <p className="font-display text-lg font-bold text-navy-900">
            {selected.confidenceInterval
              ? `${selected.confidenceInterval.expectedArrivalMin} – ${selected.confidenceInterval.expectedArrivalMax}`
              : "Arrival estimate unavailable"}
          </p>
          <p className="text-xs text-navy-600">
            {selected.confidenceInterval?.explanation ?? "Estimated arrival window based on historical segment variance."}
          </p>
        </div>

        {/* Missed Connection Risk Card */}
        <div className={`${PANEL} space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <Activity className="h-4 w-4 text-amber-700" aria-hidden="true" /> Missed Connection Risk (Monte Carlo)
            </div>
            <Badge variant={selected.missedConnectionRisk?.riskLevel === "HIGH" ? "danger" : selected.missedConnectionRisk?.riskLevel === "MEDIUM" ? "warning" : "success"}>
              {selected.missedConnectionRisk?.overallRiskPercent ?? 0}% Risk
            </Badge>
          </div>
          <p className="text-xs font-medium text-navy-700">
            {selected.missedConnectionRisk?.summary ?? "Direct journey with zero transfer risk."}
          </p>

          {selected.missedConnectionRisk?.transfers && selected.missedConnectionRisk.transfers.length > 0 && (
            <div className="space-y-1 border-t border-navy-100 pt-1">
              {selected.missedConnectionRisk.transfers.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-[11px] text-navy-600">
                  <span>Transfer at {t.transferStation} ({t.fromSegmentMode} → {t.toSegmentMode}):</span>
                  <span className="font-semibold">{t.estimatedRiskPercent}% risk</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Smart Departure Suggestion */}
      {selected.departureSuggestion ? (
        <div className="flex items-start gap-3 rounded-panel bg-brand-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-700" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-brand-900">Smart Departure Recommendation</p>
            <p className="text-xs text-brand-800">
              Recommended departure: <span className="font-bold">{selected.departureSuggestion.suggestedDepartureTime}</span> (Expected arrival ~{selected.departureSuggestion.expectedArrival}).
            </p>
            <p className="text-[11px] text-brand-800">{selected.departureSuggestion.reason}</p>
            {selected.departureSuggestion.reliabilityGainPercent > 0 && (
              <p className="text-[11px] text-brand-800">
                Estimated missed-connection risk improvement: {selected.departureSuggestion.reliabilityGainPercent}%
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-panel bg-navy-100/60 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy-500" aria-hidden="true" />
          <p className="text-xs text-navy-600">
            Select a departure time to calculate a smart departure recommendation.
          </p>
        </div>
      )}

      {/* Weather, Accessibility, Crowd Context */}
      <div className="grid grid-cols-1 gap-3">
        <div className={`${PANEL} space-y-2`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <CloudSun className="h-4 w-4 text-brand-700" aria-hidden="true" /> Weather Context
          </div>
          {weather ? (
            <>
              <p className="font-display text-xl font-bold text-navy-900">{weather.temperatureC}°C</p>
              <p className="text-xs text-navy-600">{weather.condition} · wind {weather.windKph} km/h · rain {weather.rainMm} mm</p>
              <Badge variant={selected.weatherImpact?.level === "high" ? "danger" : selected.weatherImpact?.level === "medium" ? "warning" : "success"}>
                {selected.weatherImpact?.summary}
              </Badge>
              <p className="text-[11px] text-navy-500">{weather.source}</p>
            </>
          ) : (
            <p className="text-xs text-navy-600">Weather information temporarily unavailable.</p>
          )}
        </div>

        <div className={`${PANEL} space-y-2`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" /> Accessibility Check
          </div>
          <Badge variant={selected.accessibility?.status === "accessible" ? "success" : selected.accessibility?.status === "not_accessible" ? "danger" : "warning"}>
            {selected.accessibility?.status.replace("_", " ") ?? "unknown"}
          </Badge>
          <p className="text-xs text-navy-600">{selected.accessibility?.summary}</p>
          {selected.accessibility && selected.accessibility.warnings.length > 0 && (
            <ul className="space-y-1 rounded-control border border-amber-200 bg-amber-50 px-2.5 py-2">
              {selected.accessibility.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-1">
            {checkedStations.slice(0, 3).map((station) => (
              <p key={station.stationId} className="text-[11px] text-navy-600">
                {station.stationName}: {station.status.replace("_", " ")}
              </p>
            ))}
          </div>
        </div>

        <div className={`${PANEL} space-y-2`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Users className="h-4 w-4 text-amber-700" aria-hidden="true" /> Crowd on this route
          </div>
          <Badge variant={selected.crowd?.level === "LOW" ? "success" : selected.crowd?.level === "HIGH" ? "danger" : "warning"}>
            {selected.crowd?.level ?? "Unavailable"}
          </Badge>
          <p className="text-xs text-navy-600">{selected.crowd?.summary}</p>
          <p className="text-[11px] text-navy-500">{sourceLabel(selected.crowd?.source)}</p>
          <div className="space-y-1">
            {selected.crowd?.legs && selected.crowd.legs.length > 0
              ? selected.crowd.legs.map((leg) => (
                  <p key={leg.segmentId} className="text-[11px] text-navy-600">
                    <span className="font-semibold text-navy-700">{leg.label}</span> {leg.from} → {leg.to}:{" "}
                    <span className="font-semibold">{leg.level ?? "unknown"}</span>
                  </p>
                ))
              : crowdStations.slice(0, 2).map((station) => (
                  <p key={station.stationId} className="text-[11px] text-navy-600">
                    {station.stationName}: {station.crowdLevel ?? "unknown"} ({sourceLabel(station.source)})
                  </p>
                ))}
          </div>
        </div>
      </div>

      {/* Last-Mile Connectivity Section */}
      {selected.lastMileOptions && selected.lastMileOptions.length > 0 && (
        <div className={`${PANEL} space-y-2`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Compass className="h-4 w-4 text-brand-700" aria-hidden="true" /> Last-Mile Connectivity Options
          </div>
          <div className="grid grid-cols-1 gap-2 pt-1">
            {selected.lastMileOptions.map((opt, idx) => (
              <div
                key={idx}
                className={`rounded-control border p-3 ${
                  opt.isRecommended ? "border-brand-300 bg-brand-50" : "border-navy-200 bg-navy-50/60"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-navy-800">{opt.mode}</span>
                  {opt.isRecommended && <Badge variant="brand">Recommended</Badge>}
                </div>
                <p className="text-xs font-medium text-navy-700">{opt.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Reporting Section */}
      {reportStation && (
        <div className={`${PANEL} space-y-3`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Database className="h-4 w-4 text-navy-500" aria-hidden="true" /> Submit User Feedback / Crowd Report for {reportStation.from.name}
          </div>
          {reportStationId ? (
            <div className="grid grid-cols-1 items-start gap-4">
              <div className="space-y-2">
                <p id="crowd-report-label" className="text-xs font-semibold text-navy-600">How crowded is it?</p>
                <div role="group" aria-labelledby="crowd-report-label" className="grid grid-cols-3 gap-1.5">
                  {CROWD_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isChosen = crowdLevel === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={isChosen}
                        onClick={() => setCrowdLevel(opt.value)}
                        className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-control px-2 py-2.5 text-center transition-colors ${
                          isChosen ? "bg-brand-500 text-white shadow-card" : "bg-navy-100 text-navy-700 hover:bg-navy-200"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="text-[10px] font-semibold leading-tight">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
                <Button size="sm" variant="outline" fullWidth onClick={() => void submitCrowdReport()}>Report</Button>
              </div>
              <div className="space-y-2">
                <label htmlFor="accessibility-issue" className="block text-xs font-semibold text-navy-600">
                  Report an accessibility issue
                </label>
                <select
                  id="accessibility-issue"
                  value={accessibilityIssue}
                  onChange={(event) => setAccessibilityIssue(event.target.value)}
                  className="min-h-11 w-full rounded-control border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  <option value="lift_unavailable">Lift unavailable</option>
                  <option value="ramp_blocked">Ramp blocked</option>
                  <option value="escalator_not_working">Escalator not working</option>
                  <option value="stairs_issue">Stairs issue</option>
                  <option value="other">Other issue</option>
                </select>
                <Button size="sm" variant="outline" fullWidth icon={<ShieldAlert className="h-3.5 w-3.5" />} onClick={() => void submitAccessibilityReport()}>
                  Report issue
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-navy-600">
              This station is currently using demo station context. Reports are saved locally for evaluation.
            </p>
          )}
          {reportMessage && <p className="text-xs font-medium text-go-800">{reportMessage}</p>}
          {reportError && <p className="text-xs font-medium text-red-800">{reportError}</p>}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-navy-500">
        <Navigation className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" aria-hidden="true" />
        TransitSwap Intelligence Engine active: Multimodal routing, TransitDNA, Weather, Accessibility, Monte Carlo transfer risk, &amp; Confidence Intervals.
      </p>
    </div>
  )
}

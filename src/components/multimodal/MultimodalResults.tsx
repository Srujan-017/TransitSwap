import { useMemo, useState } from "react"
import {
  CloudSun, Database, FlaskConical, MapPin, Navigation, Save, Bookmark,
  ShieldAlert, ShieldCheck, Users, Activity, Clock, Sparkles, AlertCircle, Compass,
} from "lucide-react"
import RouteCard from "./RouteCard"
import SegmentTimeline from "./SegmentTimeline"
import Button from "../ui/Button"
import Badge from "../ui/Badge"
import type { MultimodalRoute, RouteSegment, CrowdLevel } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"
import { formatDuration, formatDistance } from "../../utils/formatters"
import { intelligenceService } from "../../services/intelligenceService"

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
}

function transitSegments(route: MultimodalRoute): RouteSegment[] {
  return route.segments.filter((segment) => segment.mode === "metro" || segment.mode === "bus")
}

function sourceLabel(source?: string) {
  if (source === "RECENT_USER_REPORT") return "Recent user reports"
  if (source === "LIVE_USER_REPORT") return "User report"
  if (source === "DEMO_DATA") return "Demo data"
  if (source === "HISTORICAL_DATA") return "Historical data"
  return "Unavailable"
}

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
}: Props) {
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>("MEDIUM")
  const [accessibilityIssue, setAccessibilityIssue] = useState("lift_unavailable")
  const [reportMessage, setReportMessage] = useState("")
  const [reportError, setReportError] = useState("")
  const selected = routes[selectedIndex]
  const reportStation = useMemo(() => transitSegments(selected ?? routes[0])[0], [selected, routes])
  if (!selected) return null

  const weather = selected.weatherImpact?.weather
  const checkedStations = selected.accessibility?.checkedStations ?? []
  const crowdStations = selected.crowd?.stations ?? []

  const reportStationId = useMemo(() => {
    if (!reportStation) return null
    const match =
      checkedStations.find((s) => s.stationName === reportStation.from.name) ??
      crowdStations.find((s) => s.stationName === reportStation.from.name)
    return match?.stationId ?? null
  }, [reportStation, checkedStations, crowdStations])

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

  return (
    <div className="space-y-4">
      {/* Route Journey Summary Header */}
      <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            TransitSwap Intelligence Engine active. Evaluated multimodal routes with weather, accessibility, Monte Carlo connection risk, and TransitDNA scoring.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-brand-200 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-navy-500 font-semibold uppercase tracking-wide">From</p>
            <p className="text-sm font-medium text-navy-800 truncate">{origin.name}</p>
          </div>
        </div>
        <div className="ml-[5px] border-l-2 border-dashed border-navy-200 h-3" />
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-navy-500 font-semibold uppercase tracking-wide">To</p>
            <p className="text-sm font-medium text-navy-800 truncate">{destination.name}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-navy-100 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="font-bold text-brand-700 text-lg">{formatDuration(Math.round(selected.totalDurationSeconds / 60))}</div>
            <div className="font-bold text-green-700 text-base">Rs {selected.totalFare} est.</div>
            <div className="text-xs text-navy-500 font-medium">
              Walk {formatDistance(selected.totalWalkingMeters)} · {selected.transferCount} transfer{selected.transferCount !== 1 ? "s" : ""}
            </div>
            {selected.transitDnaScore !== undefined && (
              <Badge variant="brand" className="font-bold">
                TransitDNA Match: {selected.transitDnaScore}%
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSaveRoute && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void onSaveRoute(selected)}
                loading={saveRouteStatus === "saving"}
                icon={<Bookmark className="w-3.5 h-3.5" />}
              >
                Save Route
              </Button>
            )}
            {onSaveJourney && (
              <Button
                size="sm"
                onClick={() => void onSaveJourney(selected)}
                loading={saveStatus === "saving"}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save Journey
              </Button>
            )}
          </div>
        </div>
        {saveMessage && (
          <p className={`text-xs ${saveStatus === "error" ? "text-danger" : "text-emerald-700"}`}>{saveMessage}</p>
        )}
        {saveRouteMessage && (
          <p className={`text-xs ${saveRouteStatus === "error" ? "text-danger" : "text-emerald-700"}`}>{saveRouteMessage}</p>
        )}
      </div>

      {/* Why Recommended Explainable Box */}
      {selected.whyRecommended && selected.whyRecommended.length > 0 && (
        <div className="bg-gradient-to-r from-brand-50 via-sky-50 to-indigo-50 rounded-2xl border border-brand-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-900">
            <Sparkles className="w-4 h-4 text-brand-600" />
            Why TransitSwap Recommends This Route
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {selected.whyRecommended.map((reason, idx) => (
              <p key={idx} className="text-xs font-medium text-brand-800 flex items-start gap-1.5">
                <span>{reason}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Available Routes List */}
      {routes.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2 px-1">Candidate Journeys Ranked by Preference</p>
          <div className="space-y-3">
            {routes.map((route, i) => (
              <RouteCard key={route.id} route={route} selected={i === selectedIndex} onSelect={() => onSelectRoute(i)} index={i} />
            ))}
          </div>
        </div>
      )}

      {routes.length === 1 && <RouteCard route={selected} selected={true} onSelect={() => {}} index={0} />}

      {/* Reliability & Predictive Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Confidence Interval Card */}
        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <Clock className="w-4 h-4 text-indigo-600" /> Arrival Confidence Interval
            </div>
            <Badge variant="info">
              {!selected.confidenceInterval
                ? "Unavailable"
                : selected.confidenceInterval.isDataDriven === false
                ? "Prototype estimate"
                : `${selected.confidenceInterval.confidenceLevelPercent}% Confidence`}
            </Badge>
          </div>
          <p className="text-lg font-display font-bold text-navy-900">
            {selected.confidenceInterval
              ? `${selected.confidenceInterval.expectedArrivalMin} – ${selected.confidenceInterval.expectedArrivalMax}`
              : "Arrival estimate unavailable"}
          </p>
          <p className="text-xs text-navy-500">
            {selected.confidenceInterval?.explanation ?? "Estimated arrival window based on historical segment variance."}
          </p>
        </div>

        {/* Missed Connection Risk Card */}
        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
              <Activity className="w-4 h-4 text-amber-600" /> Missed Connection Risk (Monte Carlo)
            </div>
            <Badge variant={selected.missedConnectionRisk?.riskLevel === "HIGH" ? "danger" : selected.missedConnectionRisk?.riskLevel === "MEDIUM" ? "warning" : "success"}>
              {selected.missedConnectionRisk?.overallRiskPercent ?? 0}% Risk
            </Badge>
          </div>
          <p className="text-xs font-medium text-navy-700">
            {selected.missedConnectionRisk?.summary ?? "Direct journey with zero transfer risk."}
          </p>

          {selected.missedConnectionRisk?.transfers && selected.missedConnectionRisk.transfers.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-navy-100">
              {selected.missedConnectionRisk.transfers.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-navy-600">
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
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-sky-900">Smart Departure Recommendation</p>
            <p className="text-xs text-sky-800">
              Recommended departure: <span className="font-bold">{selected.departureSuggestion.suggestedDepartureTime}</span> (Expected arrival ~{selected.departureSuggestion.expectedArrival}).
            </p>
            <p className="text-[11px] text-sky-700">{selected.departureSuggestion.reason}</p>
            {selected.departureSuggestion.reliabilityGainPercent > 0 && (
              <p className="text-[11px] text-sky-700">
                Estimated missed-connection risk improvement: {selected.departureSuggestion.reliabilityGainPercent}%
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-navy-50 border border-navy-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-navy-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-navy-500">
            Select a departure time to calculate a smart departure recommendation.
          </p>
        </div>
      )}

      {/* Weather, Accessibility, Crowd Context Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <CloudSun className="w-4 h-4 text-sky-600" /> Weather Context
          </div>
          {weather ? (
            <>
              <p className="text-xl font-display font-bold text-navy-900">{weather.temperatureC}°C</p>
              <p className="text-xs text-navy-500">{weather.condition} · wind {weather.windKph} km/h · rain {weather.rainMm} mm</p>
              <Badge variant={selected.weatherImpact?.level === "high" ? "danger" : selected.weatherImpact?.level === "medium" ? "warning" : "success"}>
                {selected.weatherImpact?.summary}
              </Badge>
              <p className="text-[11px] text-navy-400">{weather.source}</p>
            </>
          ) : (
            <p className="text-xs text-navy-500">Weather information temporarily unavailable.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <ShieldCheck className="w-4 h-4 text-brand-600" /> Accessibility Check
          </div>
          <Badge variant={selected.accessibility?.status === "accessible" ? "success" : selected.accessibility?.status === "not_accessible" ? "danger" : "warning"}>
            {selected.accessibility?.status.replace("_", " ") ?? "unknown"}
          </Badge>
          <p className="text-xs text-navy-500">{selected.accessibility?.summary}</p>
          <div className="space-y-1">
            {checkedStations.slice(0, 3).map((station) => (
              <p key={station.stationId} className="text-[11px] text-navy-500">
                {station.stationName}: {station.status.replace("_", " ")}
              </p>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Users className="w-4 h-4 text-amber-600" /> Station Crowd
          </div>
          <Badge variant={selected.crowd?.level === "LOW" ? "success" : selected.crowd?.level === "HIGH" ? "danger" : "warning"}>
            {selected.crowd?.level ?? "Unavailable"}
          </Badge>
          <p className="text-xs text-navy-500">{selected.crowd?.summary}</p>
          <p className="text-[11px] text-navy-400">{sourceLabel(selected.crowd?.source)}</p>
          <div className="space-y-1">
            {crowdStations.slice(0, 2).map((station) => (
              <p key={station.stationId} className="text-[11px] text-navy-500">
                {station.stationName}: {station.crowdLevel ?? "unknown"} ({sourceLabel(station.source)})
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Last-Mile Connectivity Section */}
      {selected.lastMileOptions && selected.lastMileOptions.length > 0 && (
        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Compass className="w-4 h-4 text-brand-600" /> Last-Mile Connectivity Options
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {selected.lastMileOptions.map((opt, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border ${
                  opt.isRecommended ? "border-brand-300 bg-brand-50" : "border-navy-200 bg-navy-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-navy-800">{opt.mode}</span>
                  {opt.isRecommended && <Badge variant="brand">Recommended</Badge>}
                </div>
                <p className="text-xs text-navy-600 font-medium">{opt.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Reporting Section */}
      {reportStation && (
        <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Database className="w-4 h-4 text-navy-500" /> Submit User Feedback / Crowd Report for {reportStation.from.name}
          </div>
          {reportStationId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-2">
                <select
                  value={crowdLevel}
                  onChange={(event) => setCrowdLevel(event.target.value as CrowdLevel)}
                  className="flex-1 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2 text-sm"
                >
                  <option value="LOW">Low crowd</option>
                  <option value="MEDIUM">Medium crowd</option>
                  <option value="HIGH">High crowd</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => void submitCrowdReport()}>Report</Button>
              </div>
              <div className="flex gap-2">
                <select
                  value={accessibilityIssue}
                  onChange={(event) => setAccessibilityIssue(event.target.value)}
                  className="flex-1 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2 text-sm"
                >
                  <option value="lift_unavailable">Lift unavailable</option>
                  <option value="ramp_blocked">Ramp blocked</option>
                  <option value="escalator_not_working">Escalator not working</option>
                  <option value="stairs_issue">Stairs issue</option>
                  <option value="other">Other issue</option>
                </select>
                <Button size="sm" variant="outline" icon={<ShieldAlert className="w-3.5 h-3.5" />} onClick={() => void submitAccessibilityReport()}>
                  Submit
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-navy-500">
              This station is currently using demo station context. Reports are saved locally for evaluation.
            </p>
          )}
          {reportMessage && <p className="text-xs text-emerald-700 font-medium">{reportMessage}</p>}
          {reportError && <p className="text-xs text-danger font-medium">{reportError}</p>}
        </div>
      )}

      {/* Segment Details Timeline */}
      <SegmentTimeline route={selected} />

      <p className="text-xs text-navy-400 text-center flex items-center justify-center gap-1.5 pt-2">
        <Navigation className="w-3.5 h-3.5 text-brand-500" />
        TransitSwap Intelligence Engine active: Multimodal routing, TransitDNA, Weather, Accessibility, Monte Carlo transfer risk, & Confidence Intervals.
      </p>
    </div>
  )
}

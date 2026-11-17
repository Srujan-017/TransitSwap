import { ArrowRight, Check, CloudRain, Footprints, IndianRupee, ShieldCheck, Users, Brain, Sprout, Star } from "lucide-react"
import ModeIcon from "../ui/ModeIcon"
import { formatClock } from "../../navigation/clock"
import type { MultimodalRoute, MultimodalMode, RouteSegment, LegCrowd } from "../../types/multimodal"
import { formatDuration, formatDistance } from "../../utils/formatters"
import { stripLeadingEmoji } from "../../utils/text"

interface Props {
  route: MultimodalRoute
  selected: boolean
  onSelect: () => void
  index: number
}

const MODE_LABEL: Record<MultimodalMode, string> = {
  walking: "Walk",
  metro: "Metro",
  bus: "Bus",
  auto: "Auto",
}

// The colour of a leg on the journey bar: the same colours the map draws it in (a metro leg in its own line's colour,
// bus teal, auto yellow, walking grey), so the card and the map read as one picture.
function legColour(seg: RouteSegment): string {
  if (seg.mode === "metro") return seg.transitDetails?.lineColor || "#1f5bd8"
  if (seg.mode === "bus") return "#0f766e"
  if (seg.mode === "auto") return "#e0a500"
  return "#94a3b8"
}

function crowdClass(level?: string) {
  if (level === "LOW") return "text-go-800 bg-go-50"
  if (level === "HIGH") return "text-red-800 bg-red-50"
  return "text-amber-800 bg-amber-50"
}

const CROWD_CHIP: Record<string, string> = {
  LOW: "bg-go-100 text-go-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
}

/** One chip of the strip that names each leg. Dark text on a light chip (or white on bus teal); a line colour is only ever a dot. */
function LegChip({ seg }: { seg: RouteSegment }) {
  const base = "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold leading-none"
  if (seg.mode === "bus") {
    return (
      <span className={`${base} bg-bus-600 text-white`}>
        <ModeIcon mode="bus" className="h-3.5 w-3.5" />
        {MODE_LABEL.bus}
        {seg.transitDetails?.routeNumber ? ` ${seg.transitDetails.routeNumber}` : ""}
      </span>
    )
  }
  if (seg.mode === "metro") {
    return (
      <span className={`${base} border border-navy-200 bg-white text-navy-900`}>
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: legColour(seg) }} />
        {seg.transitDetails?.lineName || MODE_LABEL.metro}
      </span>
    )
  }
  if (seg.mode === "auto") {
    return (
      <span className={`${base} bg-auto-400 text-navy-900`}>
        <ModeIcon mode="auto" className="h-3.5 w-3.5" />
        {MODE_LABEL.auto}
      </span>
    )
  }
  return (
    <span className={`${base} bg-navy-100 text-navy-700`}>
      <ModeIcon mode="walking" className="h-3.5 w-3.5" />
      {MODE_LABEL.walking}
    </span>
  )
}

// One bus leg at a glance: its number, direction, where and when to board, the next buses, where to
// get off and when the bus gets there, and how crowded it is. Times come from the route's (synthetic)
// timetable and only appear once a departure time has been chosen.
function BusLeg({ seg, crowd }: { seg: RouteSegment; crowd?: LegCrowd }) {
  const d = seg.transitDetails
  if (!d) return null
  const stops = d.stopCount === 1 ? "1 stop" : `${d.stopCount} stops`
  return (
    <div className="flex items-start gap-3 rounded-panel bg-bus-50 px-3 py-2.5">
      <span className="mt-0.5 inline-flex h-8 min-w-[2.75rem] items-center justify-center rounded-lg bg-bus-600 px-2 text-sm font-bold tabular-nums text-white">
        <span className="sr-only">Bus number </span>
        {d.routeNumber}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5 text-xs text-navy-700">
        <p className="font-semibold text-navy-900">
          {d.towards ? `Towards ${d.towards}` : d.lineName}
          {crowd?.level && (
            <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${CROWD_CHIP[crowd.level]}`}>
              Crowd: {crowd.level}
            </span>
          )}
        </p>
        <p>
          Board at <span className="font-medium">{seg.from.name}</span>
          {d.estimatedBoardingTime ? (
            <>
              {" "}at ~{d.estimatedBoardingTime}
              {d.upcomingBoardingTimes && d.upcomingBoardingTimes.length > 0 && <> · next {d.upcomingBoardingTimes.map((t) => `~${t}`).join(", ")}</>}
            </>
          ) : (
            <> · a bus every ~{d.waitMinutes} min</>
          )}
        </p>
        <p>
          Get off at <span className="font-medium">{seg.to.name}</span> after {stops}
          {d.estimatedArrivalTime && <> · arrives ~{d.estimatedArrivalTime}</>}
        </p>
      </div>
    </div>
  )
}

/**
 * One journey option, Citymapper style: the headline is how long it takes (and, once a departure time is chosen, when you
 * arrive), then a strip of the legs, a bar that shows each leg's share of the time in the colours the map uses, and the
 * facts that matter (fare, walking, changes, crowd, weather). The whole card is one button that chooses this option.
 */
export default function RouteCard({ route, selected, onSelect, index }: Props) {
  const durationMin = Math.round(route.totalDurationSeconds / 60)
  const departure = route.departureAt ? new Date(route.departureAt) : null
  const arriveBy = departure && !Number.isNaN(departure.getTime()) ? formatClock(new Date(departure.getTime() + route.totalDurationSeconds * 1000)) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative w-full rounded-panel border bg-white p-4 text-left transition-all ${
        selected ? "border-brand-500 shadow-float ring-1 ring-brand-500" : "border-navy-100 shadow-card hover:border-navy-300 hover:shadow-float"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ backgroundColor: route.labelColor }}>
            {route.profileFit?.isBest && <Star className="h-3 w-3" aria-hidden="true" />}
            {route.labelDisplay}
          </span>
          <span className="text-xs text-navy-500">Route {index + 1}</span>
        </div>
        {selected && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Selected
          </span>
        )}
      </div>

      {/* The headline: how long, and when you arrive */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-bold leading-none tracking-tight text-navy-900">{formatDuration(durationMin)}</p>
          {arriveBy && <p className="mt-1.5 text-xs font-medium text-navy-600">Arrive by {arriveBy}</p>}
        </div>
        <p className="flex items-center text-base font-bold tabular-nums text-navy-800">
          <IndianRupee className="h-4 w-4 text-navy-500" aria-hidden="true" />
          <span>{route.totalFare} est.</span>
        </p>
      </div>

      {/* The legs, in order */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {route.segments.map((seg, i) => (
          <div key={seg.id} className="flex items-center gap-1">
            <LegChip seg={seg} />
            {i < route.segments.length - 1 && <ArrowRight className="h-3 w-3 flex-shrink-0 text-navy-400" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {/* Each leg's share of the time, in the colours the map draws it in */}
      <div className="mb-3 flex h-1.5 items-center gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {route.segments.map((seg) => (
          <div
            key={seg.id}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: legColour(seg), flexGrow: Math.max(seg.durationSeconds, 1), flexBasis: 0 }}
            title={`${MODE_LABEL[seg.mode]} · ${Math.ceil(seg.durationSeconds / 60)} min`}
          />
        ))}
      </div>

      {route.segments.some((seg) => seg.mode === "bus") && (
        <div className="mb-3 space-y-2">
          {route.segments.filter((seg) => seg.mode === "bus").map((seg) => (
            <BusLeg key={seg.id} seg={seg} crowd={route.crowd?.legs?.find((leg) => leg.segmentId === seg.id)} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-navy-600">
        <span className="flex items-center gap-1.5">
          <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
          Walk {formatDistance(route.totalWalkingMeters)}
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowRight className="h-3.5 w-3.5 rotate-90" aria-hidden="true" />
          {route.transferCount} transfer{route.transferCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {route.weatherImpact && (
          route.weatherImpact.weatherFriendly ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-go-50 px-2.5 py-0.5 text-xs font-medium text-go-800">
              <CloudRain className="h-3 w-3" aria-hidden="true" />
              Weather-friendly
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              <CloudRain className="h-3 w-3" aria-hidden="true" />
              Weather {route.weatherImpact.level}
            </span>
          )
        )}
        {route.accessibility && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {route.accessibility.status.replace("_", " ")}
          </span>
        )}
        {route.crowd && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${crowdClass(route.crowd.level)}`}>
            <Users className="h-3 w-3" aria-hidden="true" />
            {route.crowd.level ?? "Unknown"} crowd
          </span>
        )}
        {route.isPersonalized === true ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800">
            <Brain className="h-3 w-3" aria-hidden="true" /> TransitDNA Personalized
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-600">
            Profile-based recommendation
          </span>
        )}
        {route.sustainabilityScore !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-lime-50 px-2.5 py-0.5 text-xs font-medium text-lime-800" title={route.sustainabilitySummary}>
            <Sprout className="h-3 w-3" aria-hidden="true" /> Sustainability {route.sustainabilityScore}/100
          </span>
        )}
      </div>

      {route.whyRecommended && route.whyRecommended.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-navy-100 pt-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-500">Why Recommended</p>
          <div className="space-y-1">
            {route.whyRecommended.slice(0, 3).map((reason, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs font-medium leading-snug text-navy-700">
                <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-go-700" aria-hidden="true" />
                <span>{stripLeadingEmoji(reason)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}

import { useState } from "react"
import { ChevronDown, ChevronUp, FlaskConical, Map as MapIcon, Repeat2 } from "lucide-react"
import ModeIcon from "../ui/ModeIcon"
import LineBadge from "../ui/LineBadge"
import type { MultimodalRoute, MultimodalMode, RouteSegment, LegCrowd } from "../../types/multimodal"
import { formatDuration, formatDistance } from "../../utils/formatters"

interface Props {
  route: MultimodalRoute
  profile?: string
}

// A wheelchair user's shortest step-free path to a station is still shown
// as a "walking" segment under the hood (same as every major map app's own
// wheelchair-accessible directions — there's no separate transport mode for
// it), but labelling it "Walk" reads as if the route planner doesn't know
// the difference. Reword the displayed instruction only — the underlying
// segment, distance, geometry and routing are completely unchanged.
function displayInstruction(instruction: string, mode: MultimodalMode, profile?: string): string {
  if (mode === "walking" && profile === "wheelchair") {
    return instruction.replace(/^Walk\b/, "Wheel")
  }
  return instruction
}

// The colour of a leg on the rail: the same colours the map and the route card use.
function legColour(seg: RouteSegment): string {
  if (seg.mode === "metro") return seg.transitDetails?.lineColor || "#1f5bd8"
  if (seg.mode === "bus") return "#0f766e"
  if (seg.mode === "auto") return "#e0a500"
  return "#94a3b8"
}

const CROWD_CHIP: Record<string, string> = {
  LOW: "bg-go-100 text-go-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
}

// Crowd on a metro/bus leg. The level is always spelled out ("Crowd: HIGH"), never colour alone.
function CrowdChip({ crowd }: { crowd?: LegCrowd }) {
  if (!crowd || !crowd.level) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CROWD_CHIP[crowd.level]}`}
      title={`Boarding ${crowd.boardLevel ?? "unknown"}, getting off ${crowd.alightLevel ?? "unknown"}${crowd.onboardLevel ? `, on board ${crowd.onboardLevel}` : ""} (demo data)`}
    >
      Crowd: {crowd.level}
    </span>
  )
}

// When to board: the estimated time and the next ones if a departure time was chosen; otherwise how often it runs.
function BoardingLine({ seg }: { seg: RouteSegment }) {
  const d = seg.transitDetails
  if (!d) return null
  return (
    <p className="text-xs text-navy-600">
      {d.estimatedBoardingTime ? (
        <>
          Board by ~{d.estimatedBoardingTime}
          {d.upcomingBoardingTimes && d.upcomingBoardingTimes.length > 0 && <> · next: {d.upcomingBoardingTimes.map((t) => `~${t}`).join(", ")}</>}
        </>
      ) : (
        `Runs every ~${d.waitMinutes} min (set a departure time for a boarding estimate)`
      )}
    </p>
  )
}

// The stops of a leg, folded away until asked for.
function StopsList({ seg }: { seg: RouteSegment }) {
  const stops = seg.transitDetails?.stops ?? []
  if (stops.length <= 2) return null
  return (
    <details className="group pt-0.5">
      <summary className="cursor-pointer text-xs font-medium text-brand-700 hover:text-brand-800">All {stops.length} stops</summary>
      <ol className="mt-1.5 space-y-1 border-l-2 pl-3" style={{ borderColor: legColour(seg) }}>
        {stops.map((stop) => (
          <li key={stop} className="text-xs text-navy-600">{stop}</li>
        ))}
      </ol>
    </details>
  )
}

function SegmentRow({ seg, profile, crowd }: { seg: RouteSegment; profile?: string; crowd?: LegCrowd }) {
  const durationMin = Math.ceil(seg.durationSeconds / 60)
  const d = seg.transitDetails
  const isNumberedTransit = (seg.mode === "bus" || seg.mode === "metro") && d?.routeNumber

  // A bus or metro leg with a route number: its badge and direction up front (a real transit app's departure row).
  if (isNumberedTransit && d) {
    return (
      <div className="space-y-1.5 rounded-panel border border-navy-100 bg-white px-4 py-3 shadow-card">
        <div className="flex items-center gap-3">
          {seg.mode === "bus" ? (
            <LineBadge mode="bus" label={d.routeNumber} srLabel={`Bus number ${d.routeNumber}`} className="text-sm" />
          ) : (
            <LineBadge mode="metro" label={d.routeNumber} color={d.lineColor} className="text-sm" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-navy-900">
              {seg.mode === "bus" && d.towards ? `Towards ${d.towards}` : d.lineName}
            </p>
            <p className="text-[11px] text-navy-600">{seg.from.name} → {seg.to.name}</p>
          </div>
          <span className="flex-shrink-0 whitespace-nowrap text-xs font-semibold text-navy-700">{formatDuration(durationMin)}</span>
        </div>
        {crowd?.level && <div><CrowdChip crowd={crowd} /></div>}
        <BoardingLine seg={seg} />
        {seg.mode === "bus" && (
          <p className="text-xs text-navy-600">
            Get off at {seg.to.name} after {d.stopCount === 1 ? "1 stop" : `${d.stopCount} stops`}
            {d.estimatedArrivalTime ? <> · arrives ~{d.estimatedArrivalTime}</> : null}
          </p>
        )}
        <StopsList seg={seg} />
      </div>
    )
  }

  return (
    <div className="space-y-1 rounded-panel border border-navy-100 bg-white px-4 py-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-navy-800">{displayInstruction(seg.instruction, seg.mode, profile)}</p>
        <span className="flex-shrink-0 whitespace-nowrap text-xs text-navy-600">{formatDuration(durationMin)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-600">
        <span>{formatDistance(seg.distanceMeters)}</span>
        {seg.estimatedFare > 0 && <span>₹{seg.estimatedFare} est.</span>}
        {d && (
          // The line's own colour is a dot, not the text colour: yellow and green lines fail 4.5:1 as text on these cards.
          <span className="inline-flex items-center gap-1.5 font-medium text-navy-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: d.lineColor }} aria-hidden="true" />
            {d.lineName}
          </span>
        )}
        <CrowdChip crowd={crowd} />
      </div>

      {d && (seg.mode === "bus" || seg.mode === "metro") && <BoardingLine seg={seg} />}

      {d?.lineChanges && d.lineChanges.length > 0 && (
        <ul className="space-y-0.5">
          {d.lineChanges.map((c) => (
            <li key={`${c.station}-${c.toLine}`} className="flex items-center gap-1.5 text-xs font-medium text-navy-700">
              <Repeat2 className="h-3.5 w-3.5 text-navy-500" aria-hidden="true" />
              Change to the {c.toLine} at {c.station}
            </li>
          ))}
        </ul>
      )}

      <StopsList seg={seg} />
    </div>
  )
}

/**
 * The journey leg by leg, on a vertical rail: each leg has a dot with its mode icon on the colour the map draws it in, the
 * rail runs on to the next leg, and every leg is a white card. Folded away until asked for, because the route card above
 * already says the whole story in one glance.
 */
export default function SegmentTimeline({ route, profile }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-panel border border-navy-100 bg-white shadow-card">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-14 w-full items-center justify-between px-5 py-4 transition-colors hover:bg-navy-50"
      >
        <div className="flex items-center gap-2.5">
          <MapIcon className="h-5 w-5 text-navy-600" aria-hidden="true" />
          <span className="font-display text-sm font-semibold text-navy-800">Step-by-step journey</span>
          <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-600">{route.segments.length} segments</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-navy-500" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-navy-500" aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-navy-100 bg-navy-50/60 px-4 pb-4 pt-3">
          <div className="flex items-center gap-2 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <FlaskConical className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            Demo transit data — schedules, fares and routes are approximate.
          </div>

          <ol className="space-y-3">
            {route.segments.map((seg, i) => (
              <li key={seg.id} className="relative pl-10">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white text-navy-800"
                  style={{ borderColor: legColour(seg) }}
                >
                  <ModeIcon mode={seg.mode} wheelchair={seg.mode === "walking" && profile === "wheelchair"} className="h-3.5 w-3.5" />
                </span>
                {i < route.segments.length - 1 && (
                  <span aria-hidden="true" className="absolute bottom-[-0.75rem] left-[13px] top-10 w-0.5" style={{ backgroundColor: legColour(seg) }} />
                )}
                <SegmentRow seg={seg} profile={profile} crowd={route.crowd?.legs?.find((leg) => leg.segmentId === seg.id)} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

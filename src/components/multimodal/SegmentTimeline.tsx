import { useState } from "react"
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react"
import type { MultimodalRoute, MultimodalMode, RouteSegment } from "../../types/multimodal"
import { formatDuration, formatDistance } from "../../utils/formatters"

interface Props {
  route: MultimodalRoute
}

const MODE_EMOJI: Record<MultimodalMode, string> = {
  walking: "🚶", metro: "🚇", bus: "🚌", auto: "🛺",
}

const MODE_COLOR: Record<MultimodalMode, string> = {
  walking: "border-slate-400 bg-slate-50",
  metro:   "border-blue-500 bg-blue-50",
  bus:     "border-green-500 bg-green-50",
  auto:    "border-orange-500 bg-orange-50",
}

const MODE_DOT: Record<MultimodalMode, string> = {
  walking: "bg-slate-400",
  metro:   "bg-blue-500",
  bus:     "bg-green-500",
  auto:    "bg-orange-500",
}

function SegmentRow({ seg }: { seg: RouteSegment }) {
  const durationMin = Math.ceil(seg.durationSeconds / 60)
  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 space-y-1 ${MODE_COLOR[seg.mode]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{MODE_EMOJI[seg.mode]}</span>
          <p className="text-sm font-semibold text-navy-800">{seg.instruction}</p>
        </div>
        <span className="text-xs text-navy-500 whitespace-nowrap flex-shrink-0">
          {formatDuration(durationMin)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-navy-500 pl-7">
        <span>{formatDistance(seg.distanceMeters)}</span>
        {seg.estimatedFare > 0 && <span>₹{seg.estimatedFare} est.</span>}
        {seg.transitDetails && (
          <span className="font-medium" style={{ color: seg.transitDetails.lineColor }}>
            {seg.transitDetails.lineName}
          </span>
        )}
      </div>

      {seg.transitDetails && seg.transitDetails.stops.length > 2 && (
        <div className="pl-7 pt-1">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {seg.transitDetails.stops.map((stop) => (
              <span key={stop} className="text-xs text-navy-400 flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${MODE_DOT[seg.mode]}`} />
                {stop}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SegmentTimeline({ route }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-navy-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-navy-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">🗺️</span>
          <span className="font-display font-semibold text-navy-800 text-sm">
            Step-by-step journey
          </span>
          <span className="text-xs text-navy-400 bg-navy-100 px-2 py-0.5 rounded-full">
            {route.segments.length} segments
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-navy-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-navy-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-navy-100 px-4 pb-4 pt-3 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
            Demo transit data — schedules, fares and routes are approximate.
          </div>

          {route.segments.map((seg, i) => (
            <div key={seg.id} className="relative">
              {i < route.segments.length - 1 && (
                <div className="absolute left-[22px] top-full w-0.5 h-2 bg-navy-200 z-10" />
              )}
              <SegmentRow seg={seg} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

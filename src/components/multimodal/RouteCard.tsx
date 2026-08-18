import { Clock, Footprints, ArrowRight, IndianRupee, ShieldCheck, CloudRain, Users } from "lucide-react"
import type { MultimodalRoute, MultimodalMode } from "../../types/multimodal"
import { formatDuration, formatDistance } from "../../utils/formatters"

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

const MODE_BG: Record<MultimodalMode, string> = {
  walking: "bg-slate-100 text-slate-600",
  metro: "bg-blue-100 text-blue-700",
  bus: "bg-green-100 text-green-700",
  auto: "bg-orange-100 text-orange-700",
}

function crowdClass(level?: string) {
  if (level === "LOW") return "text-emerald-700 bg-emerald-50"
  if (level === "HIGH") return "text-red-700 bg-red-50"
  return "text-amber-700 bg-amber-50"
}

export default function RouteCard({ route, selected, onSelect, index }: Props) {
  const durationMin = Math.round(route.totalDurationSeconds / 60)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 transition-all ${
        selected
          ? "border-brand-500 bg-brand-50 shadow-md"
          : "border-navy-200 bg-white hover:border-navy-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: route.labelColor }}>
            {route.labelDisplay}
          </span>
          <span className="text-xs text-navy-400">Route {index + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          {route.isPersonalized === true ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              🧠 TransitDNA Personalized
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold text-navy-500">
              Profile-based recommendation
            </span>
          )}
          {selected && <span className="text-xs font-semibold text-brand-600">Selected</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {route.segments.map((seg, i) => (
          <div key={seg.id} className="flex items-center gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MODE_BG[seg.mode]}`}>
              {MODE_LABEL[seg.mode]}
            </span>
            {i < route.segments.length - 1 && <ArrowRight className="w-3 h-3 text-navy-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-navy-700">
          <Clock className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-bold">{formatDuration(durationMin)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-navy-700">
          <IndianRupee className="w-3.5 h-3.5 text-green-600" />
          <span className="font-bold">Rs {route.totalFare}</span>
          <span className="text-xs text-navy-400">est.</span>
        </div>
        <div className="flex items-center gap-1.5 text-navy-500 text-xs">
          <Footprints className="w-3.5 h-3.5" />
          <span>Walk {formatDistance(route.totalWalkingMeters)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-navy-500 text-xs">
          <ArrowRight className="w-3.5 h-3.5 rotate-90" />
          <span>{route.transferCount} transfer{route.transferCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {route.weatherImpact && (
          route.weatherImpact.weatherFriendly ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CloudRain className="w-3 h-3" />
              Weather-friendly
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
              <CloudRain className="w-3 h-3" />
              Weather {route.weatherImpact.level}
            </span>
          )
        )}
        {route.accessibility && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            <ShieldCheck className="w-3 h-3" />
            {route.accessibility.status.replace("_", " ")}
          </span>
        )}
        {route.crowd && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${crowdClass(route.crowd.level)}`}>
            <Users className="w-3 h-3" />
            {route.crowd.level ?? "Unknown"} crowd
          </span>
        )}
        {route.sustainabilityScore !== undefined && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-lime-50 px-2.5 py-0.5 text-xs font-medium text-lime-700"
            title={route.sustainabilitySummary}
          >
            🌱 Sustainability {route.sustainabilityScore}/100
          </span>
        )}
      </div>

      {route.whyRecommended && route.whyRecommended.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-navy-100 space-y-1">
          <p className="text-[10px] font-bold tracking-wider text-navy-400 uppercase">Why Recommended</p>
          <div className="space-y-1">
            {route.whyRecommended.slice(0, 3).map((reason, i) => (
              <div key={i} className="text-xs font-medium text-navy-700 flex items-center gap-1.5 leading-snug">
                <span className="text-brand-600 font-bold text-xs">✓</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}

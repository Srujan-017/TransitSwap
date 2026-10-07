import { Clock, Ruler, MapPin, Navigation, Car, Footprints, Bike, FlaskConical } from "lucide-react"
import type { GeoLocation, RouteResult, TransportMode } from "../../types/map"
import { formatDuration, formatDistance } from "../../utils/formatters"

interface RouteSummaryProps {
  routes: RouteResult[]
  selectedIndex: number
  onSelectRoute: (index: number) => void
  origin: GeoLocation
  destination: GeoLocation
}

const MODE_ICONS: Record<TransportMode, React.ReactNode> = {
  driving: <Car className="w-3.5 h-3.5" />,
  walking: <Footprints className="w-3.5 h-3.5" />,
  cycling: <Bike className="w-3.5 h-3.5" />,
}

export default function RouteSummary({
  routes,
  selectedIndex,
  onSelectRoute,
  origin,
  destination,
}: RouteSummaryProps) {
  const selected = routes[selectedIndex]
  if (!selected) return null

  const hasDemoData = routes.some((r) => r.isDemoData)

  return (
    <div className="bg-white rounded-2xl border border-navy-200 p-5 space-y-4">
      {/* Demo banner */}
      {hasDemoData && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <FlaskConical className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Demo route — not real navigation data. Live routing requires the backend service.
          </p>
        </div>
      )}

      {/* Route alternatives tabs */}
      {routes.length > 1 && (
        <div className="flex gap-2">
          {routes.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRoute(i)}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                i === selectedIndex
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-navy-200 text-navy-500 hover:border-navy-300 hover:bg-navy-50"
              }`}
            >
              <span className="block font-bold">Route {i + 1}</span>
              <span className="block text-xs opacity-80 mt-0.5">{formatDuration(Math.round(r.durationSeconds / 60))}</span>
            </button>
          ))}
        </div>
      )}

      {/* Time + Distance headline */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-brand-50 text-brand-700 rounded-xl px-4 py-2.5">
          <Clock className="w-4 h-4" />
          <span className="font-display font-bold text-lg">
            {formatDuration(Math.round(selected.durationSeconds / 60))}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-navy-50 text-navy-700 rounded-xl px-4 py-2.5">
          <Ruler className="w-4 h-4" />
          <span className="font-display font-bold text-lg">
            {formatDistance(selected.distanceMeters)}
          </span>
        </div>
      </div>

      {/* Origin → Destination */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white ring-2 ring-brand-300 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-navy-500 uppercase tracking-wide font-semibold">From</p>
            <p className="text-sm font-medium text-navy-800 truncate">{origin.name}</p>
          </div>
        </div>
        <div className="ml-[5px] border-l-2 border-dashed border-navy-200 h-4" />
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-navy-500 uppercase tracking-wide font-semibold">To</p>
            <p className="text-sm font-medium text-navy-800 truncate">{destination.name}</p>
          </div>
        </div>
      </div>

      {/* Provider note */}
      <p className="text-xs text-navy-400 flex items-center gap-1.5">
        <Navigation className="w-3 h-3" />
        {MODE_ICONS[selected.mode]}
        {selected.isDemoData
          ? "Demo prototype data · multimodal intelligence in later phases"
          : `Route via ${selected.provider.toUpperCase()} · Phase 2 foundation · multimodal in later phases`}
      </p>
    </div>
  )
}

import { useEffect, useState } from "react"
import { Compass, Footprints, ShieldCheck, Users } from "lucide-react"
import Badge from "../ui/Badge"
import { multimodalService } from "../../services/multimodalService"
import { formatDistance } from "../../utils/formatters"
import type { GeoLocation } from "../../types/map"
import type { NearbyTransitResponse, NearbyTransitStation } from "../../types/multimodal"

interface Props {
  origin: GeoLocation | null
}

function StationRow({ station }: { station: NearbyTransitStation }) {
  const icon = station.transportMode === "metro" ? "🚇" : "🚌"
  const label = station.transportMode === "metro" ? "Metro Station" : "Bus Stop"

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-navy-200 bg-navy-50/50 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-navy-800 flex items-center gap-1.5 truncate">
          <span>{icon}</span>
          <span className="truncate">{station.stationName}</span>
        </p>
      </div>
      <p className="text-[11px] text-navy-500">{label}</p>
      <div className="flex items-center gap-2 text-xs text-navy-700">
        <span className="font-semibold">{formatDistance(station.distanceMeters)}</span>
        <span className="flex items-center gap-1 text-navy-500">
          <Footprints className="w-3 h-3" />
          {station.estimatedWalkingMinutes} min walk
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {station.accessibility !== "unknown" && (
          <Badge size="sm" variant={station.accessibility.hasLift ? "success" : "warning"}>
            <ShieldCheck className="w-3 h-3 mr-1 inline" />
            {station.accessibility.hasLift ? "Lift" : station.accessibility.hasRamp ? "Ramp" : station.accessibility.status.replace("_", " ")}
          </Badge>
        )}
        {station.crowd !== "unavailable" && station.crowd.level && (
          <Badge size="sm" variant={station.crowd.level === "LOW" ? "success" : station.crowd.level === "HIGH" ? "danger" : "warning"}>
            <Users className="w-3 h-3 mr-1 inline" />
            {station.crowd.level} crowd
          </Badge>
        )}
      </div>
    </div>
  )
}

export default function NearbyTransit({ origin }: Props) {
  const [data, setData] = useState<NearbyTransitResponse | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!origin) {
      setData(null)
      setStatus("idle")
      return
    }
    let cancelled = false
    setStatus("loading")
    setError("")
    multimodalService
      .getNearbyTransit(origin.latitude, origin.longitude)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setStatus("success")
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load nearby transit.")
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [origin?.latitude, origin?.longitude])

  if (!origin) return null

  return (
    <div className="bg-white rounded-2xl border border-navy-200 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-navy-800">
        <Compass className="w-4 h-4 text-brand-600" /> Nearby Transit
      </div>

      {status === "loading" && (
        <p className="text-xs text-navy-500">Finding nearby stations…</p>
      )}

      {status === "error" && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {status === "success" && data && !data.metro && !data.bus && (
        <p className="text-xs text-navy-500">
          No nearby transit found in the current demonstration network.
        </p>
      )}

      {status === "success" && data && (data.metro || data.bus) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.metro && <StationRow station={data.metro} />}
          {data.bus && <StationRow station={data.bus} />}
        </div>
      )}
    </div>
  )
}

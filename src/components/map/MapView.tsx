import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, GeoJSON, useMap } from "react-leaflet"
import L from "leaflet"
import type { Feature, LineString } from "geojson"
import type { GeoLocation, RouteResult } from "../../types/map"
import type { MultimodalRoute, MultimodalMode } from "../../types/multimodal"

// Custom pin markers — avoids the default Leaflet icon asset-path issue in Vite
const makePin = (color: string, shadow: string) =>
  L.divIcon({
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px ${shadow};
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    className: "",
  })

const makeStationPin = (color: string) =>
  L.divIcon({
    html: `<div style="
      width:10px;height:10px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    className: "",
  })

const ORIGIN_ICON = makePin("#0ea5e9", "rgba(14,165,233,0.55)")
const DEST_ICON   = makePin("#ef4444", "rgba(239,68,68,0.55)")

const ROAD_ROUTE_STYLE = { color: "#0ea5e9", weight: 5, opacity: 0.85 }

const SEGMENT_STYLES: Record<MultimodalMode, L.PathOptions> = {
  walking: { color: "#94a3b8", weight: 3, opacity: 0.8,  dashArray: "6 6" },
  metro:   { color: "#2563eb", weight: 5, opacity: 0.9  },
  bus:     { color: "#16a34a", weight: 4, opacity: 0.85 },
  auto:    { color: "#ea580c", weight: 4, opacity: 0.85, dashArray: "8 4" },
}

// Helper: fit map to route or two points
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
  }, [map, bounds])
  return null
}

interface MapViewProps {
  origin: GeoLocation | null
  destination: GeoLocation | null
  route: RouteResult | null
  multimodalRoute?: MultimodalRoute | null
}

export default function MapView({ origin, destination, route, multimodalRoute }: MapViewProps) {
  const defaultCenter: L.LatLngExpression = [19.076, 72.877]
  const defaultZoom = 11

  // Bounds: prefer multimodal segment bounding box, then single route, then markers
  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (multimodalRoute) {
      const allCoords = multimodalRoute.segments.flatMap((s) =>
        s.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      )
      if (allCoords.length >= 2) return allCoords
    }
    if (route) {
      const coords = route.geometry.coordinates
      if (coords.length >= 2) return coords.map(([lng, lat]) => [lat, lng] as [number, number])
    }
    if (origin && destination) {
      return [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      ]
    }
    return null
  }, [route, multimodalRoute, origin, destination])

  const routeGeoJson = useMemo<Feature<LineString> | null>(() => {
    if (!route) return null
    return { type: "Feature", geometry: route.geometry, properties: {} }
  }, [route])

  // Station markers for multimodal transit segments
  const transitStops = useMemo(() => {
    if (!multimodalRoute) return []
    return multimodalRoute.segments
      .filter((s) => s.mode !== "walking")
      .flatMap((s) => [
        { lat: s.from.latitude, lng: s.from.longitude, mode: s.mode, name: s.from.name },
        { lat: s.to.latitude,   lng: s.to.longitude,   mode: s.mode, name: s.to.name   },
      ])
  }, [multimodalRoute])

  const stationPinColors: Record<MultimodalMode, string> = {
    metro:   "#2563eb",
    bus:     "#16a34a",
    auto:    "#ea580c",
    walking: "#94a3b8",
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {/* Origin / destination markers */}
      {origin && (
        <Marker position={[origin.latitude, origin.longitude]} icon={ORIGIN_ICON} />
      )}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={DEST_ICON} />
      )}

      {/* Road routing polyline */}
      {routeGeoJson && !multimodalRoute && (
        <GeoJSON key={route?.id} data={routeGeoJson} style={ROAD_ROUTE_STYLE} />
      )}

      {/* Multimodal segment polylines */}
      {multimodalRoute &&
        multimodalRoute.segments.map((seg) => {
          const segmentGeoJson: Feature<LineString> = {
            type: "Feature",
            geometry: seg.geometry,
            properties: {},
          }
          return (
          <GeoJSON
            key={seg.id}
            data={segmentGeoJson}
            style={SEGMENT_STYLES[seg.mode]}
          />
          )
        })}

      {/* Transit station / stop markers */}
      {transitStops.map((stop, i) => (
        <Marker
          key={`${stop.name}-${i}`}
          position={[stop.lat, stop.lng]}
          icon={makeStationPin(stationPinColors[stop.mode])}
        />
      ))}

      {bounds && <FitBounds bounds={bounds} />}
    </MapContainer>
  )
}

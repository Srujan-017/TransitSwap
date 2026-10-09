import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, GeoJSON, ZoomControl, useMap } from "react-leaflet"
import L from "leaflet"
import type { Feature, LineString } from "geojson"
import type { GeoLocation, RouteResult } from "../../types/map"
import type { MultimodalRoute, MultimodalMode } from "../../types/multimodal"

// Teardrop pin (the shape every major map app uses for a fixed point) —
// built as inline SVG so it needs no external icon asset (avoids the
// default Leaflet icon asset-path issue in Vite) and matches the app's own
// palette instead of a generic colored circle.
const makeTeardropPin = (fill: string) =>
  L.divIcon({
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(15,23,42,0.45))">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.6 15 25 15 25s15-14.4 15-25C30 6.7 23.3 0 15 0z" fill="${fill}"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    className: "",
  })

// Origin uses a "current location" style dot + halo (how Google Maps and
// every other major map app marks a start point, visually distinct from
// the destination's fixed pin).
const ORIGIN_ICON = L.divIcon({
  html: `<div style="position:relative;width:24px;height:24px;">
    <div style="position:absolute;inset:-7px;border-radius:50%;background:rgba(14,165,233,0.22);"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#0ea5e9;border:3px solid white;box-shadow:0 2px 6px rgba(15,23,42,0.45);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: "",
})
const DEST_ICON = makeTeardropPin("#ef4444")

const makeStationPin = (color: string) =>
  L.divIcon({
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 5px rgba(15,23,42,0.4);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    className: "",
  })

// Every route/segment line is drawn as a pair: a wider white "casing" layer
// underneath, then the colored line on top — the layered, glossy look
// transit-focused map apps use for route lines, instead of a single flat
// stroke.
const CASING_STYLE: L.PathOptions = {
  color: "#ffffff",
  weight: 9,
  opacity: 0.9,
  lineCap: "round",
  lineJoin: "round",
}

const ROAD_ROUTE_STYLE: L.PathOptions = {
  color: "#0ea5e9", weight: 5.5, opacity: 0.95, lineCap: "round", lineJoin: "round",
}

// Walking keeps a dotted line (the convention every major map app uses for
// foot directions, so it reads as "walking" at a glance) — everything else
// is a solid, cased line instead of a dash, so it never looks like an
// approximation.
const SEGMENT_STYLES: Record<MultimodalMode, L.PathOptions> = {
  walking: { color: "#64748b", weight: 4, opacity: 0.9, dashArray: "1 9", lineCap: "round" },
  metro:   { color: "#2563eb", weight: 5.5, opacity: 0.95, lineCap: "round", lineJoin: "round" },
  bus:     { color: "#16a34a", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" },
  auto:    { color: "#ea580c", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" },
}

// Only cased (walking's dotted line doesn't need — or visually want — a casing).
const CASED_MODES: MultimodalMode[] = ["metro", "bus", "auto"]

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
    walking: "#64748b",
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
      className="z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/updates/working-with-the-openstreetmap-cartography-team">Humanitarian OSM Team</a>'
        url="https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        subdomains="abc"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />

      {/* Road routing polyline */}
      {routeGeoJson && !multimodalRoute && (
        <>
          <GeoJSON key={`${route?.id}-casing`} data={routeGeoJson} style={CASING_STYLE} />
          <GeoJSON key={route?.id} data={routeGeoJson} style={ROAD_ROUTE_STYLE} />
        </>
      )}

      {/* Multimodal segment polylines — each segment's white casing is a
          sibling layer rendered immediately before its colored line, so it
          sits underneath (cased modes only; walking's dotted line doesn't
          get one). */}
      {multimodalRoute &&
        multimodalRoute.segments.flatMap((seg) => {
          const segmentGeoJson: Feature<LineString> = {
            type: "Feature",
            geometry: seg.geometry,
            properties: {},
          }
          const layers = []
          if (CASED_MODES.includes(seg.mode)) {
            layers.push(<GeoJSON key={`${seg.id}-casing`} data={segmentGeoJson} style={CASING_STYLE} />)
          }
          layers.push(<GeoJSON key={seg.id} data={segmentGeoJson} style={SEGMENT_STYLES[seg.mode]} />)
          return layers
        })}

      {/* Transit station / stop markers */}
      {transitStops.map((stop, i) => (
        <Marker
          key={`${stop.name}-${i}`}
          position={[stop.lat, stop.lng]}
          icon={makeStationPin(stationPinColors[stop.mode])}
        />
      ))}

      {/* Origin / destination markers — drawn last so they sit above every line */}
      {origin && (
        <Marker position={[origin.latitude, origin.longitude]} icon={ORIGIN_ICON} />
      )}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={DEST_ICON} />
      )}

      {bounds && <FitBounds bounds={bounds} />}
    </MapContainer>
  )
}

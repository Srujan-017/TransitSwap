import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import {
  MapContainer, TileLayer, Marker, GeoJSON, ZoomControl, ScaleControl,
  LayersControl, Popup, useMap, useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import type { Feature, LineString } from "geojson"
import type { GeoLocation, RouteResult } from "../../types/map"
import type { MultimodalRoute, MultimodalMode } from "../../types/multimodal"
import { mapService } from "../../services/mapService"

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
const CLICKED_PIN_ICON = makeTeardropPin("#334155")

// The animated "blue dot" every major map app uses for the device's live
// GPS position — distinct from ORIGIN_ICON (which marks a chosen, static
// start point, not necessarily where the device actually is right now).
const MY_LOCATION_ICON = L.divIcon({
  html: `<div style="position:relative;width:20px;height:20px;">
    <div class="my-location-pulse" style="position:absolute;inset:-10px;border-radius:50%;background:rgba(14,165,233,0.35);"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#0ea5e9;border:3px solid white;box-shadow:0 1px 4px rgba(15,23,42,0.5);"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: "",
})

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

// Active-navigation live position — flies to it once on first appearance
// only (a ref guard), not on every GPS tick, so the map doesn't fight the
// user by re-centering every few seconds while they're reading the screen.
function FollowMe({ position }: { position: { latitude: number; longitude: number } }) {
  const map = useMap()
  const hasCenteredRef = useRef(false)
  useEffect(() => {
    if (hasCenteredRef.current) return
    hasCenteredRef.current = true
    map.flyTo([position.latitude, position.longitude], 17, { duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

const EXPAND_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
const COLLAPSE_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
const LOCATE_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line></svg>`

// A single reusable imperative Leaflet button control — used for both the
// fullscreen toggle and the locate-me button so each stays in Leaflet's own
// control-corner layout (stacking cleanly with the zoom control) instead of
// being absolutely positioned by hand.
function useMapButtonControl(opts: {
  position: L.ControlPosition
  title: string
  html: string
  onClick: () => void
  deps: unknown[]
}) {
  const map = useMap()
  useEffect(() => {
    const ButtonControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create("button", "leaflet-bar map-icon-btn")
        btn.type = "button"
        btn.title = opts.title
        btn.setAttribute("aria-label", opts.title)
        btn.innerHTML = opts.html
        L.DomEvent.disableClickPropagation(btn)
        L.DomEvent.on(btn, "click", (e) => {
          L.DomEvent.stop(e)
          opts.onClick()
        })
        return btn
      },
    })
    const instance = new ButtonControl({ position: opts.position })
    instance.addTo(map)
    return () => {
      instance.remove()
    }
  }, [map, ...opts.deps])
}

function FullscreenControl() {
  const map = useMap()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggle = useCallback(() => {
    const container = map.getContainer()
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      container.requestFullscreen?.().catch(() => {})
    }
  }, [map])

  useMapButtonControl({
    position: "topright",
    title: isFullscreen ? "Exit fullscreen" : "View fullscreen",
    html: isFullscreen ? COLLAPSE_ICON_SVG : EXPAND_ICON_SVG,
    onClick: toggle,
    deps: [isFullscreen, toggle],
  })

  // Leaflet's internal tile grid doesn't know the container just resized —
  // without this the map stays cropped to its pre-fullscreen pixel size.
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 150)
    return () => clearTimeout(id)
  }, [map, isFullscreen])

  return null
}

function LocateControl() {
  const map = useMap()
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error")
      return
    }
    setStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setMyLocation(next)
        setStatus("idle")
        map.flyTo([next.lat, next.lng], 16, { duration: 0.8 })
      },
      () => setStatus("error"),
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
    )
  }, [map])

  useMapButtonControl({
    position: "topright",
    title: "Show my location",
    html: LOCATE_ICON_SVG,
    onClick: locate,
    deps: [locate],
  })

  if (!myLocation) return null
  return (
    <Marker position={[myLocation.lat, myLocation.lng]} icon={MY_LOCATION_ICON}>
      <Popup>Your current location</Popup>
    </Marker>
  )
}

interface ClickedPlace {
  lat: number
  lng: number
  status: "loading" | "ready" | "error"
  place?: GeoLocation
}

// "What's here?" — click anywhere on the map to resolve a real address for
// that spot, the way Google Maps' click-to-drop-a-pin popup works, with
// quick actions to use that spot as the trip's origin or destination.
function ClickForAddress({
  onSetOrigin,
  onSetDestination,
}: {
  onSetOrigin?: (location: GeoLocation) => void
  onSetDestination?: (location: GeoLocation) => void
}) {
  const [clicked, setClicked] = useState<ClickedPlace | null>(null)
  const markerRef = useRef<L.Marker>(null)

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setClicked({ lat, lng, status: "loading" })
      mapService
        .reverse(lat, lng)
        .then((place) => setClicked({ lat, lng, status: "ready", place }))
        .catch(() => setClicked({ lat, lng, status: "error" }))
    },
  })

  // A Marker's Popup child only opens on a click directly on the marker
  // itself — but the user's intent here is the map click that just placed
  // it, so the info popup should appear immediately, the way Google Maps'
  // "what's here" pin does, not require a second click on the new pin.
  useEffect(() => {
    if (clicked) markerRef.current?.openPopup()
  }, [clicked])

  if (!clicked) return null

  return (
    <Marker ref={markerRef} position={[clicked.lat, clicked.lng]} icon={CLICKED_PIN_ICON}>
      <Popup minWidth={200}>
        {clicked.status === "loading" && <span className="text-sm text-navy-500">Looking up this place…</span>}
        {clicked.status === "error" && <span className="text-sm text-navy-500">Couldn't resolve an address here.</span>}
        {clicked.status === "ready" && clicked.place && (
          <div className="space-y-2 min-w-[180px]">
            <p className="text-sm font-semibold text-navy-800">{clicked.place.name}</p>
            <p className="text-xs text-navy-500">{clicked.place.address}</p>
            {(onSetOrigin || onSetDestination) && (
              <div className="flex gap-1.5 pt-1">
                {onSetOrigin && (
                  <button
                    type="button"
                    onClick={() => clicked.place && onSetOrigin(clicked.place)}
                    className="flex-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-full px-2.5 py-1.5 transition-colors"
                  >
                    Set as origin
                  </button>
                )}
                {onSetDestination && (
                  <button
                    type="button"
                    onClick={() => clicked.place && onSetDestination(clicked.place)}
                    className="flex-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-full px-2.5 py-1.5 transition-colors"
                  >
                    Set as destination
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Popup>
    </Marker>
  )
}

interface MapViewProps {
  origin: GeoLocation | null
  destination: GeoLocation | null
  route: RouteResult | null
  multimodalRoute?: MultimodalRoute | null
  onSetOrigin?: (location: GeoLocation) => void
  onSetDestination?: (location: GeoLocation) => void
  // Active-navigation additions (ActiveNavigationView.tsx) — both optional
  // and undefined by default, so every existing caller is unaffected.
  livePosition?: { latitude: number; longitude: number } | null
  activeSegmentId?: string | null
}

export default function MapView({
  origin, destination, route, multimodalRoute, onSetOrigin, onSetDestination,
  livePosition, activeSegmentId,
}: MapViewProps) {
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
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/updates/working-with-the-openstreetmap-cartography-team">Humanitarian OSM Team</a>'
            url="https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            subdomains="abc"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a> — Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            maxNativeZoom={17}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomleft" />
      <FullscreenControl />
      <LocateControl />
      <ClickForAddress onSetOrigin={onSetOrigin} onSetDestination={onSetDestination} />

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
          // Active-navigation dimming — when a specific segment is the
          // current step, every other segment fades back so the rider's
          // eye goes straight to the leg they're actually on right now.
          const isDimmed = Boolean(activeSegmentId) && seg.id !== activeSegmentId
          const segmentStyle = isDimmed ? { ...SEGMENT_STYLES[seg.mode], opacity: 0.35 } : SEGMENT_STYLES[seg.mode]
          const layers = []
          if (CASED_MODES.includes(seg.mode) && !isDimmed) {
            layers.push(<GeoJSON key={`${seg.id}-casing`} data={segmentGeoJson} style={CASING_STYLE} />)
          }
          layers.push(<GeoJSON key={seg.id} data={segmentGeoJson} style={segmentStyle} />)
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

      {/* Active-navigation live position — drawn last of all, above the
          origin/destination pins too, since it's the rider's own real-time
          location. */}
      {livePosition && (
        <>
          <Marker position={[livePosition.latitude, livePosition.longitude]} icon={MY_LOCATION_ICON} />
          <FollowMe position={livePosition} />
        </>
      )}

      {bounds && <FitBounds bounds={bounds} />}
    </MapContainer>
  )
}

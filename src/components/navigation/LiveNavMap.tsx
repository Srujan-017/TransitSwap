import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Marker, ZoomControl, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { slicePath } from "../../navigation/geo"
import type { NavLeg, NavState, Fix } from "../../navigation/engine"

/**
 * The map of a live journey: the route in each mode's colour with the part already travelled greyed out, the
 * rider's blue dot (with a heading arrow and the GPS accuracy circle), stops along bus and metro legs, the
 * destination, and a camera that follows the rider until they drag the map.
 */

const MODE_COLOR: Record<string, string> = { walking: "#475569", metro: "#2563eb", bus: "#16a34a", auto: "#ea580c" }
const TRAVELLED = "#94a3b8"

const DEST_ICON = L.divIcon({
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(15,23,42,0.45))">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.6 15 25 15 25s15-14.4 15-25C30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="15" r="6" fill="white"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  className: "",
})

// The rider: a blue dot with a pulse and, when the direction is known, an arrow pointing the way they are heading.
function userIcon(heading: number | null) {
  const arrow = heading === null
    ? ""
    : `<svg viewBox="0 0 44 44" style="position:absolute;inset:0;transform:rotate(${Math.round(heading)}deg);transition:transform 0.4s linear"><path d="M22 1 L30 14 L22 10.5 L14 14 Z" fill="#0ea5e9" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`
  return L.divIcon({
    html: `<div style="position:relative;width:44px;height:44px;">
      <div class="my-location-pulse" style="position:absolute;left:11px;top:11px;width:22px;height:22px;border-radius:50%;background:rgba(14,165,233,0.35);"></div>
      <div style="position:absolute;left:11px;top:11px;width:22px;height:22px;border-radius:50%;background:#0ea5e9;border:3px solid #fff;box-shadow:0 1px 5px rgba(15,23,42,0.55);box-sizing:border-box;"></div>
      ${arrow}
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    className: "",
  })
}

function Follow({ state, follow }: { state: NavState; follow: boolean }) {
  const map = useMap()
  const { latitude, longitude } = state.position
  const zoom = state.leg?.mode === "walking" ? 18 : 16
  useEffect(() => {
    if (follow) map.setView([latitude, longitude], map.getZoom(), { animate: true, duration: 0.6 })
  }, [map, follow, latitude, longitude])
  useEffect(() => {
    if (follow) map.setZoom(zoom)
  }, [map, follow, zoom, state.legIndex])
  return null
}

function UserMoved({ onUserMove }: { onUserMove: () => void }) {
  useMapEvents({ dragstart: onUserMove })
  return null
}

interface Props {
  legs: NavLeg[]
  state: NavState
  fix: Fix | null
  follow: boolean
  onUserMove: () => void
}

export default function LiveNavMap({ legs, state, fix, follow, onUserMove }: Props) {
  const heading = state.heading === null ? null : Math.round(state.heading / 5) * 5
  const icon = useMemo(() => userIcon(heading), [heading])
  const lastLeg = legs[legs.length - 1]
  const destination = lastLeg?.path.points[lastLeg.path.points.length - 1]
  // Redraw the travelled/remaining split every few metres, not on every GPS tick.
  const alongBucket = Math.round(state.along / 4)

  const lines = useMemo(() => {
    return legs.map((leg) => {
      const color = MODE_COLOR[leg.mode] ?? "#475569"
      const dashed = leg.mode === "walking"
      if (leg.index < state.legIndex || state.done) {
        return { key: leg.index, travelled: slicePath(leg.path, 0, leg.path.length), remaining: null, color, dashed, current: false }
      }
      if (leg.index === state.legIndex) {
        return { key: leg.index, travelled: slicePath(leg.path, 0, state.along), remaining: slicePath(leg.path, state.along, leg.path.length), color, dashed, current: true }
      }
      return { key: leg.index, travelled: null, remaining: slicePath(leg.path, 0, leg.path.length), color, dashed, current: false }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, state.legIndex, state.done, alongBucket])

  const start = legs[0]?.path.points[0]
  const center: [number, number] = [state.position.latitude || start?.latitude || 12.9716, state.position.longitude || start?.longitude || 77.5946]

  return (
    <MapContainer center={center} zoom={17} zoomControl={false} style={{ height: "100%", width: "100%" }} className="z-0" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomControl position="bottomright" />

      {lines.map((line) => (
        <span key={line.key}>
          {line.travelled && <Polyline positions={line.travelled} pathOptions={{ color: TRAVELLED, weight: 6, opacity: 0.75, lineCap: "round", lineJoin: "round" }} />}
          {line.remaining && (
            <>
              <Polyline positions={line.remaining} pathOptions={{ color: "#ffffff", weight: line.current ? 11 : 9, opacity: 0.9, lineCap: "round", lineJoin: "round" }} />
              <Polyline
                positions={line.remaining}
                pathOptions={{ color: line.color, weight: line.current ? 7 : 5, opacity: line.current ? 1 : 0.8, lineCap: "round", lineJoin: "round", ...(line.dashed ? { dashArray: "1 10" } : {}) }}
              />
            </>
          )}
        </span>
      ))}

      {legs.flatMap((leg) =>
        leg.stops.map((stop) => {
          const point = leg.path.points.length ? stopPoint(leg, stop.along) : null
          return point ? (
            <CircleMarker key={`${leg.index}-${stop.name}-${stop.along}`} center={point} radius={5} pathOptions={{ color: MODE_COLOR[leg.mode], weight: 3, fillColor: "#ffffff", fillOpacity: 1 }} />
          ) : null
        }),
      )}

      {destination && <Marker position={[destination.latitude, destination.longitude]} icon={DEST_ICON} title="Destination" alt="Destination" />}

      {fix?.accuracy !== undefined && fix.accuracy > 8 && (
        <Circle center={[state.position.latitude, state.position.longitude]} radius={Math.min(fix.accuracy, 200)} pathOptions={{ color: "#0ea5e9", weight: 1, fillColor: "#0ea5e9", fillOpacity: 0.12 }} />
      )}
      <Marker position={[state.position.latitude, state.position.longitude]} icon={icon} title="Your location" alt="Your location" zIndexOffset={1000} />

      <Follow state={state} follow={follow} />
      <UserMoved onUserMove={onUserMove} />
    </MapContainer>
  )
}

function stopPoint(leg: NavLeg, along: number): [number, number] {
  const sliced = slicePath(leg.path, along, along)
  return sliced[0]
}

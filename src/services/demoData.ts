// Deterministic demo route data for TransitSwap.
// Shown when the backend routing service is unavailable.
// Clearly marked as DEMO / PROTOTYPE — never presented as live route data.
// Uses a real Mumbai corridor: Dadar → Bandra.

import type { RouteResult, TransportMode } from "../types/map"

const DEMO_COORDS_DRIVING: [number, number][] = [
  [72.8427, 19.0196],
  [72.8398, 19.0221],
  [72.8367, 19.0268],
  [72.8354, 19.0319],
  [72.8361, 19.0368],
  [72.8381, 19.0412],
  [72.8388, 19.0458],
  [72.8394, 19.0503],
  [72.8394, 19.0544],
]

const DEMO_COORDS_WALKING: [number, number][] = [
  [72.8427, 19.0196],
  [72.8415, 19.0230],
  [72.8402, 19.0275],
  [72.8395, 19.0330],
  [72.8393, 19.0390],
  [72.8394, 19.0470],
  [72.8394, 19.0544],
]

export function getDemoRoutes(mode: TransportMode): RouteResult[] {
  if (mode === "walking") {
    return [makeDemoRoute("demo-walk-1", mode, DEMO_COORDS_WALKING, 3840, 2820)]
  }
  if (mode === "cycling") {
    return [makeDemoRoute("demo-bike-1", mode, DEMO_COORDS_DRIVING, 4200, 1020)]
  }

  // Driving — two alternatives
  return [
    makeDemoRoute("demo-drive-1", mode, DEMO_COORDS_DRIVING, 5100, 1260, [
      { instruction: "Head north-west on Dadar TT Circle", distanceMeters: 420, durationSeconds: 90, mode: "driving" },
      { instruction: "Turn left onto Senapati Bapat Marg", distanceMeters: 980, durationSeconds: 180, mode: "driving" },
      { instruction: "Turn right onto SV Road", distanceMeters: 1800, durationSeconds: 360, mode: "driving" },
      { instruction: "Turn left onto Hill Road", distanceMeters: 1500, durationSeconds: 300, mode: "driving" },
      { instruction: "Arrive at Bandra Station", distanceMeters: 400, durationSeconds: 120, mode: "driving" },
    ]),
    makeDemoRoute("demo-drive-2", mode, DEMO_COORDS_DRIVING.slice(0, 7), 6300, 1620, [
      { instruction: "Head south on Dadar West", distanceMeters: 600, durationSeconds: 120, mode: "driving" },
      { instruction: "Merge onto Western Express Highway", distanceMeters: 3200, durationSeconds: 720, mode: "driving" },
      { instruction: "Take the exit toward Bandra", distanceMeters: 1900, durationSeconds: 480, mode: "driving" },
      { instruction: "Arrive at Bandra Terminus", distanceMeters: 600, durationSeconds: 180, mode: "driving" },
    ]),
  ]
}

function makeDemoRoute(
  id: string,
  mode: TransportMode,
  coords: [number, number][],
  distanceMeters: number,
  durationSeconds: number,
  steps?: RouteResult["legs"][0]["steps"],
): RouteResult {
  const defaultSteps = steps ?? [
    { instruction: "Follow the demo route", distanceMeters, durationSeconds, mode },
    { instruction: "Arrive at destination", distanceMeters: 0, durationSeconds: 0, mode },
  ]

  return {
    id,
    distanceMeters,
    durationSeconds,
    geometry: { type: "LineString", coordinates: coords },
    legs: [{ distanceMeters, durationSeconds, steps: defaultSteps }],
    provider: "demo",
    mode,
    isDemoData: true,
  }
}

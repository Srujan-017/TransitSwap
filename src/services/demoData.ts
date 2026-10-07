// Deterministic demo route data for TransitSwap.
// Shown when the backend routing service is unavailable.
// Clearly marked as DEMO / PROTOTYPE — never presented as live route data.
// Uses a real Bengaluru corridor: MG Road → Indiranagar (Phase 5 migrated
// this from the original Mumbai Dadar -> Bandra corridor).

import type { RouteResult, TransportMode } from "../types/map"

const DEMO_COORDS_DRIVING: [number, number][] = [
  [77.6079, 12.9757],
  [77.6145, 12.9762],
  [77.6210, 12.9768],
  [77.6280, 12.9772],
  [77.6340, 12.9778],
  [77.6375, 12.9781],
  [77.6408, 12.9784],
]

const DEMO_COORDS_WALKING: [number, number][] = [
  [77.6079, 12.9757],
  [77.6150, 12.9763],
  [77.6230, 12.9770],
  [77.6310, 12.9775],
  [77.6408, 12.9784],
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
      { instruction: "Head east on MG Road", distanceMeters: 420, durationSeconds: 90, mode: "driving" },
      { instruction: "Continue onto Brigade Road junction", distanceMeters: 980, durationSeconds: 180, mode: "driving" },
      { instruction: "Turn onto Old Airport Road", distanceMeters: 1800, durationSeconds: 360, mode: "driving" },
      { instruction: "Continue onto 100 Feet Road", distanceMeters: 1500, durationSeconds: 300, mode: "driving" },
      { instruction: "Arrive at Indiranagar", distanceMeters: 400, durationSeconds: 120, mode: "driving" },
    ]),
    makeDemoRoute("demo-drive-2", mode, DEMO_COORDS_DRIVING.slice(0, 5), 6300, 1620, [
      { instruction: "Head north-east on MG Road", distanceMeters: 600, durationSeconds: 120, mode: "driving" },
      { instruction: "Merge onto Old Airport Road", distanceMeters: 3200, durationSeconds: 720, mode: "driving" },
      { instruction: "Take the exit toward Indiranagar", distanceMeters: 1900, durationSeconds: 480, mode: "driving" },
      { instruction: "Arrive at Indiranagar Metro Station", distanceMeters: 600, durationSeconds: 180, mode: "driving" },
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

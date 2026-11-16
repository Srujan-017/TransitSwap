import { describe, it, expect } from "vitest"
import { describeGuidance } from "./guidance"
import { buildNavLegs, initialProgress, navigate, type Fix } from "./engine"
import { buildPath, destinationPoint, type LatLng } from "./geo"
import type { MultimodalRoute, RouteSegment } from "../types/multimodal"

/** The banner at the top of the navigation screen, in every situation a journey goes through. */

const ORIGIN: LatLng = { latitude: 12.97, longitude: 77.59 }
const pt = (east: number, north: number): LatLng => destinationPoint(destinationPoint(ORIGIN, 0, north), 90, east)
const line = (...points: Array<[number, number]>) => ({ type: "LineString" as const, coordinates: points.map(([e, n]) => { const p = pt(e, n); return [p.longitude, p.latitude] as [number, number] }) })

let id = 0
function seg(mode: RouteSegment["mode"], points: Array<[number, number]>, name: string, extra: Partial<RouteSegment> = {}): RouteSegment {
  const geometry = line(...points)
  const path = buildPath(geometry.coordinates)
  return {
    id: `s${++id}`, mode, from: { name: "From", ...path.points[0] }, to: { name, ...path.points[path.points.length - 1] },
    distanceMeters: Math.round(path.length), durationSeconds: 300, estimatedFare: 0, instruction: `${mode} to ${name}`, geometry, ...extra,
  } as RouteSegment
}
const NOW = new Date("2026-11-16T08:30:00")
const fixAt = (e: number, n: number): Fix => ({ ...pt(e, n), accuracy: 8 })
const opts = { destinationName: "Home" }

const walk = seg("walking", [[0, 0], [300, 0], [300, 300]], "Majestic Metro")
const bus = seg("bus", [[300, 300], [300, 2300]], "Silk Board Bus Stop", {
  transitDetails: {
    lineName: "356", lineColor: "#16a34a", stopCount: 4, stops: ["A", "B", "C", "D", "E"], waitMinutes: 8, routeNumber: "356", towards: "Electronic City",
    stopPoints: [0, 500, 1000, 1500, 2000].map((n, i) => ({ name: "ABCDE"[i], ...pt(300, 300 + n) })),
    boardingAtIso: new Date(NOW.getTime() + 4 * 60000).toISOString(), estimatedBoardingTime: "8:34 AM", upcomingBoardingTimes: ["8:42 AM", "8:50 AM"],
  },
})
const metro = seg("metro", [[300, 2300], [300, 4300]], "Hoodi Metro", {
  transitDetails: {
    lineName: "Yellow Line + Green Line", lineColor: "#ca8a04", stopCount: 3, stops: ["P", "Q", "R", "S"], waitMinutes: 5,
    stopPoints: [0, 700, 1400, 2000].map((n, i) => ({ name: "PQRS"[i], ...pt(300, 2300 + n) })),
    lineChanges: [{ station: "Q", toLine: "Green Line" }],
  },
})
const auto = seg("auto", [[300, 4300], [900, 4300]], "Home")
const legs = buildNavLegs({ id: "r", segments: [walk, bus, metro, auto] } as unknown as MultimodalRoute)
const at = (legIndex: number, along: number, e: number, n: number) => navigate(legs, fixAt(e, n), { legIndex, along }, NOW)

describe("describeGuidance", () => {
  it("shows the next turn with its distance, and the street the rider is on", () => {
    const g = describeGuidance(at(0, 120, 120, 0), opts)
    expect(g.icon).toBe("left")
    expect(g.primary).toBe("Turn left")
    expect(g.distanceMeters).toBeCloseTo(180, -1)
    expect(g.secondary).toBe("Then walk to Majestic Metro")
  })

  it("says 'Wheel' instead of 'Walk' for a wheelchair rider", () => {
    const g = describeGuidance(at(0, 450, 300, 150), { ...opts, profile: "wheelchair" })
    expect(g.primary).toBe("Wheel to Majestic Metro")
    expect(describeGuidance(at(0, 120, 120, 0), { ...opts, profile: "wheelchair" }).secondary).toBe("Then wheel to Majestic Metro")
  })

  it("shows where the walk ends when no turn is left", () => {
    const g = describeGuidance(at(0, 450, 300, 150), opts)
    expect(g.icon).toBe("flag")
    expect(g.primary).toBe("Walk to Majestic Metro")
    expect(g.distanceMeters).toBeCloseTo(150, -1)
  })

  it("says to board the bus, with a countdown, while waiting at the stop", () => {
    const g = describeGuidance(at(1, 0, 300, 305), opts)
    expect(g.icon).toBe("bus")
    expect(g.primary).toBe("Board bus 356 towards Electronic City at From")
    expect(g.secondary).toBe("Bus due in 4 min (~8:34 AM) · next ~8:42 AM")
    expect(g.distanceMeters).toBeNull()
  })

  it("says the bus is due now when the time has come", () => {
    const state = navigate(legs, fixAt(300, 305), { legIndex: 1, along: 0 }, new Date(NOW.getTime() + 4 * 60000))
    expect(describeGuidance(state, opts).secondary).toMatch(/^Bus is due now/)
  })

  it("counts the stops while riding the bus, then says to get off at the next one", () => {
    const riding = describeGuidance(at(1, 800, 300, 1100), opts)
    expect(riding.primary).toBe("Get off at Silk Board Bus Stop")
    expect(riding.secondary).toBe("3 stops left · next C")
    expect(riding.distanceMeters).toBeCloseTo(1200, -1)
    expect(describeGuidance(at(1, 1700, 300, 2000), opts).secondary).toBe("Get off at the next stop")
  })

  it("tells the metro rider where to change line", () => {
    const g = describeGuidance(at(2, 300, 300, 2600), opts)
    expect(g.icon).toBe("metro")
    expect(g.secondary).toBe("Change to the Green Line at Q · 3 stops left · next Q")
  })

  it("guides the last auto leg like a drive", () => {
    const g = describeGuidance(at(3, 100, 400, 4300), opts)
    expect(g.icon).toBe("auto")
    expect(g.primary).toBe("Ride to Home")
  })

  it("says rerouting while a new route is being found", () => {
    const g = describeGuidance(at(0, 100, 100, 0), { ...opts, rerouting: true })
    expect(g.primary).toBe("Rerouting…")
    expect(g.distanceMeters).toBeNull()
  })

  it("celebrates arrival", () => {
    const done = navigate(legs, fixAt(900, 4300), { legIndex: 3, along: 590 }, NOW)
    const g = describeGuidance(done, opts)
    expect(g.icon).toBe("check")
    expect(g.primary).toBe("You have arrived")
    expect(g.secondary).toBe("Home")
  })

  it("starts from the beginning", () => {
    const g = describeGuidance(navigate(legs, fixAt(0, 0), initialProgress(), NOW), opts)
    expect(g.primary).toBe("Turn left")
  })
})

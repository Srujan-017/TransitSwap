import { describe, it, expect } from "vitest"
import {
  bearing, buildPath, destinationPoint, haversine, headingAtAlong, pointAtAlong, projectOnPath, slicePath, turnAngle, type LatLng,
} from "./geo"
import { deriveManeuvers, directionFromAngle, maneuversFromSteps, streetAt, turnText } from "./maneuvers"
import { buildNavLegs, initialProgress, navigate, offRouteThreshold, skipLeg, type Fix, type Progress } from "./engine"
import { promptsFor, spokenDistance } from "./prompts"
import { buildSimulation, displaceFix } from "./simulator"
import type { MultimodalRoute, RouteSegment, TurnStep } from "../types/multimodal"

/**
 * Live navigation engine: geometry, turns, progress along the route, bus/metro tracking, spoken prompts and
 * the simulated journey. Positions are built in metres from a point in Bengaluru so expectations are exact.
 */

const ORIGIN: LatLng = { latitude: 12.97, longitude: 77.59 }
const pt = (east: number, north: number): LatLng => destinationPoint(destinationPoint(ORIGIN, 0, north), 90, east)
const coords = (...points: Array<[number, number]>) => points.map(([e, n]) => { const p = pt(e, n); return [p.longitude, p.latitude] as [number, number] })

let id = 0
function seg(mode: RouteSegment["mode"], points: Array<[number, number]>, extra: Partial<RouteSegment> = {}, name = "Place"): RouteSegment {
  const geometry = { type: "LineString" as const, coordinates: coords(...points) }
  const path = buildPath(geometry.coordinates)
  const first = path.points[0], last = path.points[path.points.length - 1]
  return {
    id: `s${++id}`, mode, from: { name: "From", ...first }, to: { name, ...last }, distanceMeters: Math.round(path.length),
    durationSeconds: mode === "walking" ? Math.round(path.length / 1.4) : Math.round(path.length / 8) + 120, estimatedFare: 0, instruction: "", geometry, ...extra,
  } as RouteSegment
}
const route = (...segments: RouteSegment[]): MultimodalRoute => ({ id: "r", segments } as unknown as MultimodalRoute)
const fixAt = (e: number, n: number, extra: Partial<Fix> = {}): Fix => ({ ...pt(e, n), accuracy: 8, ...extra })
const NOW = new Date("2026-11-16T08:30:00")

describe("geometry", () => {
  it("measures distance and bearing", () => {
    expect(haversine({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111195, -2)
    expect(bearing(ORIGIN, pt(0, 100))).toBeCloseTo(0, 0)
    expect(bearing(ORIGIN, pt(100, 0))).toBeCloseTo(90, 0)
    expect(bearing(ORIGIN, pt(0, -100))).toBeCloseTo(180, 0)
    expect(haversine(ORIGIN, pt(300, 400))).toBeCloseTo(500, 0)
  })

  it("turnAngle is positive clockwise and wraps", () => {
    expect(turnAngle(90, 180)).toBe(90)
    expect(turnAngle(90, 0)).toBe(-90)
    expect(turnAngle(350, 10)).toBe(20)
    expect(turnAngle(10, 350)).toBe(-20)
  })

  it("builds a path, dropping repeated points", () => {
    const path = buildPath(coords([0, 0], [0, 0], [100, 0], [100, 0], [200, 0]))
    expect(path.points).toHaveLength(3)
    expect(path.length).toBeCloseTo(200, 0)
    expect(buildPath([]).points).toHaveLength(2)
  })

  it("snaps a position onto the path", () => {
    const path = buildPath(coords([0, 0], [200, 0]))
    const p = projectOnPath(path, pt(80, 30))
    expect(p.along).toBeCloseTo(80, 0)
    expect(p.distance).toBeCloseTo(30, 0)
    expect(projectOnPath(path, pt(-50, 0)).along).toBeCloseTo(0, 0)
    expect(projectOnPath(path, pt(500, 0)).along).toBeCloseTo(200, 0)
  })

  it("does not snap backwards on a path that doubles back (minAlong)", () => {
    const path = buildPath(coords([0, 0], [200, 0], [200, 20], [0, 20])) // out and back, 20 m apart
    const onReturn = pt(100, 20)
    expect(projectOnPath(path, onReturn).along).toBeGreaterThan(200)
    expect(projectOnPath(path, pt(100, 9), 215).along).toBeGreaterThan(215)
  })

  it("finds points and headings along a path, and slices it", () => {
    const path = buildPath(coords([0, 0], [100, 0], [100, 100]))
    const mid = pointAtAlong(path, 150)
    expect(haversine(mid, pt(100, 50))).toBeLessThan(1)
    expect(headingAtAlong(path, 50)).toBeCloseTo(90, 0)
    expect(headingAtAlong(path, 150)).toBeCloseTo(0, 0)
    const slice = slicePath(path, 50, 150)
    expect(slice).toHaveLength(3)
    expect(slice[0][0]).toBeCloseTo(pt(50, 0).latitude, 5)
  })
})

describe("turns", () => {
  it("classifies turn directions", () => {
    expect(directionFromAngle(90)).toBe("right")
    expect(directionFromAngle(-90)).toBe("left")
    expect(directionFromAngle(40)).toBe("slight right")
    expect(directionFromAngle(-130)).toBe("sharp left")
    expect(directionFromAngle(170)).toBe("uturn")
  })

  it("words a turn", () => {
    expect(turnText("right", "80 Feet Road")).toBe("Turn right onto 80 Feet Road")
    expect(turnText("slight left")).toBe("Bear left")
    expect(turnText("uturn")).toBe("Make a U-turn")
  })

  it("finds a left turn when the path goes east then north", () => {
    const m = deriveManeuvers(buildPath(coords([0, 0], [200, 0], [200, 200])), "Dest")
    expect(m).toHaveLength(2)
    expect(m[0].direction).toBe("left")
    expect(m[0].along).toBeCloseTo(200, -1)
    expect(m[1].kind).toBe("arrive")
  })

  it("finds a right turn when the path goes east then south", () => {
    const m = deriveManeuvers(buildPath(coords([0, 0], [200, 0], [200, -200])), "Dest")
    expect(m[0].direction).toBe("right")
  })

  it("finds no turn on a straight path or a slight kink", () => {
    expect(deriveManeuvers(buildPath(coords([0, 0], [300, 0])), "D")).toHaveLength(1)
    expect(deriveManeuvers(buildPath(coords([0, 0], [150, 0], [300, 20])), "D")).toHaveLength(1)
  })

  it("finds several turns in order", () => {
    const m = deriveManeuvers(buildPath(coords([0, 0], [200, 0], [200, 200], [400, 200])), "D")
    expect(m.map((x) => x.direction ?? x.kind)).toEqual(["left", "right", "arrive"])
    expect(m[0].along).toBeLessThan(m[1].along)
  })

  it("uses the router's steps, with street names, and ignores 'straight' and 'new name' steps", () => {
    const path = buildPath(coords([0, 0], [200, 0], [200, 200]))
    const step = (type: string, e: number, n: number, extra: Partial<TurnStep> = {}): TurnStep => ({ instruction: "", distanceMeters: 0, durationSeconds: 0, type, location: [pt(e, n).longitude, pt(e, n).latitude], ...extra })
    const { maneuvers, streets } = maneuversFromSteps(path, [
      step("depart", 0, 0, { street: "Church Street" }),
      step("new name", 100, 0, { street: "Brigade Road" }),
      step("turn", 200, 0, { modifier: "left", street: "80 Feet Road" }),
      step("turn", 200, 100, { modifier: "straight" }),
      step("arrive", 200, 200),
    ], "Dest")
    expect(maneuvers.map((m) => m.kind)).toEqual(["turn", "arrive"])
    expect(maneuvers[0].text).toBe("Turn left onto 80 Feet Road")
    expect(maneuvers[0].along).toBeCloseTo(200, -1)
    expect(streetAt(streets, 50)).toBe("Church Street")
    expect(streetAt(streets, 150)).toBe("Brigade Road")
    expect(streetAt(streets, 250)).toBe("80 Feet Road")
  })

  it("keeps roundabouts and forks from the router", () => {
    const path = buildPath(coords([0, 0], [300, 0]))
    const loc = (e: number): [number, number] => [pt(e, 0).longitude, pt(e, 0).latitude]
    const { maneuvers } = maneuversFromSteps(path, [
      { instruction: "", distanceMeters: 0, durationSeconds: 0, type: "roundabout", location: loc(100) },
      { instruction: "", distanceMeters: 0, durationSeconds: 0, type: "fork", modifier: "slight right", location: loc(200), street: "Hosur Road" },
    ], "D")
    expect(maneuvers[0].kind).toBe("roundabout")
    expect(maneuvers[1].text).toBe("Keep right at the fork onto Hosur Road")
  })
})

describe("progress along a route", () => {
  const walk = seg("walking", [[0, 0], [200, 0], [200, 200]], {}, "Metro Station")
  const ride = seg("metro", [[200, 200], [200, 1200]], {
    transitDetails: {
      lineName: "Purple Line", lineColor: "#7c3aed", stopCount: 3, stops: ["A", "B", "C", "D"], waitMinutes: 5,
      stopPoints: [{ name: "A", ...pt(200, 200) }, { name: "B", ...pt(200, 500) }, { name: "C", ...pt(200, 900) }, { name: "D", ...pt(200, 1200) }],
      boardingAtIso: new Date(NOW.getTime() + 4 * 60000).toISOString(),
      lineChanges: [{ station: "C", toLine: "Green Line" }],
    },
  }, "D")
  const finish = seg("auto", [[200, 1200], [600, 1200]], {}, "Destination")
  const legs = buildNavLegs(route(walk, ride, finish))

  it("builds legs with turns, stops and line changes", () => {
    expect(legs).toHaveLength(3)
    expect(legs[0].maneuvers.map((m) => m.direction ?? m.kind)).toEqual(["left", "arrive"])
    expect(legs[1].stops.map((s) => s.name)).toEqual(["A", "B", "C", "D"])
    expect(legs[1].stops[1].along).toBeCloseTo(300, -1)
    expect(legs[1].lineChanges).toEqual([{ station: "C", toLine: "Green Line", along: legs[1].stops[2].along }])
  })

  it("tracks the rider along the first leg, with the next turn and its distance", () => {
    const s = navigate(legs, fixAt(120, 0), initialProgress(), NOW)
    expect(s.legIndex).toBe(0)
    expect(s.along).toBeCloseTo(120, 0)
    expect(s.next?.maneuver.direction).toBe("left")
    expect(s.next?.distanceMeters).toBeCloseTo(80, -1)
    expect(s.offRouteMeters).toBeLessThan(2)
    expect(s.done).toBe(false)
  })

  it("moves on to the next leg when the end of this one is reached", () => {
    const s = navigate(legs, fixAt(200, 190), { legIndex: 0, along: 380 }, NOW)
    expect(s.legIndex).toBe(1)
    expect(s.transit?.phase).toBe("waiting")
  })

  it("counts down to the bus while waiting at the stop", () => {
    const s = navigate(legs, fixAt(200, 205), { legIndex: 1, along: 0 }, NOW)
    expect(s.transit?.phase).toBe("waiting")
    expect(s.transit?.boardingInSeconds).toBe(240)
    const later = navigate(legs, fixAt(200, 205), { legIndex: 1, along: 0 }, new Date(NOW.getTime() + 200_000))
    expect(later.transit?.boardingInSeconds).toBe(40)
  })

  it("counts the stops left as the ride goes on", () => {
    let p: Progress = { legIndex: 1, along: 0 }
    const left: Array<number | null> = []
    for (const north of [250, 400, 700, 1000, 1100]) {
      const s = navigate(legs, fixAt(200, north), p, NOW)
      p = { legIndex: s.legIndex, along: s.along }
      left.push(s.transit?.stopsLeft ?? null)
      expect(s.transit?.phase).toBe("riding")
    }
    expect(left).toEqual([3, 3, 2, 1, 1])
    const mid = navigate(legs, fixAt(200, 700), { legIndex: 1, along: 480 }, NOW)
    expect(mid.transit?.nextStop).toBe("C")
    expect(mid.transit?.nextLineChange?.station).toBe("C")
  })

  it("gets off at the stop and starts the last leg", () => {
    const s = navigate(legs, fixAt(200, 1190), { legIndex: 1, along: 980 }, NOW)
    expect(s.legIndex).toBe(2)
    expect(s.leg?.mode).toBe("auto")
  })

  it("finishes at the destination", () => {
    const s = navigate(legs, fixAt(595, 1200), { legIndex: 2, along: 380 }, NOW)
    expect(s.done).toBe(true)
    expect(s.remainingMeters).toBe(0)
  })

  it("never moves the rider backwards on GPS jitter", () => {
    const s = navigate(legs, fixAt(100, 0), { legIndex: 0, along: 140 }, NOW)
    expect(s.along).toBe(140)
  })

  it("adds up the distance and time still to go, and the arrival time", () => {
    const s = navigate(legs, fixAt(0, 0), initialProgress(), NOW)
    const totalLength = legs.reduce((n, l) => n + l.path.length, 0)
    expect(s.remainingMeters).toBeCloseTo(totalLength, 0)
    const totalSeconds = legs.reduce((n, l) => n + l.segment.durationSeconds, 0)
    expect(s.remainingSeconds).toBeCloseTo(totalSeconds, 0)
    expect(s.arrivalAt.getTime()).toBe(NOW.getTime() + Math.round(s.remainingSeconds * 1000) || s.arrivalAt.getTime())
    const half = navigate(legs, fixAt(200, 100), { legIndex: 0, along: 300 }, NOW)
    expect(half.remainingMeters).toBeCloseTo(totalLength - 300, 0)
  })

  it("measures how far off the route the rider is, with a threshold that allows for GPS accuracy", () => {
    const s = navigate(legs, fixAt(100, -120), initialProgress(), NOW)
    expect(s.offRouteMeters).toBeCloseTo(120, 0)
    expect(s.position.latitude).toBeCloseTo(pt(100, -120).latitude, 5) // drawn where the GPS says, not on the route
    expect(offRouteThreshold()).toBe(50)
    expect(offRouteThreshold(10)).toBe(50)
    expect(offRouteThreshold(60)).toBe(90)
    const near = navigate(legs, fixAt(100, 20), initialProgress(), NOW)
    expect(near.position.latitude).toBeCloseTo(pointAtAlong(legs[0].path, 100).latitude, 5) // close: snapped onto the route
  })

  it("jumps ahead when the rider is clearly on a later leg", () => {
    const s = navigate(legs, fixAt(200, 700), { legIndex: 0, along: 50 }, NOW)
    expect(s.legIndex).toBe(1)
    expect(s.along).toBeCloseTo(500, -1)
  })

  it("skips a leg on request", () => {
    expect(skipLeg(legs, { legIndex: 0, along: 100 })).toEqual({ legIndex: 1, along: 0 })
    expect(skipLeg(legs, { legIndex: 2, along: 100 })).toEqual({ legIndex: 3, along: 0 })
    expect(skipLeg(legs, { legIndex: 3, along: 0 })).toEqual({ legIndex: 3, along: 0 })
  })

  it("uses the device heading when it moves, else the direction of the path", () => {
    expect(navigate(legs, fixAt(50, 0, { heading: 123, speed: 1.4 }), initialProgress(), NOW).heading).toBe(123)
    expect(navigate(legs, fixAt(50, 0, { heading: 123, speed: 0 }), initialProgress(), NOW).heading).toBeCloseTo(90, 0)
  })

  it("handles a route with no legs", () => {
    expect(navigate([], fixAt(0, 0), initialProgress(), NOW).done).toBe(true)
  })
})

describe("arrival time", () => {
  // A bus leg: 8 min standing allowance + a 15 min ride (900 s), the bus due 5 min after the rider is at the stop.
  const bus = seg("bus", [[0, 0], [0, 3000]], {
    durationSeconds: 8 * 60 + 900,
    transitDetails: {
      lineName: "5", lineColor: "#16a34a", stopCount: 1, stops: ["A", "B"], waitMinutes: 8, routeNumber: "5",
      stopPoints: [{ name: "A", ...pt(0, 0) }, { name: "B", ...pt(0, 3000) }],
      boardingAtIso: new Date(NOW.getTime() + 300_000).toISOString(),
    },
  }, "B")
  const busLegs = buildNavLegs(route(bus))

  it("stays the same while waiting for the bus, and while riding it", () => {
    const expected = NOW.getTime() + 300_000 + 900_000 // due in 5 min, then the 15 min ride
    const waiting = navigate(busLegs, fixAt(0, 2), { legIndex: 0, along: 0 }, NOW)
    expect(waiting.arrivalAt.getTime()).toBe(expected)
    const laterWaiting = navigate(busLegs, fixAt(0, 2), { legIndex: 0, along: 0 }, new Date(NOW.getTime() + 200_000))
    expect(laterWaiting.arrivalAt.getTime()).toBe(expected) // 200 s closer to the bus, 200 s later on the clock
    const halfway = navigate(busLegs, fixAt(0, 1500), { legIndex: 0, along: 1500 }, new Date(NOW.getTime() + 300_000 + 450_000))
    expect(Math.abs(halfway.arrivalAt.getTime() - expected)).toBeLessThan(1000)
  })

  it("with no known bus time, counts the whole standing allowance", () => {
    const noTime = seg("bus", [[0, 0], [0, 3000]], { durationSeconds: 8 * 60 + 900, transitDetails: { lineName: "5", lineColor: "#16a34a", stopCount: 1, stops: ["A", "B"], waitMinutes: 8, routeNumber: "5" } }, "B")
    const s = navigate(buildNavLegs(route(noTime)), fixAt(0, 2), { legIndex: 0, along: 0 }, NOW)
    expect(s.remainingSeconds).toBeGreaterThan(8 * 60 + 890)
  })
})

describe("spoken prompts", () => {
  const walk = seg("walking", [[0, 0], [400, 0], [400, 300]], {}, "Majestic Metro")
  const bus = seg("bus", [[400, 300], [400, 2300]], {
    transitDetails: {
      lineName: "356", lineColor: "#16a34a", stopCount: 4, stops: ["A", "B", "C", "D", "E"], waitMinutes: 8, routeNumber: "356", towards: "Electronic City",
      stopPoints: [0, 500, 1000, 1500, 2000].map((n, i) => ({ name: "ABCDE"[i], ...pt(400, 300 + n) })),
      boardingAtIso: new Date(NOW.getTime() + 30_000).toISOString(),
    },
  }, "E")
  const r = route(walk, bus)
  const legs = buildNavLegs(r)
  const ctx = (spoken: Set<string>) => ({ route: r, profile: undefined as string | undefined, spoken, destinationName: "Home" })
  const run = (state: ReturnType<typeof navigate>, spoken: Set<string>) => {
    const out = promptsFor(state, ctx(spoken))
    out.forEach((p) => spoken.add(p.key))
    return out.filter((p) => p.text).map((p) => p.text)
  }

  it("announces the leg, then the turn at 200 m, 60 m and at the turn — once each, in order", () => {
    const spoken = new Set<string>()
    const said: string[] = []
    for (const east of [10, 150, 205, 300, 350, 385, 399]) {
      said.push(...run(navigate(legs, fixAt(east, 0), { legIndex: 0, along: east }, NOW), spoken))
    }
    expect(said[0]).toMatch(/^Walk \d+ m toward Majestic Metro/)
    const turns = said.filter((t) => /turn/i.test(t))
    expect(turns).toEqual(["In 200 metres, turn left.", "In 50 metres, turn left.", "Turn left now."])
    expect(new Set(said).size).toBe(said.length)
  })

  it("does not say the far prompt after the near one when the rider first appears close to a turn", () => {
    const spoken = new Set<string>()
    const said = run(navigate(legs, fixAt(370, 0), { legIndex: 0, along: 370 }, NOW), spoken)
    expect(said.filter((t) => /turn/i.test(t))).toEqual(["In 30 metres, turn left."])
    expect(run(navigate(legs, fixAt(375, 0), { legIndex: 0, along: 375 }, NOW), spoken)).toEqual([])
  })

  it("says the bus is due, then counts the stops, then says where to get off", () => {
    const spoken = new Set<string>()
    const said: string[] = []
    said.push(...run(navigate(legs, pointFix(400, 305), { legIndex: 1, along: 0 }, NOW), spoken))
    for (const north of [700, 1100, 1600, 2000, 2230]) {
      said.push(...run(navigate(legs, fixAt(400, north), { legIndex: 1, along: north - 300 }, NOW), spoken))
    }
    expect(said.some((t) => /Take bus 356 toward Electronic City/.test(t))).toBe(true)
    expect(said.some((t) => /Your bus is due\. Board bus 356 toward Electronic City/.test(t))).toBe(true)
    expect(said.filter((t) => /stops? left|next stop/i.test(t))).toEqual(["3 stops left. Get off at E.", "2 stops left. Get off at E.", "Get off at the next stop, E."])
    expect(said.some((t) => /Get off here, at E/.test(t))).toBe(true)
  })

  it("says the journey is over on arrival, once", () => {
    const spoken = new Set<string>()
    const done = navigate(legs, fixAt(400, 2300), { legIndex: 1, along: 1995 }, NOW)
    expect(done.done).toBe(true)
    expect(run(done, spoken)).toEqual(["You have arrived at Home."])
    expect(run(done, spoken)).toEqual([])
  })

  it("says distances the way a person would", () => {
    expect(spokenDistance(200)).toBe("200 metres")
    expect(spokenDistance(173)).toBe("150 metres")
    expect(spokenDistance(48)).toBe("50 metres")
    expect(spokenDistance(1200)).toBe("1.2 kilometres")
    expect(spokenDistance(1000)).toBe("1 kilometre")
  })
})

function pointFix(e: number, n: number): Fix { return fixAt(e, n) }

describe("simulated journey", () => {
  const walk = seg("walking", [[0, 0], [280, 0], [280, 140]], {}, "Metro")
  const bus = seg("bus", [[280, 140], [280, 3140]], {
    durationSeconds: 8 * 60 + 600,
    transitDetails: { lineName: "5", lineColor: "#16a34a", stopCount: 2, stops: ["A", "B", "C"], waitMinutes: 8, routeNumber: "5", boardingAtIso: new Date(NOW.getTime() + 8 * 60000).toISOString() },
  }, "Stop C")
  const finish = seg("auto", [[280, 3140], [880, 3140]], { durationSeconds: 90 }, "Home")
  const r = route(walk, bus, finish)
  const legs = buildNavLegs(r)
  const sim = buildSimulation(legs, NOW)

  it("takes as long as the legs do, and waits at the bus stop until the bus is due", () => {
    const walkS = legs[0].path.length / 1.4
    expect(walkS).toBeLessThan(8 * 60) // the bus is still some way off when the rider gets to the stop
    const wait = 8 * 60 - walkS
    const ride = 600
    expect(sim.totalSeconds).toBeCloseTo(walkS + wait + ride + 90, 0)
    expect(sim.at(walkS + 5).waiting).toBe(true)
    expect(sim.at(walkS + wait + 5).waiting).toBe(false)
    expect(sim.at(walkS + wait - 1).fix.speed).toBe(0)
  })

  it("starts at the start, ends at the destination, and moves forward only", () => {
    expect(haversine(sim.at(0).fix, pt(0, 0))).toBeLessThan(1)
    const end = sim.at(sim.totalSeconds + 10)
    expect(end.finished).toBe(true)
    expect(haversine(end.fix, pt(880, 3140))).toBeLessThan(1)
    let lastClock = 0
    for (let t = 0; t <= sim.totalSeconds; t += 7) {
      const p = sim.at(t)
      expect(p.clock.getTime()).toBeGreaterThanOrEqual(lastClock)
      lastClock = p.clock.getTime()
    }
    expect(sim.at(0).clock.getTime()).toBe(NOW.getTime())
  })

  it("driven through the engine, the whole journey is followed to 'You have arrived'", () => {
    let progress: Progress = initialProgress()
    const spoken = new Set<string>()
    const said: string[] = []
    const legsSeen: number[] = []
    let maxOff = 0
    let done = false
    for (let t = 0; t <= sim.totalSeconds + 5; t += 1) {
      const p = sim.at(t)
      const state = navigate(legs, p.fix, progress, p.clock)
      progress = { legIndex: state.legIndex, along: state.along }
      if (!legsSeen.includes(state.legIndex)) legsSeen.push(state.legIndex)
      if (!state.done) maxOff = Math.max(maxOff, state.offRouteMeters)
      for (const prompt of promptsFor(state, { route: r, spoken, destinationName: "Home" })) {
        spoken.add(prompt.key)
        if (prompt.text) said.push(prompt.text)
      }
      if (state.done) { done = true; break }
    }
    expect(done).toBe(true)
    expect(legsSeen).toEqual([0, 1, 2, 3])
    expect(maxOff).toBeLessThan(15)
    expect(said[0]).toMatch(/^Walk/)
    expect(said.some((t) => /turn/i.test(t))).toBe(true)
    expect(said.some((t) => /Your bus is due/.test(t))).toBe(true)
    expect(said.some((t) => /Get off at the next stop/.test(t))).toBe(true)
    expect(said[said.length - 1]).toBe("You have arrived at Home.")
  })

  it("can be knocked off the route to demonstrate rerouting", () => {
    const p = sim.at(60)
    const off = displaceFix(p.fix, 160)
    const state = navigate(legs, off, initialProgress(), p.clock)
    expect(state.offRouteMeters).toBeGreaterThan(120)
  })

  it("copes with a route with no legs", () => {
    expect(buildSimulation([], NOW).at(5).finished).toBe(true)
  })
})

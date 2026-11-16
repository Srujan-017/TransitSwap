import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import ActiveNavigationView from "./ActiveNavigationView"
import { destinationPoint, buildPath, type LatLng } from "../../navigation/geo"
import type { MultimodalRoute, RouteSegment } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

/**
 * The live navigation screen, end to end without a map or a GPS chip: the map is replaced by a stub, the GPS by a
 * controllable fake, and time by fake timers. Covers following the rider, the simulated journey from the first
 * turn to "You have arrived", going off route (rerouting), the manual Next step, mute and exit.
 */

vi.mock("./LiveNavMap", () => ({ default: () => <div data-testid="live-map" /> }))

const ORIGIN: LatLng = { latitude: 12.97, longitude: 77.59 }
const pt = (east: number, north: number): LatLng => destinationPoint(destinationPoint(ORIGIN, 0, north), 90, east)
const geom = (...points: Array<[number, number]>) => ({ type: "LineString" as const, coordinates: points.map(([e, n]) => { const p = pt(e, n); return [p.longitude, p.latitude] as [number, number] }) })

let id = 0
function seg(mode: RouteSegment["mode"], points: Array<[number, number]>, name: string, extra: Partial<RouteSegment> = {}): RouteSegment {
  const geometry = geom(...points)
  const path = buildPath(geometry.coordinates)
  return {
    id: `s${++id}`, mode, from: { name: "Start", ...path.points[0] }, to: { name, ...path.points[path.points.length - 1] },
    distanceMeters: Math.round(path.length), durationSeconds: mode === "walking" ? Math.round(path.length / 1.4) : 600, estimatedFare: 0,
    instruction: `${mode} to ${name}`, geometry, ...extra,
  } as RouteSegment
}

function makeRoute(): MultimodalRoute {
  return {
    id: "route-1",
    segments: [
      seg("walking", [[0, 0], [200, 0], [200, 200]], "Bus Stop"),
      seg("bus", [[200, 200], [200, 2200]], "Stop Two", {
        transitDetails: {
          lineName: "356", lineColor: "#16a34a", stopCount: 2, stops: ["A", "B", "C"], waitMinutes: 8, routeNumber: "356", towards: "Electronic City",
          stopPoints: [0, 1000, 2000].map((n, i) => ({ name: "ABC"[i], ...pt(200, 200 + n) })),
        },
      }),
      seg("auto", [[200, 2200], [600, 2200]], "Home"),
    ],
  } as unknown as MultimodalRoute
}

const SPOT: GeoLocation = { name: "Start", address: "Start", latitude: ORIGIN.latitude, longitude: ORIGIN.longitude }
const HOME: GeoLocation = { name: "Home", address: "Home", ...pt(600, 2200) }

// A GPS the test controls.
let deliver: ((lat: number, lng: number, accuracy?: number) => void) | null = null
let watching = 0

beforeEach(() => {
  deliver = null
  watching = 0
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition: (ok: PositionCallback) => {
        watching++
        deliver = (latitude, longitude, accuracy = 10) =>
          ok({ coords: { latitude, longitude, accuracy, heading: null, speed: null, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() } as unknown as GeolocationPosition)
        return watching
      },
      clearWatch: () => { watching-- },
    },
  })
})
afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined })
})

const text = (testId: string) => screen.getByTestId(testId).textContent

describe("ActiveNavigationView", () => {
  it("opens on the first instruction and says it has not found the rider yet", async () => {
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    expect(text("guidance-primary")).toBe("Turn left")
    expect(text("guidance-distance")).toBe("200 m")
    expect(text("nav-status")).toBe("Finding your location…")
    expect(await screen.findByTestId("live-map")).toBeInTheDocument() // the map is loaded lazily
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
  })

  it("follows the rider's GPS: the distance to the turn shrinks and the status says so", () => {
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    act(() => { const p = pt(150, 0); deliver!(p.latitude, p.longitude, 12) })
    expect(text("guidance-distance")).toBe("50 m")
    expect(text("nav-status")).toBe("Following your live location · accurate to about 12 m")
    act(() => { const p = pt(200, 150); deliver!(p.latitude, p.longitude) })
    expect(text("guidance-primary")).toBe("Walk to Bus Stop")
    act(() => { const p = pt(200, 195); deliver!(p.latitude, p.longitude) })
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
    expect(text("guidance-primary")).toMatch(/^Board bus 356 towards Electronic City/)
  })

  it("explains when the GPS is unavailable", () => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined })
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    expect(text("nav-status")).toMatch(/GPS is not available here/)
    expect(screen.getByRole("button", { name: /Simulate journey/ })).toBeInTheDocument()
  })

  it("Next step moves on to the next leg by hand", () => {
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "Next step" }))
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
    expect(screen.getByTestId("guidance-icon").getAttribute("data-icon")).toBe("bus")
    fireEvent.click(screen.getByRole("button", { name: "Next step" }))
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Next step" }))
    expect(text("guidance-primary")).toBe("You have arrived")
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
  })

  it("the simulated journey runs the whole route to 'You have arrived', labelled as a demo", () => {
    vi.useFakeTimers()
    const onExit = vi.fn()
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={onExit} />)
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    expect(screen.getByText(/DEMO · simulated journey/)).toBeInTheDocument()
    expect(text("nav-status")).toBe("Simulated journey (demo) · 30× speed")
    expect(screen.getByRole("group", { name: "Simulation controls" })).toBeInTheDocument()

    const seen = new Set<string>()
    // (Plain DOM lookups in this loop: a role query on every one of up to 400 ticks is slow enough to hit the test timeout.)
    for (let tick = 0; tick < 400 && document.querySelector('[data-icon="check"]') === null; tick++) {
      act(() => { vi.advanceTimersByTime(500) })
      const primary = document.querySelector('[data-testid="guidance-primary"]')
      if (primary?.textContent) seen.add(primary.textContent)
    }
    expect(screen.getByText("You have arrived at Home")).toBeInTheDocument()
    expect([...seen].some((s) => /Turn left/.test(s))).toBe(true)
    expect([...seen].some((s) => /^Board bus 356/.test(s))).toBe(true)
    expect([...seen].some((s) => /^Get off at Stop Two/.test(s))).toBe(true)
    expect([...seen].some((s) => /^Ride to Home/.test(s))).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(onExit).toHaveBeenCalled()
  }, 30_000)

  it("speed buttons change the simulation speed", () => {
    vi.useFakeTimers()
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    fireEvent.click(screen.getByRole("button", { name: "60×" }))
    expect(text("nav-status")).toBe("Simulated journey (demo) · 60× speed")
    expect(screen.getByRole("button", { name: "60×" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "Stop simulation" }))
    expect(screen.getByRole("button", { name: /Simulate journey/ })).toBeInTheDocument()
  })

  it("going off route asks for a new route from where the rider is, and says it is rerouting", async () => {
    vi.useFakeTimers()
    let finish: (ok: boolean) => void = () => {}
    const onReroute = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve }))
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} onReroute={onReroute} />)
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    for (let i = 0; i < 4; i++) act(() => { vi.advanceTimersByTime(500) })
    expect(onReroute).not.toHaveBeenCalled() // on the route: nothing to do

    fireEvent.click(screen.getByRole("button", { name: /Go off route/ }))
    for (let i = 0; i < 5; i++) act(() => { vi.advanceTimersByTime(500) })
    expect(onReroute).toHaveBeenCalledTimes(1)
    const [from, at] = onReroute.mock.calls[0] as unknown as [LatLng, Date]
    expect(Number.isFinite(from.latitude) && Number.isFinite(from.longitude)).toBe(true)
    expect(at).toBeInstanceOf(Date)
    expect(text("guidance-primary")).toBe("Rerouting…")

    await act(async () => { finish(true) })
    expect(text("guidance-primary")).not.toBe("Rerouting…")
  })

  it("tells the rider when no new route could be found", async () => {
    vi.useFakeTimers()
    const onReroute = vi.fn(async () => false)
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} onReroute={onReroute} />)
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    for (let i = 0; i < 2; i++) act(() => { vi.advanceTimersByTime(500) })
    fireEvent.click(screen.getByRole("button", { name: /Go off route/ }))
    for (let i = 0; i < 5; i++) await act(async () => { vi.advanceTimersByTime(500) })
    expect(screen.getByRole("alert")).toHaveTextContent("Could not find a new route from here")
  })

  it("does not offer 'Go off route' when the page cannot reroute", () => {
    vi.useFakeTimers()
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    expect(screen.queryByRole("button", { name: /Go off route/ })).toBeNull()
  })

  it("mutes and unmutes the voice, and exits", () => {
    const onExit = vi.fn()
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={onExit} />)
    const mute = screen.getByRole("button", { name: "Mute voice guidance" })
    expect(mute).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(mute)
    expect(screen.getByRole("button", { name: "Turn voice guidance on" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(screen.getByRole("button", { name: "Exit navigation" }))
    expect(onExit).toHaveBeenCalled()
  })

  it("is honest about its limits", () => {
    render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} />)
    expect(screen.getByText(/Bus and metro positions are not tracked live/)).toBeInTheDocument()
    expect(screen.getByText(/can only follow your\s+location while this screen is open/)).toBeInTheDocument()
  })
})

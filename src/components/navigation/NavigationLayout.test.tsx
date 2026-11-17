import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import ActiveNavigationView from "./ActiveNavigationView"
import { destinationPoint, buildPath, type LatLng } from "../../navigation/geo"
import type { MultimodalRoute, RouteSegment } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

/** The live navigation screen after UI redesign Phase 7: where things are, not what the engine does (see ActiveNavigationView.test.tsx). */

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
        transitDetails: { lineName: "356", lineColor: "#0f766e", stopCount: 2, stops: ["A", "B", "C"], waitMinutes: 8, routeNumber: "356", towards: "Electronic City", stopPoints: [0, 1000, 2000].map((n, i) => ({ name: "ABC"[i], ...pt(200, 200 + n) })) },
      }),
      seg("auto", [[200, 2200], [600, 2200]], "Home"),
    ],
  } as unknown as MultimodalRoute
}

const SPOT: GeoLocation = { name: "Start", address: "Start", latitude: ORIGIN.latitude, longitude: ORIGIN.longitude }
const HOME: GeoLocation = { name: "Home", address: "Home", ...pt(600, 2200) }

beforeEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { watchPosition: () => 1, clearWatch: () => {} } })
})
afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined })
})

const renderNav = (props: Partial<React.ComponentProps<typeof ActiveNavigationView>> = {}) =>
  render(<ActiveNavigationView route={makeRoute()} origin={SPOT} destination={HOME} onExit={() => {}} {...props} />)

describe("the instruction banner", () => {
  it("holds the arrow, the distance, the instruction, and what comes next", () => {
    renderNav()
    const banner = screen.getByRole("region", { name: "Next instruction" })
    expect(within(banner).getByTestId("guidance-icon")).toBeInTheDocument()
    expect(within(banner).getByTestId("guidance-distance")).toHaveTextContent("200 m")
    expect(within(banner).getByTestId("guidance-primary")).toHaveTextContent("Turn left")
    expect(banner).toHaveTextContent(/Then\s*bus to Stop Two/)
  })

  it("has no exit button of its own: Exit lives in the journey card", () => {
    renderNav()
    const banner = screen.getByRole("region", { name: "Next instruction" })
    expect(within(banner).queryByRole("button", { name: "Exit navigation" })).toBeNull()
    expect(within(screen.getByRole("region", { name: "Journey progress" })).getByRole("button", { name: "Exit navigation" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Exit navigation" })).toHaveLength(1)
  })

  it("is dark while travelling and turns green on arrival, with a clear arrived message and a green Done", () => {
    const onExit = vi.fn()
    renderNav({ onExit })
    const banner = screen.getByRole("region", { name: "Next instruction" })
    expect(banner.className).toContain("bg-navy-900")
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Next step" }))
    expect(banner.className).toContain("bg-go-700")
    expect(screen.getByTestId("guidance-primary")).toHaveTextContent("You have arrived")
    expect(banner).not.toHaveTextContent(/Then/) // nothing comes after arriving
    const card = screen.getByRole("region", { name: "Journey progress" })
    expect(within(card).getByText("You have arrived at Home")).toBeInTheDocument()
    const done = within(card).getByRole("button", { name: "Done" })
    expect(done.className).toContain("bg-go-600")
    fireEvent.click(done)
    expect(onExit).toHaveBeenCalled()
  })
})

describe("the journey card", () => {
  it("shows the arrival time, what is left, the step and the controls together", () => {
    renderNav()
    const card = screen.getByRole("region", { name: "Journey progress" })
    expect(within(card).getByTestId("eta-arrival")).toBeInTheDocument()
    expect(within(card).getByTestId("eta-duration")).toBeInTheDocument()
    expect(within(card).getByTestId("eta-distance")).toBeInTheDocument()
    expect(within(card).getByText("Step 1 of 3")).toBeInTheDocument()
    expect(within(card).getByRole("button", { name: "Next step" })).toBeInTheDocument()
    expect(within(card).getByRole("button", { name: /Simulate journey/ })).toBeInTheDocument()
  })

  it("keeps its buttons at least 44 px high, and says the simulation is a demo to screen readers", () => {
    renderNav()
    for (const name of ["Exit navigation", "Next step", /Simulate journey/]) {
      const b = screen.getByRole("button", { name })
      expect(b.className, String(name)).toMatch(/min-h-11|h-11|h-12/)
    }
    expect(screen.getByRole("button", { name: "Simulate journey (demo)" })).toBeInTheDocument()
  })
})

describe("the demo controls", () => {
  it("float over the map, not in the journey card, so running the demo does not shrink the map", () => {
    renderNav({ onReroute: async () => true })
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    const tray = screen.getByRole("group", { name: "Simulation controls" })
    expect(within(screen.getByRole("region", { name: "Journey progress" })).queryByRole("group", { name: "Simulation controls" })).toBeNull()
    expect(tray.className).toContain("absolute")
    expect(tray.className).toContain("bottom-3")
    expect(within(tray).getByRole("button", { name: "60×" })).toBeInTheDocument()
    expect(within(tray).getByRole("button", { name: /Go off route/ })).toBeInTheDocument()
    expect(screen.getByText(/DEMO · simulated journey/)).toBeInTheDocument()
  })

  it("tells the map to leave room for them, and goes away when the simulation stops", () => {
    const { container } = renderNav()
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    expect(container.querySelector(".nav-tray-up")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Stop simulation" }))
    expect(container.querySelector(".nav-tray-up")).toBeNull()
    expect(screen.queryByRole("group", { name: "Simulation controls" })).toBeNull()
  })
})

describe("rerouting", () => {
  it("shows a spinner in the banner and no 'Then' line while a new route is found", async () => {
    vi.useFakeTimers()
    let finish: (ok: boolean) => void = () => {}
    const onReroute = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve }))
    renderNav({ onReroute })
    fireEvent.click(screen.getByRole("button", { name: /Simulate journey/ }))
    const { act } = await import("@testing-library/react")
    for (let i = 0; i < 2; i++) act(() => { vi.advanceTimersByTime(500) })
    fireEvent.click(screen.getByRole("button", { name: /Go off route/ }))
    for (let i = 0; i < 5; i++) act(() => { vi.advanceTimersByTime(500) })
    expect(screen.getByTestId("guidance-primary")).toHaveTextContent("Rerouting…")
    expect(screen.getByRole("region", { name: "Next instruction" })).not.toHaveTextContent(/Then/)
    await act(async () => { finish(true) })
  })
})

describe("straight-line estimates are admitted, not presented as a path", () => {
  it("warns when a leg still ahead is only a straight line between its ends", () => {
    // makeRoute()'s auto leg is a two-point line of 400 m
    renderNav()
    expect(screen.getByText(/straight-line estimate, not a path to follow/)).toBeInTheDocument()
  })

  it("says nothing when every leg ahead follows streets", () => {
    const route = makeRoute()
    const auto = route.segments[2]
    auto.geometry = geom([200, 2200], [350, 2200], [450, 2230], [600, 2200])
    renderNav({ route })
    expect(screen.queryByText(/straight-line estimate/)).toBeNull()
  })
})

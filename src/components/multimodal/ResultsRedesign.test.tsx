import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RouteCard from "./RouteCard"
import SegmentTimeline from "./SegmentTimeline"
import MultimodalResults from "./MultimodalResults"
import type { MultimodalRoute } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

/** The route results after UI redesign Phase 6: Citymapper-style cards, actions under the chosen card, a vertical timeline. */

vi.mock("../../services/intelligenceService", () => ({ intelligenceService: { reportCrowd: vi.fn(), reportAccessibilityIssue: vi.fn() } }))

const line = { type: "LineString" as const, coordinates: [[77.6, 12.97], [77.61, 12.98]] as [number, number][] }
const loc = (name: string) => ({ name, latitude: 12.97, longitude: 77.6 })
const ORIGIN: GeoLocation = { name: "Whitefield", address: "Whitefield, Bengaluru", latitude: 12.9698, longitude: 77.75 }
const DESTINATION: GeoLocation = { name: "MG Road", address: "MG Road, Bengaluru", latitude: 12.9756, longitude: 77.6066 }

function makeRoute(id: string, over: Partial<MultimodalRoute> = {}): MultimodalRoute {
  return {
    id, label: "BALANCED", labelDisplay: `Option ${id}`, labelColor: "#0f766e",
    segments: [
      { id: `${id}-w`, mode: "walking", from: loc("Home"), to: loc("Whitefield Metro"), distanceMeters: 300, durationSeconds: 240, estimatedFare: 0, instruction: "Walk to Whitefield Metro", geometry: line },
      {
        id: `${id}-m`, mode: "metro", from: loc("Whitefield Metro"), to: loc("MG Road Metro"), distanceMeters: 15000, durationSeconds: 1500, estimatedFare: 40, instruction: "Take the Purple Line", geometry: line,
        transitDetails: { lineName: "Purple Line", lineColor: "#7c3aed", stopCount: 12, stops: ["Whitefield", "Hoodi", "KR Puram", "Indiranagar", "MG Road"], waitMinutes: 5, lineChanges: [{ station: "Majestic", toLine: "Green Line" }] },
      },
      { id: `${id}-a`, mode: "auto", from: loc("MG Road Metro"), to: loc("Office"), distanceMeters: 1200, durationSeconds: 420, estimatedFare: 60, instruction: "Take an auto", geometry: line },
    ],
    totalDistanceMeters: 16500, totalDurationSeconds: 2400, totalFare: 100, totalWalkingMeters: 300, transferCount: 1, modes: ["walking", "metro", "auto"], summary: "Walk → Metro → Auto", isDemoData: true,
    ...over,
  } as MultimodalRoute
}

const renderResults = (routes: MultimodalRoute[], selectedIndex = 0, extra: Partial<React.ComponentProps<typeof MultimodalResults>> = {}) =>
  render(<MultimodalResults routes={routes} selectedIndex={selectedIndex} onSelectRoute={() => {}} origin={ORIGIN} destination={DESTINATION} {...extra} />)

describe("RouteCard", () => {
  it("leads with how long it takes, and says when you arrive only once a departure time is known", () => {
    const { rerender } = render(<RouteCard route={makeRoute("a")} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText("40 min")).toBeInTheDocument()
    expect(screen.queryByText(/Arrive by/)).toBeNull() // no departure time chosen: nothing is invented
    rerender(<RouteCard route={makeRoute("a", { departureAt: "2026-11-17T08:30:00" })} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText("Arrive by 9:10 AM")).toBeInTheDocument()
  })

  it("names each leg in a strip: the metro line by name with its colour as a dot, the auto and the walk by name", () => {
    const { container } = render(<RouteCard route={makeRoute("a")} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText("Walk")).toBeInTheDocument()
    expect(screen.getByText("Auto")).toBeInTheDocument()
    const metro = screen.getByText("Purple Line")
    expect(metro.className).toContain("text-navy-900") // dark text: the line colour is only the dot
    const dot = metro.querySelector("span[aria-hidden='true']") as HTMLElement
    expect(dot.style.backgroundColor).toBe("rgb(124, 58, 237)")
    expect(container.querySelectorAll("svg[data-mode-icon]").length).toBeGreaterThan(0)
  })

  it("draws the journey bar in the colours the map uses: a metro leg in its own line colour, an auto in yellow", () => {
    render(<RouteCard route={makeRoute("a")} selected={false} onSelect={() => {}} index={0} />)
    expect((screen.getByTitle("Metro · 25 min") as HTMLElement).style.backgroundColor).toBe("rgb(124, 58, 237)")
    expect((screen.getByTitle("Auto · 7 min") as HTMLElement).style.backgroundColor).toBe("rgb(224, 165, 0)")
    expect((screen.getByTitle("Walk · 4 min") as HTMLElement).style.backgroundColor).toBe("rgb(148, 163, 184)")
  })

  it("says whether it is the chosen option, to everyone", () => {
    const { rerender } = render(<RouteCard route={makeRoute("a")} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByRole("button", { name: /Route 1/ })).toHaveAttribute("aria-pressed", "false")
    expect(screen.queryByText("Selected")).toBeNull()
    rerender(<RouteCard route={makeRoute("a")} selected onSelect={() => {}} index={0} />)
    expect(screen.getByRole("button", { name: /Route 1/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Selected")).toBeInTheDocument()
  })

  it("shows the reasons as words: a leading emoji in the backend's text is left out, and the words are not changed", () => {
    const route = makeRoute("a", { whyRecommended: ["🎯 Recommended for high schedule reliability", "Fastest travel time among options"] })
    render(<RouteCard route={route} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText("Recommended for high schedule reliability")).toBeInTheDocument()
    expect(screen.getByText("Fastest travel time among options")).toBeInTheDocument()
    expect(screen.queryByText(/🎯/)).toBeNull()
  })

  it("marks the best option with a star beside its label", () => {
    const best = makeRoute("a", { labelDisplay: "Best for you", profileFit: { profile: "senior", rank: 1, isBest: true, headline: "h", reasons: [], tips: [] } })
    const { container, rerender } = render(<RouteCard route={best} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText("Best for you").querySelector("svg")).not.toBeNull()
    rerender(<RouteCard route={makeRoute("b", { labelDisplay: "Also suitable" })} selected={false} onSelect={() => {}} index={1} />)
    expect(screen.getByText("Also suitable").querySelector("svg")).toBeNull()
    expect(container).toBeTruthy()
  })
})

describe("the chosen route's actions", () => {
  it("offers Start Journey (the one green button), Save Route and Save Journey, once each", () => {
    renderResults([makeRoute("a")], 0, { onStartNavigation: () => {}, onSaveRoute: async () => {}, onSaveJourney: async () => {} })
    expect(screen.getAllByRole("button", { name: "Start Journey" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Save Route" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Save Journey" })).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Start Journey" }).className).toContain("bg-go-600")
  })

  it("sit directly under the chosen card, and move when another option is chosen", () => {
    const routes = [makeRoute("a"), makeRoute("b"), makeRoute("c")]
    const { rerender } = renderResults(routes, 0, { onStartNavigation: () => {} })
    const cardOf = (n: number) => screen.getByText(`Route ${n}`).closest("button")!
    const start = () => screen.getByRole("button", { name: "Start Journey" })
    const after = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(after(cardOf(1), start())).toBe(true)
    expect(after(start(), cardOf(2))).toBe(true)
    rerender(<MultimodalResults routes={routes} selectedIndex={2} onSelectRoute={() => {}} origin={ORIGIN} destination={DESTINATION} onStartNavigation={() => {}} />)
    expect(screen.getAllByRole("button", { name: "Start Journey" })).toHaveLength(1)
    expect(after(cardOf(2), start())).toBe(true)
    expect(after(cardOf(3), start())).toBe(true)
  })

  it("act on the route that is chosen", async () => {
    const user = userEvent.setup()
    const routes = [makeRoute("a"), makeRoute("b")]
    const onStartNavigation = vi.fn()
    const onSaveJourney = vi.fn().mockResolvedValue(undefined)
    const onSaveRoute = vi.fn().mockResolvedValue(undefined)
    renderResults(routes, 1, { onStartNavigation, onSaveJourney, onSaveRoute })
    await user.click(screen.getByRole("button", { name: "Start Journey" }))
    expect(onStartNavigation).toHaveBeenCalledWith(routes[1])
    await user.click(screen.getByRole("button", { name: "Save Journey" }))
    expect(onSaveJourney).toHaveBeenCalledWith(routes[1])
    await user.click(screen.getByRole("button", { name: "Save Route" }))
    expect(onSaveRoute).toHaveBeenCalledWith(routes[1])
  })

  it("show the outcome of a save in words, polite for success", () => {
    renderResults([makeRoute("a")], 0, { onSaveJourney: async () => {}, saveStatus: "saved", saveMessage: "Journey saved to your history." })
    expect(screen.getByText("Journey saved to your history.")).toHaveAttribute("role", "status")
  })

  it("are left out when the page gives no handlers", () => {
    renderResults([makeRoute("a")])
    expect(screen.queryByRole("button", { name: "Start Journey" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Save Journey" })).toBeNull()
  })
})

describe("the results page", () => {
  it("says where from and to, and that the data is a demonstration", () => {
    renderResults([makeRoute("a")])
    expect(screen.getByText("Whitefield")).toBeInTheDocument()
    expect(screen.getByText("MG Road")).toBeInTheDocument()
    expect(screen.getByText("Demo data")).toBeInTheDocument()
  })

  it("puts the options, then the step-by-step journey, ahead of the detail panels", () => {
    renderResults([makeRoute("a")])
    const after = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    const card = screen.getByText("Route 1").closest("button")!
    const steps = screen.getByRole("button", { name: /Step-by-step journey/ })
    expect(after(card, steps)).toBe(true)
    expect(after(steps, screen.getByText("Arrival Confidence Interval"))).toBe(true)
    expect(after(steps, screen.getByText("Weather Context"))).toBe(true)
  })

  it("stacks its information panels in one column, so they fit the narrow journey panel", () => {
    const { container } = renderResults([makeRoute("a")])
    const grids = Array.from(container.querySelectorAll("div.grid"))
    expect(grids.length).toBeGreaterThan(0)
    for (const g of grids) {
      if (g.getAttribute("role") === "group") continue // the three crowd-report buttons sit side by side on purpose
      expect(g.className, g.className).not.toMatch(/\b(sm|md|lg):grid-cols-/)
    }
  })
})

describe("the step-by-step timeline", () => {
  const route = makeRoute("a", {
    segments: [
      { id: "w", mode: "walking", from: loc("Home"), to: loc("Silk Board Bus Stop"), distanceMeters: 300, durationSeconds: 240, estimatedFare: 0, instruction: "Walk to Silk Board Bus Stop", geometry: line },
      {
        id: "b", mode: "bus", from: loc("Silk Board Bus Stop"), to: loc("Kempegowda Bus Station"), distanceMeters: 11000, durationSeconds: 3000, estimatedFare: 25, instruction: "Take 356", geometry: line,
        transitDetails: { lineName: "356 — Kempegowda ↔ Electronic City", lineColor: "#0f766e", stopCount: 6, stops: ["a", "b", "c", "d", "e", "f", "g"], waitMinutes: 8, routeNumber: "356", towards: "Kempegowda Bus Station", estimatedBoardingTime: "8:36 AM", upcomingBoardingTimes: ["8:41 AM"], estimatedArrivalTime: "9:17 AM" },
      },
      makeRoute("x").segments[1],
    ],
  })

  async function open() {
    const view = render(<SegmentTimeline route={route} />)
    await userEvent.click(screen.getByRole("button", { name: /Step-by-step journey/ }))
    return view
  }

  it("starts folded, says it is open or closed, and shows the demo note when opened", async () => {
    render(<SegmentTimeline route={route} />)
    const toggle = screen.getByRole("button", { name: /Step-by-step journey/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("list")).toBeNull()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText(/Demo transit data/)).toBeInTheDocument()
  })

  it("is an ordered list with one step per leg", async () => {
    const { container } = await open()
    // The timeline's own list: the first <ol>. (The stops of a leg are lists too, nested inside it.)
    const timeline = container.querySelector("ol")!
    const steps = Array.from(timeline.children).filter((el) => el.tagName === "LI")
    expect(steps).toHaveLength(route.segments.length)
    expect(within(steps[0] as HTMLElement).getByText("Walk to Silk Board Bus Stop")).toBeInTheDocument()
    expect(within(steps[1] as HTMLElement).getByText("Bus number 356")).toBeInTheDocument()
  })

  it("a bus leg shows its number (read out), direction, boarding times and arrival", async () => {
    await open()
    expect(screen.getByText("Bus number 356")).toBeInTheDocument()
    expect(screen.getByText("Towards Kempegowda Bus Station")).toBeInTheDocument()
    expect(screen.getByText(/Board by ~8:36 AM · next: ~8:41 AM/)).toBeInTheDocument()
    expect(screen.getByText(/after 6 stops · arrives ~9:17 AM/)).toBeInTheDocument()
  })

  it("keeps the stops folded until asked, and says where to change line", async () => {
    await open()
    const stops = screen.getByText("All 7 stops").closest("details")!
    expect(stops.open).toBe(false)
    expect(screen.getByText("Change to the Green Line at Majestic")).toBeInTheDocument()
  })

  it("never puts white text on a line's own colour: no filled row carries text", async () => {
    const { container } = await open()
    const filledWithText = Array.from(container.querySelectorAll<HTMLElement>("[style]")).filter((el) => el.style.backgroundColor && el.textContent?.trim())
    expect(filledWithText).toHaveLength(0)
  })
})

describe("Approximate path label", () => {
  it("is shown on a long walk drawn as a straight line, and not on one that follows streets", async () => {
    const { isStraightLineEstimate } = await import("../../utils/pathQuality")
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 900, geometry: { coordinates: [[0, 0], [1, 1]] } })).toBe(true)
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 900, geometry: { coordinates: [[0, 0], [0.5, 0.2], [1, 1]] } })).toBe(false)
  })
})

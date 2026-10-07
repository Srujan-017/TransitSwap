import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MultimodalResults from "./MultimodalResults"
import type { MultimodalRoute } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

/**
 * Phase 10 — component tests for MultimodalResults.
 *
 * The first test specifically regression-tests Phase 4 bug B7: a `useMemo`
 * used to run AFTER `if (!selected) return null`, a Rules-of-Hooks
 * violation that throws "Rendered fewer hooks than expected" the moment a
 * render transitions between an empty and a non-empty route list. Both
 * hooks now sit above the early return, so rendering with 0 routes must
 * simply render nothing — never throw.
 */

vi.mock("../../services/intelligenceService", () => ({
  intelligenceService: {
    reportCrowd: vi.fn(),
    reportAccessibilityIssue: vi.fn(),
  },
}))

const ORIGIN: GeoLocation = { name: "Whitefield Metro", address: "Whitefield Metro, Bengaluru", latitude: 12.9698, longitude: 77.75 }
const DESTINATION: GeoLocation = { name: "Baiyappanahalli Metro", address: "Baiyappanahalli Metro, Bengaluru", latitude: 12.9906, longitude: 77.653 }

function makeRoute(id: string, label: string, durationSeconds: number, fare: number): MultimodalRoute {
  return {
    id,
    label: "FASTEST",
    labelDisplay: label,
    labelColor: "#2563eb",
    segments: [
      {
        id: `${id}-seg-1`,
        mode: "metro",
        from: { name: ORIGIN.name, latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
        to: { name: DESTINATION.name, latitude: DESTINATION.latitude, longitude: DESTINATION.longitude },
        distanceMeters: 8000,
        durationSeconds,
        estimatedFare: fare,
        instruction: "Take Metro",
        geometry: { type: "LineString", coordinates: [[77.75, 12.9698], [77.653, 12.9906]] },
      },
    ],
    totalDistanceMeters: 8000,
    totalDurationSeconds: durationSeconds,
    totalFare: fare,
    totalWalkingMeters: 100,
    transferCount: 0,
    modes: ["metro"],
    summary: `Test route ${id}`,
    isDemoData: true,
  }
}

describe("MultimodalResults", () => {
  it("Phase 4 bug B7 regression — renders nothing (not a crash) when there are no routes", () => {
    const { container } = render(
      <MultimodalResults
        routes={[]}
        selectedIndex={0}
        onSelectRoute={() => {}}
        origin={ORIGIN}
        destination={DESTINATION}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the selected route's duration, fare and label when 1 route is given", () => {
    const route = makeRoute("r1", "Fastest", 1800, 25)
    render(
      <MultimodalResults
        routes={[route]}
        selectedIndex={0}
        onSelectRoute={() => {}}
        origin={ORIGIN}
        destination={DESTINATION}
      />,
    )
    expect(screen.getByText("Fastest")).toBeInTheDocument()
    expect(screen.getByText("Route 1")).toBeInTheDocument()
  })

  it("calls onSelectRoute with the clicked route's index when a second route card is clicked", async () => {
    const routeA = makeRoute("r1", "Fastest", 1800, 25)
    const routeB = makeRoute("r2", "Cheapest", 2400, 15)
    const onSelectRoute = vi.fn()
    const user = userEvent.setup()

    render(
      <MultimodalResults
        routes={[routeA, routeB]}
        selectedIndex={0}
        onSelectRoute={onSelectRoute}
        origin={ORIGIN}
        destination={DESTINATION}
      />,
    )

    const secondCard = screen.getByText("Route 2").closest("button")!
    await user.click(secondCard)

    expect(onSelectRoute).toHaveBeenCalledWith(1)
  })

  it("renders nothing when selectedIndex points past the end of the routes array (defensive)", () => {
    const route = makeRoute("r1", "Fastest", 1800, 25)
    const { container } = render(
      <MultimodalResults
        routes={[route]}
        selectedIndex={5}
        onSelectRoute={() => {}}
        origin={ORIGIN}
        destination={DESTINATION}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

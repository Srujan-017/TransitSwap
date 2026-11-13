import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MultimodalResults from "./MultimodalResults"
import ExcludedRoutes from "./ExcludedRoutes"
import type { MultimodalRoute, ProfileFit } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

/**
 * Feature-upgrade phase 3 — accessibility profiles get ONE best route up front with the reasons it
 * suits them, the other suitable options tucked away, and exclusions that include the new reason types.
 */

vi.mock("../../services/intelligenceService", () => ({
  intelligenceService: { reportCrowd: vi.fn(), reportAccessibilityIssue: vi.fn() },
}))

const ORIGIN: GeoLocation = { name: "Hoodi", address: "Hoodi, Bengaluru", latitude: 12.987, longitude: 77.7089 }
const DESTINATION: GeoLocation = { name: "MG Road", address: "MG Road, Bengaluru", latitude: 12.9763, longitude: 77.6079 }

function fit(rank: number, reasons: string[], tips: string[] = []): ProfileFit {
  return { profile: "wheelchair", rank, isBest: rank === 1, headline: rank === 1 ? "Best for a wheelchair user" : `Also suitable (option ${rank})`, reasons, tips }
}

function makeRoute(id: string, rank: number, fitInfo?: ProfileFit): MultimodalRoute {
  return {
    id,
    label: "BALANCED",
    labelDisplay: rank === 1 ? "Best for you" : "Also suitable",
    labelColor: "#0f766e",
    segments: [{
      id: `${id}-s1`, mode: "auto",
      from: { name: ORIGIN.name, latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
      to: { name: DESTINATION.name, latitude: DESTINATION.latitude, longitude: DESTINATION.longitude },
      distanceMeters: 9000, durationSeconds: 1500 + rank * 300, estimatedFare: 200 - rank * 20,
      instruction: "Take an auto / accessible cab", geometry: { type: "LineString", coordinates: [[77.7089, 12.987], [77.6079, 12.9763]] },
    }],
    totalDistanceMeters: 9000, totalDurationSeconds: 1500 + rank * 300, totalFare: 200 - rank * 20, totalWalkingMeters: 0,
    transferCount: 0, modes: ["auto"], summary: `Option ${rank}`, isDemoData: true,
    ...(fitInfo ? { profileFit: fitInfo } : {}),
  } as MultimodalRoute
}

const renderResults = (routes: MultimodalRoute[], selectedIndex = 0, onSelect = () => {}) =>
  render(<MultimodalResults routes={routes} selectedIndex={selectedIndex} onSelectRoute={onSelect} origin={ORIGIN} destination={DESTINATION} />)

describe("Best for you", () => {
  it("shows why the selected route suits the rider, with its tips", () => {
    const routes = [makeRoute("a", 1, fit(1, ["No walking: autos cover the first and last mile.", "No bus on this route."], ["Confirm the cab takes a wheelchair."]))]
    renderResults(routes)
    const card = screen.getByRole("region", { name: "Why this route suits you" })
    expect(within(card).getByText("Best for a wheelchair user")).toBeInTheDocument()
    expect(within(card).getByText("No walking: autos cover the first and last mile.")).toBeInTheDocument()
    expect(within(card).getByText(/Tip: Confirm the cab takes a wheelchair/)).toBeInTheDocument()
  })

  it("replaces the generic 'why recommended' box for accessibility profiles", () => {
    const route = { ...makeRoute("a", 1, fit(1, ["reason"])), whyRecommended: ["Generic reason"] } as MultimodalRoute
    renderResults([route])
    expect(screen.queryByText("Why TransitSwap Recommends This Route")).toBeNull()
  })

  it("keeps the generic box for profiles without a fit", () => {
    const route = { ...makeRoute("a", 1), whyRecommended: ["Generic reason"] } as MultimodalRoute
    renderResults([route])
    expect(screen.getByText("Why TransitSwap Recommends This Route")).toBeInTheDocument()
  })

  it("tucks the other suitable options behind a toggle, best route first", async () => {
    const onSelect = vi.fn()
    const routes = [makeRoute("a", 1, fit(1, ["r1"])), makeRoute("b", 2, fit(2, ["r2"])), makeRoute("c", 3, fit(3, ["r3"]))]
    renderResults(routes, 0, onSelect)
    expect(screen.getByText("Show other suitable options (2)")).toBeInTheDocument()
    expect(screen.queryByText("Candidate Journeys Ranked by Preference")).toBeNull()
    await userEvent.click(screen.getByText("Show other suitable options (2)"))
    expect(screen.getAllByText("Also suitable").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("Best for you").length).toBeGreaterThanOrEqual(1)
  })

  it("keeps the ranked list for profiles without a fit", () => {
    renderResults([makeRoute("a", 1), makeRoute("b", 2)])
    expect(screen.getByText("Candidate Journeys Ranked by Preference")).toBeInTheDocument()
    expect(screen.queryByText(/Show other suitable options/)).toBeNull()
  })
})

describe("ExcludedRoutes new reason types", () => {
  it("labels mode and service-hours exclusions", () => {
    render(
      <ExcludedRoutes
        profileLabel="Pregnant"
        variant="some-left"
        routes={[
          { summary: "Hoodi → MG Road (bus)", durationMinutes: 40, walkingMeters: 200, reasonType: "mode", reason: "Buses are avoided for this profile." },
          { summary: "Hoodi → MG Road (metro)", durationMinutes: 30, walkingMeters: 0, reasonType: "service_hours", reason: "The metro is not running at that time." },
        ]}
      />,
    )
    expect(screen.getByText("Not suitable for you")).toBeInTheDocument()
    expect(screen.getByText("Not running then")).toBeInTheDocument()
  })
})

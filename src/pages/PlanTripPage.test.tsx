import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import PlanTripPage from "./PlanTripPage"
import { AuthProvider } from "../context/AuthContext"

/**
 * Phase 10 — component tests for PlanTripPage.
 *
 * This is the richest, most API-heavy screen in the app (geocoding, road
 * routing, multimodal routing, saved routes — see PROJECT_MASTER_PLAN.md
 * §9), so these tests deliberately stay at the rendering/validation level
 * rather than driving a full real search (which would require mocking
 * LocationSearch's internal geocoding calls too). They verify the page
 * mounts cleanly, the profile selector works, and the documented
 * client-side validation in handleSearch's validate() actually fires.
 */

vi.mock("../services/multimodalService", () => ({
  multimodalService: { getRoutes: vi.fn(), getNearbyTransit: vi.fn() },
}))
vi.mock("../services/routingService", () => ({
  routingService: { getRoute: vi.fn() },
}))
vi.mock("../services/tripService", () => ({
  tripService: {
    saveTrip: vi.fn(),
    saveDestination: vi.fn(),
    getSavedRoutes: vi.fn().mockResolvedValue([]),
    saveRoute: vi.fn(),
  },
}))

function renderPlanTripPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PlanTripPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe("PlanTripPage", () => {
  it("renders the trip-planning form without crashing", () => {
    renderPlanTripPage()
    expect(screen.getByText("Plan Your Journey")).toBeInTheDocument()
    expect(screen.getByText("Origin")).toBeInTheDocument()
    expect(screen.getByText("Destination")).toBeInTheDocument()
  })

  it("defaults to the Standard accessibility profile and lets the user switch it", async () => {
    const user = userEvent.setup()
    renderPlanTripPage()

    const wheelchairButton = screen.getByText("Wheelchair").closest("button")!
    await user.click(wheelchairButton)

    expect(wheelchairButton.className).toContain("bg-brand-500")
  })

  it("offers the demo weather options, defaulting to live weather", async () => {
    const user = userEvent.setup()
    renderPlanTripPage()

    const group = screen.getByRole("group", { name: /Weather/ })
    const live = screen.getByRole("button", { name: "Live weather" })
    expect(live).toHaveAttribute("aria-pressed", "true")
    for (const label of ["Clear", "Rain", "Heavy rain", "Heat"]) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false")
    }
    expect(group).toHaveTextContent("Uses the real weather")

    await user.click(screen.getByRole("button", { name: "Rain" }))
    expect(screen.getByRole("button", { name: "Rain" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Live weather" })).toHaveAttribute("aria-pressed", "false")
    expect(group).toHaveTextContent("walks over 300 m become autos")
  })

  it("shows the documented validation message instead of searching when no origin/destination is set", async () => {
    const user = userEvent.setup()
    renderPlanTripPage()

    const submitButton = screen.getByRole("button", { name: /Find Routes/i })
    await user.click(submitButton)

    expect(await screen.findByText("Please select an origin location.")).toBeInTheDocument()
  })
})

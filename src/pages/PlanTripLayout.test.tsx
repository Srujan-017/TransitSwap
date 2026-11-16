import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import PlanTripPage from "./PlanTripPage"
import { AuthProvider } from "../context/AuthContext"

/**
 * UI redesign Phase 5: the map-first layout and the new search card. These check the structure and the behaviour of the
 * pieces; the journey search itself (and its validation) is covered in PlanTripPage.test.tsx.
 */

vi.mock("../services/multimodalService", () => ({ multimodalService: { getRoutes: vi.fn(), getNearbyTransit: vi.fn() } }))
vi.mock("../services/routingService", () => ({ routingService: { getRoute: vi.fn() } }))
vi.mock("../services/tripService", () => ({
  tripService: { saveTrip: vi.fn(), saveDestination: vi.fn(), getSavedRoutes: vi.fn().mockResolvedValue([]), saveRoute: vi.fn() },
}))
// The place search is answered locally, so a carried-over Landing search never reaches the network.
vi.mock("../services/mapService", () => ({ mapService: { search: vi.fn().mockResolvedValue([]), reverse: vi.fn() } }))

function renderPage() {
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
  window.sessionStorage.clear()
})

describe("layout", () => {
  it("is a journey panel and a map, side by side on a desktop and one over the other on a phone", () => {
    const { container } = renderPage()
    const panel = screen.getByRole("complementary", { name: "Journey planner" })
    const map = screen.getByRole("region", { name: "Map" })
    expect(panel).toBeInTheDocument()
    expect(map).toBeInTheDocument()
    // One element each: the labels exist once, never once for a desktop and again for a phone.
    expect(screen.getAllByText("Origin")).toHaveLength(1)
    expect(screen.getAllByText("Destination")).toHaveLength(1)
    expect(container.firstElementChild!.className).toContain("lg:grid")
    expect(map.className).toContain("absolute inset-0")
    expect(map.className).toContain("lg:relative")
    // The panel comes first in the page, so a keyboard user meets the controls before the map.
    expect(panel.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("has one h1 and routing modes that can be switched", async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole("heading", { level: 1, name: "Plan Your Journey" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Multimodal" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Demo options/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Find Routes" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Road Routing" }))
    expect(screen.getByRole("button", { name: "Road Routing" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: /Demo options/ })).toBeNull() // weather is a multimodal-only option
    expect(screen.getByRole("button", { name: "Get Directions" })).toBeInTheDocument()
  })

  it("labels the place fields for screen readers and keeps the placeholders the end-to-end test uses", () => {
    renderPage()
    expect(screen.getByLabelText("Origin")).toHaveAttribute("placeholder", "Search start location…")
    expect(screen.getByLabelText("Destination")).toHaveAttribute("placeholder", "Search destination…")
    expect(screen.getByRole("button", { name: "Swap origin and destination" })).toBeDisabled() // nothing to swap yet
    expect(screen.getByRole("button", { name: "Use my current location" })).toBeInTheDocument()
  })
})

describe("the panel's height on a phone", () => {
  it("starts half open, and the handle moves it", async () => {
    const user = userEvent.setup()
    renderPage()
    const panel = screen.getByRole("complementary", { name: "Journey planner" })
    expect(panel).toHaveAttribute("data-snap", "half")
    await user.click(screen.getByRole("button", { name: "Expand the journey panel" }))
    expect(panel).toHaveAttribute("data-snap", "full")
    await user.click(screen.getByRole("button", { name: "Collapse the journey panel" }))
    expect(panel).toHaveAttribute("data-snap", "peek")
  })

  it("opens out to half when someone starts using the form, so suggestions have room", async () => {
    const user = userEvent.setup()
    renderPage()
    const panel = screen.getByRole("complementary", { name: "Journey planner" })
    await user.click(screen.getByRole("button", { name: "Expand the journey panel" }))
    await user.click(screen.getByRole("button", { name: "Collapse the journey panel" }))
    expect(panel).toHaveAttribute("data-snap", "peek")
    await user.click(screen.getByLabelText("Destination"))
    expect(panel).toHaveAttribute("data-snap", "half")
  })

  it("never closes itself when the form is used while it is fully open", async () => {
    const user = userEvent.setup()
    renderPage()
    const panel = screen.getByRole("complementary", { name: "Journey planner" })
    await user.click(screen.getByRole("button", { name: "Expand the journey panel" }))
    await user.click(screen.getByLabelText("Destination"))
    expect(panel).toHaveAttribute("data-snap", "full")
  })
})

describe("the search card", () => {
  it("departs now by default, and Depart at reveals the date and time", async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole("button", { name: "Leave now" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByLabelText("Date")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Depart at" }))
    expect(screen.getByLabelText("Date")).toBeInTheDocument()
    expect(screen.getByLabelText("Time")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Leave now" }))
    expect(screen.queryByLabelText("Time")).toBeNull()
  })

  it("lets a profile that is not in the row be chosen from More, and shows it in the row afterwards", async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.queryByRole("button", { name: "Fastest" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "More" }))
    await user.click(within(screen.getByRole("dialog", { name: "Travel profile" })).getByRole("button", { name: /Fastest/ }))
    expect(screen.queryByRole("dialog")).toBeNull()
    const chip = screen.getByRole("button", { name: "Fastest" })
    expect(chip).toHaveAttribute("aria-pressed", "true")
    expect(chip.className).toContain("bg-brand-500")
  })

  it("keeps the active travel preferences and the Edit Preferences button", () => {
    renderPage()
    expect(screen.getByText("Your Active Travel Preferences")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Edit Preferences/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument() // Save Destination
    expect(screen.getByLabelText("Save Destination")).toBeInTheDocument()
  })

  it("keeps Find Routes in a bar stuck to the bottom of the panel, so it is reachable in a half-open sheet", () => {
    renderPage()
    const bar = screen.getByRole("button", { name: "Find Routes" }).closest("div.sticky")
    expect(bar).not.toBeNull()
    expect(bar!.className).toContain("bottom-0")
    // It sits right after the profile choice, ahead of the demo options and the preferences summary.
    const group = screen.getByRole("group", { name: "Accessibility Profile" })
    expect(group.compareDocumentPosition(bar!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(bar!.compareDocumentPosition(screen.getByRole("button", { name: /Demo options/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows the empty state before anything is chosen", () => {
    renderPage()
    expect(screen.getByText("Discover multimodal routes")).toBeInTheDocument()
  })
})

describe("the Landing page hand-off", () => {
  it("pre-fills the profile and the search text, then clears what it carried", () => {
    window.sessionStorage.setItem("ts_landing_search", JSON.stringify({ origin: "Whitefield", destination: "MG Road", profile: "wheelchair" }))
    renderPage()
    expect(screen.getByRole("button", { name: "Wheelchair" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByLabelText("Origin")).toHaveValue("Whitefield")
    expect(screen.getByLabelText("Destination")).toHaveValue("MG Road")
    expect(window.sessionStorage.getItem("ts_landing_search")).toBeNull()
  })
})

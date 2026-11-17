import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import DashboardPage from "./DashboardPage"
import HistoryPage from "./HistoryPage"
import SavedRoutesPage from "./SavedRoutesPage"
import { AuthProvider } from "../context/AuthContext"
import { tripService, type JourneyRecord, type SavedRouteRecord, type SavedDestinationRecord } from "../services/tripService"
import { intelligenceService } from "../services/intelligenceService"

/**
 * UI redesign Phase 8: Dashboard, History and Saved Routes. What the pages show and which controls they keep, not the
 * data services (those are mocked).
 */

vi.mock("../services/tripService", async () => {
  const actual = await vi.importActual<typeof import("../services/tripService")>("../services/tripService")
  return {
    ...actual,
    tripService: {
      getHistory: vi.fn(),
      getDestinations: vi.fn(),
      getSavedRoutes: vi.fn(),
      deleteJourney: vi.fn(),
      deleteDestination: vi.fn(),
      deleteSavedRoute: vi.fn(),
    },
  }
})
vi.mock("../services/intelligenceService", () => ({
  intelligenceService: { submitJourneyFeedback: vi.fn() },
}))

const place = (name: string) => ({ name, address: name, latitude: 12.97, longitude: 77.59 })
const today = new Date().toISOString()

function journey(id: string, extra: Partial<JourneyRecord> = {}): JourneyRecord {
  return {
    _id: id,
    origin: place("Indiranagar"),
    destination: place("Majestic"),
    selectedRoute: { crowd: { level: "LOW" } },
    routeSegments: [
      { id: "s1", mode: "walking", instruction: "Walk to the station", from: place("Indiranagar"), to: place("Indiranagar Metro"), distanceMeters: 300, durationSeconds: 240 },
    ],
    transportModes: ["walking", "metro"],
    totalDistanceMeters: 8000,
    totalDurationSeconds: 1800,
    estimatedFare: 30,
    walkingDistanceMeters: 300,
    transferCount: 0,
    routeSummary: "Walk then Purple Line",
    status: "planned",
    createdAt: today,
    updatedAt: today,
    ...extra,
  } as unknown as JourneyRecord
}

const savedRoute: SavedRouteRecord = {
  _id: "r1",
  name: "Work commute",
  origin: place("Home"),
  destination: place("Office"),
  transportModes: ["bus", "metro"],
  totalDistanceMeters: 9000,
  totalDurationSeconds: 2400,
  totalFare: 45,
  walkingDistanceMeters: 500,
  transferCount: 1,
  sustainabilityScore: 82,
  createdAt: today,
  updatedAt: today,
} as unknown as SavedRouteRecord

const destination: SavedDestinationRecord = { _id: "d1", name: "Cubbon Park", address: "Kasturba Road", latitude: 12.97, longitude: 77.59, createdAt: today }

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname}|{JSON.stringify(loc.state)}</div>
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/plan" element={<LocationProbe />} />
          <Route path="*" element={<div />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  vi.mocked(tripService.getHistory).mockResolvedValue([])
  vi.mocked(tripService.getDestinations).mockResolvedValue([])
  vi.mocked(tripService.getSavedRoutes).mockResolvedValue([])
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("Saved Routes", () => {
  it("shows a card per route with its modes, a delete button named for it, and Use Route", async () => {
    vi.mocked(tripService.getSavedRoutes).mockResolvedValue([savedRoute])
    renderAt("/saved-routes", <SavedRoutesPage />)
    expect(await screen.findByRole("heading", { name: "Work commute" })).toBeInTheDocument()
    expect(screen.getByText("Metro")).toBeInTheDocument()
    expect(screen.getByText("Bus")).toBeInTheDocument()
    expect(screen.getByTestId("mode-strip").children).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Delete saved route Work commute" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Use Route/ })).toBeInTheDocument()
  })

  it("shows the origin and destination under a custom name, but not under the default 'A → B' name that already says it", async () => {
    vi.mocked(tripService.getSavedRoutes).mockResolvedValue([
      savedRoute,
      { ...savedRoute, _id: "r2", name: "Home → Office" } as SavedRouteRecord,
    ])
    renderAt("/saved-routes", <SavedRoutesPage />)
    await screen.findByRole("heading", { name: "Work commute" })
    const custom = screen.getByRole("heading", { name: "Work commute" }).closest("li")!
    const generated = screen.getByRole("heading", { name: "Home → Office" }).closest("li")!
    expect(within(custom).getByText("Home")).toBeInTheDocument()
    expect(within(custom).getByText("Office")).toBeInTheDocument()
    expect(within(generated).queryByText("Home")).toBeNull()
  })

  it("Use Route opens Plan Trip with the saved origin and destination", async () => {
    vi.mocked(tripService.getSavedRoutes).mockResolvedValue([savedRoute])
    renderAt("/saved-routes", <SavedRoutesPage />)
    await userEvent.click(await screen.findByRole("button", { name: /Use Route/ }))
    const where = await screen.findByTestId("where")
    expect(where).toHaveTextContent("/plan")
    expect(where.textContent).toContain("useRouteOrigin")
    expect(where.textContent).toContain("Home")
    expect(where.textContent).toContain("Office")
  })

  it("asks before deleting, and removes the card once it is deleted", async () => {
    vi.mocked(tripService.getSavedRoutes).mockResolvedValue([savedRoute])
    vi.mocked(tripService.deleteSavedRoute).mockResolvedValue(undefined as never)
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    renderAt("/saved-routes", <SavedRoutesPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Delete saved route Work commute" }))
    expect(confirm).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Work commute" })).toBeNull())
    expect(screen.getByText("Saved route deleted.")).toBeInTheDocument()
  })

  it("does not delete when the user cancels", async () => {
    vi.mocked(tripService.getSavedRoutes).mockResolvedValue([savedRoute])
    vi.spyOn(window, "confirm").mockReturnValue(false)
    renderAt("/saved-routes", <SavedRoutesPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Delete saved route Work commute" }))
    expect(tripService.deleteSavedRoute).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Work commute" })).toBeInTheDocument()
  })

  it("the empty state keeps its words, adds a photo and a way forward", async () => {
    renderAt("/saved-routes", <SavedRoutesPage />)
    expect(await screen.findByText("No saved routes yet.")).toBeInTheDocument()
    expect(screen.getByText("Save a route from Plan Trip to see it here.")).toBeInTheDocument()
    expect(document.querySelector("img")).not.toBeNull()
    expect(screen.getAllByRole("link", { name: /Plan a trip/ }).length).toBeGreaterThan(0)
  })

  it("shows the error and a Try again button when loading fails", async () => {
    vi.mocked(tripService.getSavedRoutes).mockRejectedValue(new Error("Server is down"))
    renderAt("/saved-routes", <SavedRoutesPage />)
    expect(await screen.findByText("Could not load saved routes")).toBeInTheDocument()
    expect(screen.getByText("Server is down")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})

describe("History", () => {
  it("groups journeys under Today and Yesterday headings", async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a"), journey("b", { createdAt: yesterday })])
    renderAt("/history", <HistoryPage />)
    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeInTheDocument()
    expect(screen.getAllByTitle("Open journey details")).toHaveLength(2)
  })

  it("shows the four totals and the mode chips with icons rather than two-letter codes", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    vi.mocked(tripService.getDestinations).mockResolvedValue([destination])
    renderAt("/history", <HistoryPage />)
    await screen.findByTitle("Open journey details")
    for (const label of ["Saved trips", "Total spent", "Total travel time", "Saved places"]) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText("Metro")).toBeInTheDocument()
    expect(screen.getByText("Walking")).toBeInTheDocument()
    expect(screen.queryByText("wa")).toBeNull()
    expect(screen.getByText("Awaiting feedback")).toBeInTheDocument()
  })

  it("opens the details with the segments and the rating group; the toggle says it is expanded", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    renderAt("/history", <HistoryPage />)
    const toggle = await screen.findByTitle("Open journey details")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(toggle)
    expect(screen.getByRole("button", { name: "Collapse journey details" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Walk to the station")).toBeInTheDocument()
    const group = screen.getByRole("group", { name: "Journey rating" })
    expect(within(group).getAllByRole("button")).toHaveLength(5)
    expect(within(group).getByRole("button", { name: "5 out of 5 stars" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Submit Feedback" })).toBeInTheDocument()
    expect(screen.getByLabelText("Actual journey duration (optional)")).toBeInTheDocument()
  })

  it("rating buttons and the star hit areas are at least 44 px", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    renderAt("/history", <HistoryPage />)
    await userEvent.click(await screen.findByTitle("Open journey details"))
    for (const star of within(screen.getByRole("group", { name: "Journey rating" })).getAllByRole("button")) {
      expect(star.className).toContain("h-11")
      expect(star.className).toContain("w-11")
    }
    expect(screen.getByTitle("Delete journey").className).toContain("h-11")
  })

  it("submits the chosen rating, comment, issues and duration, then shows the backend's message", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    vi.mocked(intelligenceService.submitJourneyFeedback).mockResolvedValue({
      message: "Thanks, TransitDNA updated.",
      journey: { userFeedback: { rating: 3, createdAt: today, issues: ["too_slow"] }, status: "completed" },
    } as never)
    renderAt("/history", <HistoryPage />)
    await userEvent.click(await screen.findByTitle("Open journey details"))
    await userEvent.click(screen.getByRole("button", { name: "3 out of 5 stars" }))
    await userEvent.type(screen.getByPlaceholderText(/Optional comment/), "Slow")
    await userEvent.click(screen.getByRole("button", { name: "Too slow" }))
    expect(screen.getByRole("button", { name: "Too slow" })).toHaveAttribute("aria-pressed", "true")
    await userEvent.type(screen.getByLabelText("Actual journey duration (optional)"), "42")
    await userEvent.click(screen.getByRole("button", { name: "Submit Feedback" }))
    await waitFor(() =>
      expect(intelligenceService.submitJourneyFeedback).toHaveBeenCalledWith("a", { rating: 3, comment: "Slow", issues: ["too_slow"], actualDurationMinutes: 42 }),
    )
    expect(await screen.findByText("Thanks, TransitDNA updated.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Update Feedback" })).toBeInTheDocument()
    expect(screen.getAllByText("3/5").length).toBeGreaterThan(0)
  })

  it("refuses an actual duration outside 1 to 1440 minutes without calling the backend", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    renderAt("/history", <HistoryPage />)
    await userEvent.click(await screen.findByTitle("Open journey details"))
    await userEvent.type(screen.getByLabelText("Actual journey duration (optional)"), "5000")
    await userEvent.click(screen.getByRole("button", { name: "Submit Feedback" }))
    expect(await screen.findByText("Enter an actual journey duration between 1 and 1440 minutes.")).toBeInTheDocument()
    expect(intelligenceService.submitJourneyFeedback).not.toHaveBeenCalled()
  })

  it("search narrows the list; no match shows a message with a Clear search button", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    renderAt("/history", <HistoryPage />)
    await screen.findByTitle("Open journey details")
    await userEvent.type(screen.getByRole("searchbox", { name: "Search journeys" }), "zzz")
    expect(screen.getByText("No journeys match your search.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(await screen.findByTitle("Open journey details")).toBeInTheDocument()
  })

  it("deletes a journey and a saved destination only after confirming", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a")])
    vi.mocked(tripService.getDestinations).mockResolvedValue([destination])
    vi.mocked(tripService.deleteJourney).mockResolvedValue(undefined as never)
    vi.mocked(tripService.deleteDestination).mockResolvedValue(undefined as never)
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true)
    renderAt("/history", <HistoryPage />)
    await userEvent.click(await screen.findByRole("button", { name: "Delete journey" }))
    expect(tripService.deleteJourney).not.toHaveBeenCalled() // cancelled
    await userEvent.click(screen.getByRole("button", { name: "Delete journey" }))
    await waitFor(() => expect(tripService.deleteJourney).toHaveBeenCalledWith("a"))
    await userEvent.click(screen.getByRole("button", { name: "Delete destination Cubbon Park" }))
    await waitFor(() => expect(tripService.deleteDestination).toHaveBeenCalledWith("d1"))
    expect(confirm).toHaveBeenCalledTimes(3)
  })

  it("the empty state keeps its words and adds a photo and a way forward", async () => {
    renderAt("/history", <HistoryPage />)
    expect(await screen.findByText("No journeys saved yet.")).toBeInTheDocument()
    expect(document.querySelector("img")).not.toBeNull()
    expect(screen.getByRole("link", { name: /Plan a trip/ })).toBeInTheDocument()
  })

  it("Refresh loads the data again", async () => {
    renderAt("/history", <HistoryPage />)
    await screen.findByText("No journeys saved yet.")
    const calls = vi.mocked(tripService.getHistory).mock.calls.length
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }))
    await waitFor(() => expect(vi.mocked(tripService.getHistory).mock.calls.length).toBe(calls + 1))
  })
})

describe("Dashboard", () => {
  it("greets the user over a photo, with the search bar leading to Plan Trip", async () => {
    renderAt("/dashboard", <DashboardPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Commuter")
    const bar = screen.getByRole("link", { name: /Plan Journey: choose where to go/ })
    expect(bar).toHaveAttribute("href", "/plan")
    expect(bar).toHaveTextContent("Current Location")
    expect(bar).toHaveTextContent("Explore Routes")
    expect(document.querySelector("img")).not.toBeNull()
    await waitFor(() => expect(screen.getByText(/API Online/)).toBeInTheDocument())
  })

  it("says Demo Mode when the backend is not reachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    renderAt("/dashboard", <DashboardPage />)
    expect(await screen.findByText(/API Demo Mode/)).toBeInTheDocument()
  })

  it("has the four quick actions and every section the contract lists", async () => {
    renderAt("/dashboard", <DashboardPage />)
    const nav = screen.getByRole("navigation", { name: "Quick actions" })
    expect(within(nav).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/plan", "/history", "/saved-routes", "/profile"])
    for (const title of [
      "Recent Journeys", "Personalized TransitDNA (ML Engine)", "Travel Statistics", "Demo / Quick Transit Hubs",
      "This Month", "Mobility Profile", "Saved Destinations", "Saved Routes", "Sustainability",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    }
    expect(screen.getByText("Smart Mobility Tip")).toBeInTheDocument()
    expect(screen.getByText("Pairwise Logistic Regression Active")).toBeInTheDocument()
    await screen.findByText("No journeys saved yet.")
  })

  it("shows the five TransitDNA weights as written percentages, and an honest note when nothing is learned", async () => {
    renderAt("/dashboard", <DashboardPage />)
    for (const label of ["Speed", "Cost", "Walking", "Reliability", "Access"]) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getAllByText("25%")).toHaveLength(2) // speed and reliability
    expect(screen.getByText(/hasn't learned from any route choices yet/)).toBeInTheDocument()
    await screen.findByText("No journeys saved yet.")
  })

  it("lists recent journeys as links to History with mode chips, fare, time and feedback state", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([
      journey("a", { userFeedback: { rating: 4, issues: [], createdAt: today } as never, status: "completed" }),
      journey("b"),
    ])
    renderAt("/dashboard", <DashboardPage />)
    const links = await screen.findAllByRole("link", { name: /Indiranagar/ })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/history")
    expect(within(links[0]).getByText("4/5")).toBeInTheDocument()
    expect(within(links[1]).getByText("Awaiting feedback")).toBeInTheDocument()
    expect(within(links[0]).getByText("Metro")).toBeInTheDocument()
    expect(within(links[0]).getByText("₹30")).toBeInTheDocument()
  })

  it("does not count a journey as rated when the server sends an empty feedback object (a real bug the audit found)", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a", { userFeedback: { issues: [] } as never })])
    renderAt("/dashboard", <DashboardPage />)
    expect(await screen.findByText("Awaiting feedback")).toBeInTheDocument()
    expect(screen.queryByText(/[1-5]\/5/)).toBeNull()
    expect(screen.getByText("No feedback yet.")).toBeInTheDocument()
  })

  it("derives the statistics from the saved journeys, never invented numbers", async () => {
    vi.mocked(tripService.getHistory).mockResolvedValue([journey("a", { transferCount: 2 }), journey("b", { totalDurationSeconds: 3600, estimatedFare: 50 })])
    renderAt("/dashboard", <DashboardPage />)
    await screen.findByText("Avg Travel Time")
    expect(screen.getByText("45 min")).toBeInTheDocument() // (30 + 60) / 2
    expect(screen.getAllByText("₹80").length).toBeGreaterThan(0) // 30 + 50
    expect(screen.getByText("₹40")).toBeInTheDocument() // average
    expect(screen.getByText("No feedback yet.")).toBeInTheDocument()
  })

  it("shows saved destinations and saved routes with links to where they are managed", async () => {
    vi.mocked(tripService.getDestinations).mockResolvedValue([destination])
    vi.mocked(tripService.getSavedRoutes).mockResolvedValue([savedRoute])
    renderAt("/dashboard", <DashboardPage />)
    expect(await screen.findByText("Cubbon Park")).toBeInTheDocument()
    expect(await screen.findByText("Work commute")).toBeInTheDocument()
    expect(screen.getByText(/route saved/)).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /View all/ }).map((l) => l.getAttribute("href"))).toEqual(["/history", "/saved-routes"])
  })

  it("a demo hub opens Plan Trip with that place already chosen as the destination", async () => {
    renderAt("/dashboard", <DashboardPage />)
    await userEvent.click(screen.getByRole("link", { name: /Majestic Metro Station/ }))
    const where = await screen.findByTestId("where")
    expect(where).toHaveTextContent("/plan")
    expect(where.textContent).toContain("useRouteDestination")
    expect(where.textContent).toContain("Majestic Metro Station")
    expect(where.textContent).toContain("12.9767")
  })

  it("a saved destination opens Plan Trip the same way", async () => {
    vi.mocked(tripService.getDestinations).mockResolvedValue([destination])
    renderAt("/dashboard", <DashboardPage />)
    await userEvent.click(await screen.findByRole("link", { name: /Cubbon Park/ }))
    expect((await screen.findByTestId("where")).textContent).toContain("Cubbon Park")
  })

  it("the three demo hubs and the profile link are still there", async () => {
    renderAt("/dashboard", <DashboardPage />)
    for (const hub of ["MG Road Metro Station", "Majestic Metro Station", "Shivajinagar Bus Stand"]) expect(screen.getByText(hub)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Edit preferences & profile/ })).toHaveAttribute("href", "/profile")
    await screen.findByText("No journeys saved yet.")
  })

  it("shows each section's own error instead of failing the page", async () => {
    vi.mocked(tripService.getHistory).mockRejectedValue(new Error("history down"))
    vi.mocked(tripService.getSavedRoutes).mockRejectedValue(new Error("routes down"))
    renderAt("/dashboard", <DashboardPage />)
    expect(await screen.findByText("history down")).toBeInTheDocument()
    expect(await screen.findByText("routes down")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Mobility Profile" })).toBeInTheDocument()
  })
})

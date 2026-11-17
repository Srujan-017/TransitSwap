import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import NotFoundPage from "./NotFoundPage"
import ProfilePage from "./ProfilePage"
import ResearchPage from "./ResearchPage"
import AdminDashboardPage from "./AdminDashboardPage"
import { AuthProvider } from "../context/AuthContext"
import { adminService } from "../services/adminService"
import { intelligenceService } from "../services/intelligenceService"

/** UI redesign Phase 9: Profile, Research, Admin and Not found. What they show and which controls they keep. */

vi.mock("../services/adminService", () => ({
  adminService: {
    getOverview: vi.fn(),
    listStations: vi.fn(),
    listCrowdReports: vi.fn(),
    listFeedback: vi.fn(),
    getDataset: vi.fn(),
    listAccessibilityReports: vi.fn(),
    createStation: vi.fn(),
    updateStation: vi.fn(),
    deactivateStation: vi.fn(),
    deleteStation: vi.fn(),
    setLiftStatus: vi.fn(),
    updateAccessibility: vi.fn(),
    deleteCrowdReport: vi.fn(),
    updateAccessibilityReportStatus: vi.fn(),
  },
}))
vi.mock("../services/intelligenceService", () => ({
  intelligenceService: {
    updateProfile: vi.fn(),
    updatePreferences: vi.fn(),
    resetTransitDna: vi.fn(),
    getMLStatus: vi.fn(),
    getMLEvaluation: vi.fn(),
    getReliabilityCoverageEvaluation: vi.fn(),
    getHistoricalReliabilityStats: vi.fn(),
  },
}))

const stationA = { stationId: "mg-road", stationName: "MG Road", transportMode: "metro", status: "accessible", active: true, hasLift: true, wheelchairAccessible: true, hasRamp: false }
const stationB = { stationId: "silk-board", stationName: "Silk Board", transportMode: "bus", status: "partially_accessible", active: false, hasLift: false, wheelchairAccessible: false, hasRamp: true }

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  vi.mocked(adminService.getOverview).mockResolvedValue({ users: 12, journeys: 40, savedRoutes: 5, savedDestinations: 3, crowdReports: 7, accessibilityRecords: 9, feedback: 11, databaseConnected: true } as never)
  vi.mocked(adminService.listStations).mockResolvedValue([stationA, stationB] as never)
  vi.mocked(adminService.listCrowdReports).mockResolvedValue([])
  vi.mocked(adminService.listFeedback).mockResolvedValue([])
  vi.mocked(adminService.getDataset).mockResolvedValue([])
  vi.mocked(adminService.listAccessibilityReports).mockResolvedValue([])
})
afterEach(() => vi.restoreAllMocks())

describe("Not found", () => {
  it("keeps its words, adds a photo, and offers Go Home and Go Back", () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    expect(screen.getByRole("heading", { level: 1, name: "Route not found" })).toBeInTheDocument()
    expect(screen.getByText(/took a wrong turn/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Go Home/ })).toHaveAttribute("href", "/")
    expect(screen.getByRole("button", { name: /Go Back/ })).toBeInTheDocument()
    expect(document.querySelector("img")).not.toBeNull()
    // the text sits on the dark photo, so it is white rather than the old pale grey that failed contrast
    expect(screen.getByText(/took a wrong turn/).className).toContain("text-white")
  })

  it("Go Back goes back in history", async () => {
    const back = vi.spyOn(history, "back").mockImplementation(() => {})
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    await userEvent.click(screen.getByRole("button", { name: /Go Back/ }))
    expect(back).toHaveBeenCalled()
  })
})

describe("Profile", () => {
  const renderProfile = () => render(<AuthProvider><ProfilePage /></AuthProvider>)

  it("shows the TransitDNA weights as written percentages with all five names", () => {
    renderProfile()
    for (const label of ["Speed", "Cost", "Walking", "Reliability", "Accessibility"]) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getAllByText("25%")).toHaveLength(2)
  })

  it("every choice is a toggle button that says whether it is on", async () => {
    renderProfile()
    const standard = screen.getByRole("button", { name: /^Standard/ })
    expect(standard).toHaveAttribute("aria-pressed", "true")
    const wheelchair = screen.getByText("Wheelchair").closest("button")!
    expect(wheelchair).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(wheelchair)
    expect(wheelchair).toHaveAttribute("aria-pressed", "true")
    expect(standard).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(screen.getByRole("button", { name: /Metro preferred/ }))
    expect(screen.getByRole("button", { name: /Metro preferred/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Any mode/ })).toHaveAttribute("aria-pressed", "false")
  })

  it("groups each preference under a named fieldset", () => {
    renderProfile()
    for (const name of ["Preferred Transport Mode", "Walking Tolerance", "Budget Preference", "Primary Priority"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument()
    }
  })

  it("explains why the email cannot be edited, and keeps it read-only", () => {
    renderProfile()
    const email = screen.getByLabelText("Email Address")
    expect(email).toHaveAttribute("readonly")
    expect(email).toHaveAccessibleDescription(/cannot be changed here/)
  })

  it("the save result is announced politely and an error says so", async () => {
    vi.mocked(intelligenceService.updateProfile).mockRejectedValue(new Error("offline"))
    renderProfile()
    await userEvent.click(screen.getByRole("button", { name: "Save Mobility Profile" }))
    const message = await screen.findByText(/Could not save preferences: offline/)
    expect(message.closest("[aria-live='polite']")).not.toBeNull()
  })
})

describe("Research", () => {
  it("has a heading and subtitle, and shows skeletons (not a spinner) while the cards load", () => {
    vi.mocked(intelligenceService.getMLStatus).mockReturnValue(new Promise(() => {}))
    vi.mocked(intelligenceService.getMLEvaluation).mockReturnValue(new Promise(() => {}))
    vi.mocked(intelligenceService.getReliabilityCoverageEvaluation).mockReturnValue(new Promise(() => {}))
    vi.mocked(intelligenceService.getHistoricalReliabilityStats).mockReturnValue(new Promise(() => {}))
    render(<ResearchPage />)
    expect(screen.getByRole("heading", { level: 1, name: "Research & Diagnostics" })).toBeInTheDocument()
    expect(screen.getByText(/never a fabricated number/)).toBeInTheDocument()
    expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText("Loading model status…")).toBeInTheDocument()
    expect(screen.getByText("Loading benchmark…")).toBeInTheDocument()
  })

  it("shows the ML numbers as stat tiles once they arrive, and each failing card shows its own error", async () => {
    vi.mocked(intelligenceService.getMLStatus).mockResolvedValue({ isPersonalized: false, statusMessage: "Not enough data", sampleCount: 2, weights: { time: 0.25 } } as never)
    vi.mocked(intelligenceService.getMLEvaluation).mockResolvedValue({
      mlPairwiseAccuracyPercent: 91, baselineRuleAccuracyPercent: 80, accuracyImprovementPercent: 11, logLoss: 0.31,
      trainingSamplesCount: 80, testSamplesCount: 20, totalSamplesCount: 100, disclaimer: "Synthetic data.",
    } as never)
    vi.mocked(intelligenceService.getReliabilityCoverageEvaluation).mockRejectedValue(new Error("coverage down"))
    vi.mocked(intelligenceService.getHistoricalReliabilityStats).mockResolvedValue({ isSufficientData: false } as never)
    render(<ResearchPage />)
    expect(await screen.findByText("91%")).toBeInTheDocument()
    expect(screen.getByText("ML Accuracy")).toBeInTheDocument()
    expect(screen.getByText("+11%")).toBeInTheDocument()
    expect(await screen.findByRole("alert")).toHaveTextContent("coverage down")
    expect(screen.getByText("Not yet personalized")).toBeInTheDocument()
    expect(await screen.findByText("Insufficient data")).toBeInTheDocument()
  })
})

describe("Admin", () => {
  it("keeps its heading and the not-real-time notice, with the seven sections as real tabs", async () => {
    render(<AdminDashboardPage />)
    expect(screen.getByRole("heading", { level: 1, name: "Admin Dashboard" })).toBeInTheDocument()
    expect(screen.getByText("Admin-managed status — not real-time citywide data")).toBeInTheDocument()
    const tabs = screen.getByRole("tablist", { name: "Admin sections" })
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Overview", "Stations", "Accessibility", "Crowd Reports", "Feedback", "Dataset", "Reports"])
    expect(within(tabs).getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true")
    expect(tabs.className).toContain("overflow-x-auto") // seven tabs scroll sideways inside the row, never the page
  })

  it("the overview shows a tile per count", async () => {
    render(<AdminDashboardPage />)
    for (const [label, value] of [["Users", "12"], ["Journeys", "40"], ["Saved Routes", "5"], ["Feedback Records", "11"]]) {
      const tile = (await screen.findByText(label, { selector: "p" })).closest("div")!.parentElement!
      expect(tile).toHaveTextContent(value)
    }
  })

  it("warns when the database is not connected", async () => {
    vi.mocked(adminService.getOverview).mockResolvedValue({ users: 0, journeys: 0, savedRoutes: 0, savedDestinations: 0, crowdReports: 0, accessibilityRecords: 0, feedback: 0, databaseConnected: false } as never)
    render(<AdminDashboardPage />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Database not connected")
  })

  it("lists stations in a table, searches them and sorts by name", async () => {
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Stations" }))
    const table = await screen.findByRole("table", { name: "Stations" })
    const names = () => within(table).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent)
    expect(names()).toEqual(["MG Road", "Silk Board"])
    await userEvent.click(within(table).getByRole("button", { name: /Station/ }))
    expect(names()).toEqual(["Silk Board", "MG Road"])
    await userEvent.type(screen.getByRole("searchbox", { name: "Search stations" }), "silk")
    expect(names()).toEqual(["Silk Board"])
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search stations" }))
    await userEvent.type(screen.getByRole("searchbox", { name: "Search stations" }), "zzz")
    expect(screen.getByText(/No stations match/)).toBeInTheDocument()
  })

  it("shows a long station list a page of 25 at a time", async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...stationA, stationId: "s" + i, stationName: "Station " + String(i).padStart(2, "0") }))
    vi.mocked(adminService.listStations).mockResolvedValue(many as never)
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Stations" }))
    const table = await screen.findByRole("table", { name: "Stations" })
    expect(within(table).getAllByRole("row")).toHaveLength(26) // header + 25
    expect(screen.getByText("Showing 25 of 60 stations")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Show more (35 remaining)" }))
    expect(within(table).getAllByRole("row")).toHaveLength(51)
    await userEvent.click(screen.getByRole("button", { name: "Show more (10 remaining)" }))
    expect(screen.getByText("Showing 60 of 60 stations")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull()
  })

  it("creating a station happens in a dialog, validates first, and then saves", async () => {
    vi.mocked(adminService.createStation).mockResolvedValue(undefined as never)
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Stations" }))
    await userEvent.click(await screen.findByRole("button", { name: "Add Station" }))
    const dialog = await screen.findByRole("dialog", { name: "Add station" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Station" }))
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Station ID is required.")
    expect(adminService.createStation).not.toHaveBeenCalled()
    await userEvent.type(within(dialog).getByLabelText("Station ID"), "new-stn")
    await userEvent.type(within(dialog).getByLabelText("Station Name"), "New Station")
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Station" }))
    await waitFor(() => expect(adminService.createStation).toHaveBeenCalledWith({ stationId: "new-stn", stationName: "New Station", transportMode: "metro", latitude: undefined, longitude: undefined }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByText('Station "New Station" created.')).toBeInTheDocument()
  })

  it("editing a station opens a dialog for that station and sends only the allowed fields", async () => {
    vi.mocked(adminService.updateStation).mockResolvedValue(undefined as never)
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Stations" }))
    const table = await screen.findByRole("table", { name: "Stations" })
    await userEvent.click(within(within(table).getAllByRole("row")[1]).getByRole("button", { name: "Edit" }))
    const dialog = await screen.findByRole("dialog", { name: "Edit MG Road" })
    const name = within(dialog).getByLabelText("Station Name")
    await userEvent.clear(name)
    await userEvent.type(name, "MG Road Metro")
    await userEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }))
    await waitFor(() => expect(adminService.updateStation).toHaveBeenCalledWith("mg-road", { stationName: "MG Road Metro", latitude: null, longitude: null, active: true, notes: null }))
  })

  it("deactivate and delete each ask first; cancelling does nothing", async () => {
    vi.mocked(adminService.deactivateStation).mockResolvedValue(undefined as never)
    vi.mocked(adminService.deleteStation).mockResolvedValue(undefined as never)
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValue(true)
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Stations" }))
    const table = await screen.findByRole("table", { name: "Stations" })
    const row = within(table).getAllByRole("row")[1]
    await userEvent.click(within(row).getByRole("button", { name: "Deactivate" }))
    expect(adminService.deactivateStation).not.toHaveBeenCalled()
    await userEvent.click(within(row).getByRole("button", { name: "Deactivate" }))
    await waitFor(() => expect(adminService.deactivateStation).toHaveBeenCalledWith("mg-road"))
    await userEvent.click(within(row).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(adminService.deleteStation).toHaveBeenCalledWith("mg-road"))
    expect(confirm).toHaveBeenCalledTimes(3)
  })

  it("shows the backend's real reason when a delete is refused", async () => {
    vi.mocked(adminService.deleteStation).mockRejectedValue(new Error("Crowd reports reference this station"))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Stations" }))
    const table = await screen.findByRole("table", { name: "Stations" })
    await userEvent.click(within(within(table).getAllByRole("row")[1]).getByRole("button", { name: "Delete" }))
    expect(await screen.findByText("Crowd reports reference this station")).toBeInTheDocument()
  })

  it("the accessibility tab shows the real lift state and toggles it after confirming a break", async () => {
    vi.mocked(adminService.setLiftStatus).mockResolvedValue(undefined as never)
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Accessibility" }))
    const table = await screen.findByRole("table", { name: /accessibility and lift status/i })
    const rows = within(table).getAllByRole("row")
    expect(within(rows[1]).getByText("WORKING")).toBeInTheDocument()
    expect(within(rows[2]).getByText("BROKEN")).toBeInTheDocument()
    await userEvent.click(within(rows[1]).getByRole("button", { name: "Mark Broken" }))
    expect(confirm).toHaveBeenCalled()
    await waitFor(() => expect(adminService.setLiftStatus).toHaveBeenCalledWith("mg-road", "broken"))
    await userEvent.click(within(rows[2]).getByRole("button", { name: "Edit Accessibility" }))
    expect(await screen.findByRole("dialog", { name: "Accessibility: Silk Board" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Ramp" })).toBeChecked()
  })

  it("empty tabs say so, and errors are announced", async () => {
    render(<AdminDashboardPage />)
    await userEvent.click(screen.getByRole("tab", { name: "Crowd Reports" }))
    expect(await screen.findByText("No crowd reports.")).toBeInTheDocument()
    vi.mocked(adminService.listFeedback).mockRejectedValue(new Error("feedback down"))
    await userEvent.click(screen.getByRole("tab", { name: "Feedback" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("feedback down")
  })

  it("moves between tabs with the arrow keys", async () => {
    render(<AdminDashboardPage />)
    const overview = screen.getByRole("tab", { name: "Overview" })
    overview.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: "Stations" })).toHaveAttribute("aria-selected", "true")
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ProfilePage from "./ProfilePage"
import { AuthProvider } from "../context/AuthContext"
import { intelligenceService } from "../services/intelligenceService"

/**
 * Phase 10 — component tests for ProfilePage.
 *
 * Covers the real save flow (success and failure) and specifically
 * regression-tests Phase 4 bug B11: on a save failure, the page must show
 * the ACTUAL error, never the old fabricated "Preferences updated in local
 * session" message that claimed a save happened when nothing was persisted.
 */

vi.mock("../services/intelligenceService", () => ({
  intelligenceService: {
    updateProfile: vi.fn(),
    updatePreferences: vi.fn(),
    resetTransitDna: vi.fn(),
  },
}))

function renderProfilePage() {
  return render(
    <AuthProvider>
      <ProfilePage />
    </AuthProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(intelligenceService.updateProfile).mockReset()
  vi.mocked(intelligenceService.updatePreferences).mockReset()
  vi.mocked(intelligenceService.resetTransitDna).mockReset()
})

describe("ProfilePage", () => {
  it("renders the default accessibility profile and travel preference sections", () => {
    renderProfilePage()
    expect(screen.getByText("Profile & Mobility Preferences")).toBeInTheDocument()
    expect(screen.getByText("Accessibility Profile")).toBeInTheDocument()
    expect(screen.getByText("Travel Preferences")).toBeInTheDocument()
    // Standard is the default profile
    expect(screen.getByText("Regular commuter")).toBeInTheDocument()
  })

  it("lets the user select a different accessibility profile", async () => {
    const user = userEvent.setup()
    renderProfilePage()

    const wheelchairButton = screen.getByText("Wheelchair").closest("button")!
    await user.click(wheelchairButton)

    // Selecting it applies the "selected" styling (border-brand-500) —
    // the most stable observable signal this component exposes for
    // selection state without reaching into internal component state.
    expect(wheelchairButton.className).toContain("border-brand-500")
  })

  it("shows a real success message on save, and actually calls both update endpoints", async () => {
    vi.mocked(intelligenceService.updateProfile).mockResolvedValue({
      id: "u1", name: "Commuter", email: "user@example.com", accessibilityProfile: "standard",
    } as any)
    vi.mocked(intelligenceService.updatePreferences).mockResolvedValue({
      id: "u1", name: "Commuter", email: "user@example.com", accessibilityProfile: "standard",
    } as any)

    const user = userEvent.setup()
    renderProfilePage()

    await user.click(screen.getByText("Save Mobility Profile"))

    await waitFor(() => {
      expect(screen.getByText(/Preferences saved successfully/i)).toBeInTheDocument()
    })
    expect(intelligenceService.updateProfile).toHaveBeenCalledTimes(1)
    expect(intelligenceService.updatePreferences).toHaveBeenCalledTimes(1)
  })

  it("Phase 4 bug B11 regression — shows the REAL error on save failure, never a fabricated success message", async () => {
    vi.mocked(intelligenceService.updateProfile).mockRejectedValue(new Error("Network request failed"))

    const user = userEvent.setup()
    renderProfilePage()

    await user.click(screen.getByText("Save Mobility Profile"))

    await waitFor(() => {
      expect(screen.getByText(/Could not save preferences: Network request failed/i)).toBeInTheDocument()
    })
    // The exact string this bug used to show, which claimed a save happened
    // when nothing was persisted, must never appear.
    expect(screen.queryByText(/Preferences updated in local session/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/saved successfully/i)).not.toBeInTheDocument()
  })

  it("calls resetTransitDna when 'Reset Learned Weights' is clicked", async () => {
    vi.mocked(intelligenceService.resetTransitDna).mockResolvedValue({ id: "u1" } as any)
    const user = userEvent.setup()
    renderProfilePage()

    await user.click(screen.getByText("Reset Learned Weights"))

    await waitFor(() => {
      expect(intelligenceService.resetTransitDna).toHaveBeenCalledTimes(1)
    })
  })
})

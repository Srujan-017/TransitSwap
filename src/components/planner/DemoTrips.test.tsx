import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DemoTrips, { DEMO_TRIPS } from "./DemoTrips"

describe("DemoTrips", () => {
  it("offers the three ready-made trips as one named group of buttons", () => {
    render(<DemoTrips onPick={() => {}} />)
    const group = screen.getByRole("group", { name: "Demo trips" })
    expect(within(group).getAllByRole("button")).toHaveLength(3)
    expect(within(group).getByRole("button", { name: /Silk Board → Majestic/ })).toBeInTheDocument()
  })

  it("hands the chosen trip, with real coordinates for both ends, to the planner", async () => {
    const onPick = vi.fn()
    render(<DemoTrips onPick={onPick} />)
    await userEvent.click(screen.getByRole("button", { name: /Whitefield → Baiyappanahalli/ }))
    const trip = onPick.mock.calls[0][0]
    expect(trip.origin).toMatchObject({ name: "Whitefield Metro Station", latitude: 12.9698, longitude: 77.75 })
    expect(trip.destination).toMatchObject({ name: "Baiyappanahalli Metro Station", latitude: 12.9906, longitude: 77.653 })
  })

  it("every trip has two different places inside Bengaluru, and buttons are at least 44 px high", () => {
    for (const t of DEMO_TRIPS) {
      expect(t.origin.name).not.toBe(t.destination.name)
      for (const p of [t.origin, t.destination]) {
        expect(p.latitude).toBeGreaterThan(12.8)
        expect(p.latitude).toBeLessThan(13.2)
        expect(p.longitude).toBeGreaterThan(77.4)
        expect(p.longitude).toBeLessThan(77.8)
      }
    }
    render(<DemoTrips onPick={() => {}} />)
    for (const b of screen.getAllByRole("button")) expect(b.className).toContain("min-h-11")
  })
})

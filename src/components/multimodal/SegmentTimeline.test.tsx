import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SegmentTimeline from "./SegmentTimeline"
import type { MultimodalRoute } from "../../types/multimodal"

/** Feature-upgrade phase 2 — every metro and bus leg shows its crowd level, spelled out. */

const line = { type: "LineString" as const, coordinates: [[77.6, 12.97], [77.61, 12.98]] as [number, number][] }
const loc = (name: string) => ({ name, latitude: 12.97, longitude: 77.6 })

const ROUTE = {
  id: "r1",
  segments: [
    { id: "s0", mode: "walking", from: loc("Home"), to: loc("MG Road Metro"), distanceMeters: 300, durationSeconds: 240, estimatedFare: 0, instruction: "Walk to MG Road Metro", geometry: line },
    {
      id: "s1", mode: "metro", from: loc("MG Road Metro"), to: loc("Majestic Metro"), distanceMeters: 4000, durationSeconds: 900, estimatedFare: 30,
      instruction: "Take the Purple Line", geometry: line,
      transitDetails: { lineName: "Purple Line", lineColor: "#7c3aed", stopCount: 4, stops: ["MG Road Metro", "Majestic Metro"], waitMinutes: 5 },
    },
    {
      id: "s2", mode: "bus", from: loc("Kempegowda Bus Station"), to: loc("Shivajinagar Bus Stand"), distanceMeters: 3000, durationSeconds: 840, estimatedFare: 15,
      instruction: "Take bus 1", geometry: line,
      transitDetails: { lineName: "1 — Kempegowda ↔ Shivajinagar", lineColor: "#16a34a", stopCount: 3, stops: ["a", "b"], waitMinutes: 10, routeNumber: "1" },
    },
  ],
  crowd: {
    level: "HIGH",
    source: "DEMO_DATA",
    summary: "HIGH crowd on the most crowded leg.",
    stations: [],
    legs: [
      { segmentId: "s1", mode: "metro", label: "Purple Line", from: "MG Road Metro", to: "Majestic Metro", level: "HIGH", source: "DEMO_DATA", boardLevel: "HIGH", alightLevel: "HIGH" },
      { segmentId: "s2", mode: "bus", label: "Bus 1", from: "Kempegowda Bus Station", to: "Shivajinagar Bus Stand", level: "LOW", source: "DEMO_DATA", onboardLevel: "LOW" },
    ],
  },
} as unknown as MultimodalRoute

describe("SegmentTimeline crowd", () => {
  it("shows the crowd level on each metro and bus leg, and none on walking", async () => {
    render(<SegmentTimeline route={ROUTE} />)
    await userEvent.click(screen.getByRole("button", { name: /step-by-step journey/i }))
    expect(screen.getByText("Crowd: HIGH")).toBeInTheDocument()
    expect(screen.getByText("Crowd: LOW")).toBeInTheDocument()
    expect(screen.getAllByText(/^Crowd: /)).toHaveLength(2)
  })

  it("shows no crowd chip when the route has no crowd legs", async () => {
    render(<SegmentTimeline route={{ ...ROUTE, crowd: undefined } as MultimodalRoute} />)
    await userEvent.click(screen.getByRole("button", { name: /step-by-step journey/i }))
    expect(screen.queryByText(/^Crowd: /)).toBeNull()
  })
})

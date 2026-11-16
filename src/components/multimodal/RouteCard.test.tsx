import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import RouteCard from "./RouteCard"
import type { MultimodalRoute } from "../../types/multimodal"

/**
 * Feature-upgrade phase 4 — a bus leg shows its number, direction, where and when to board, the next
 * buses, where to get off and when the bus gets there, and its crowd.
 */

const line = { type: "LineString" as const, coordinates: [[77.6, 12.97], [77.61, 12.98]] as [number, number][] }
const loc = (name: string) => ({ name, latitude: 12.97, longitude: 77.6 })

function route(withTimes: boolean): MultimodalRoute {
  return {
    id: "r1", label: "BALANCED", labelDisplay: "Balanced", labelColor: "#c2410c",
    segments: [
      { id: "w1", mode: "walking", from: loc("Home"), to: loc("Silk Board Bus Stop"), distanceMeters: 300, durationSeconds: 240, estimatedFare: 0, instruction: "Walk", geometry: line },
      {
        id: "b1", mode: "bus", from: loc("Silk Board Bus Stop"), to: loc("Kempegowda Bus Station"), distanceMeters: 11000, durationSeconds: 3000, estimatedFare: 25,
        instruction: "Take 356", geometry: line,
        transitDetails: {
          lineName: "356 — Kempegowda Bus Station ↔ Electronic City (Hosur Road)", lineColor: "#16a34a", stopCount: 6,
          stops: ["a", "b", "c", "d", "e", "f", "g"], waitMinutes: 8, routeNumber: "356", routeId: "R14", towards: "Kempegowda Bus Station",
          ...(withTimes ? { estimatedBoardingTime: "8:36 AM", upcomingBoardingTimes: ["8:41 AM", "8:46 AM"], estimatedArrivalTime: "9:17 AM", headwayMinutes: 5 } : {}),
        },
      },
    ],
    totalDistanceMeters: 11300, totalDurationSeconds: 3240, totalFare: 25, totalWalkingMeters: 300, transferCount: 0, modes: ["walking", "bus"], summary: "Walk → Bus", isDemoData: true,
    crowd: { level: "HIGH", source: "DEMO_DATA", summary: "", stations: [], legs: [{ segmentId: "b1", mode: "bus", label: "Bus 356", from: "Silk Board Bus Stop", to: "Kempegowda Bus Station", level: "HIGH", source: "DEMO_DATA" }] },
  } as MultimodalRoute
}

describe("RouteCard bus leg", () => {
  it("shows the number, direction, boarding, next buses, get-off stop, arrival and crowd", () => {
    render(<RouteCard route={route(true)} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText("Bus number")).toBeInTheDocument() // read out by screen readers before the number
    expect(screen.getAllByText("356").length).toBeGreaterThan(0)
    expect(screen.getByText("Towards Kempegowda Bus Station")).toBeInTheDocument()
    expect(screen.getByText(/at ~8:36 AM/)).toBeInTheDocument()
    expect(screen.getByText(/next ~8:41 AM, ~8:46 AM/)).toBeInTheDocument()
    expect(screen.getByText(/after 6 stops/)).toBeInTheDocument()
    expect(screen.getByText(/arrives ~9:17 AM/)).toBeInTheDocument()
    expect(screen.getByText("Crowd: HIGH")).toBeInTheDocument()
    expect(screen.getByText("Bus 356")).toBeInTheDocument() // the mode chip carries the number
  })

  it("without a departure time it says how often buses run, and invents no times", () => {
    render(<RouteCard route={route(false)} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.getByText(/a bus every ~8 min/)).toBeInTheDocument()
    expect(screen.queryByText(/arrives/)).toBeNull()
    expect(screen.queryByText(/next ~/)).toBeNull()
  })

  it("shows nothing bus-specific for a route without a bus", () => {
    const r = route(true)
    r.segments = r.segments.filter((s) => s.mode !== "bus")
    r.crowd = undefined
    render(<RouteCard route={r} selected={false} onSelect={() => {}} index={0} />)
    expect(screen.queryByText(/Bus number/)).toBeNull()
  })
})

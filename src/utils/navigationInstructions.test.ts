// useLiveTracking, useSpeechNarration, and ActiveNavigationView's
// geolocation/speech-dependent behavior are browser APIs with no meaningful
// jsdom equivalent, so they're verified manually in-browser instead (see
// the plan's verification section). This file covers the one piece that's
// genuinely a pure function: building the spoken/display text for a step.

import { describe, it, expect } from "vitest"
import { buildStepInstruction, buildArrivalAnnouncement } from "./navigationInstructions"
import type { RouteSegment, MultimodalRoute } from "../types/multimodal"

function makeSegment(overrides: Partial<RouteSegment>): RouteSegment {
  return {
    id: "seg-1",
    mode: "walking",
    from: { name: "Origin", latitude: 0, longitude: 0 },
    to: { name: "Destination", latitude: 0, longitude: 0 },
    distanceMeters: 300,
    durationSeconds: 240,
    estimatedFare: 0,
    instruction: "Walk 300 m to Destination",
    geometry: { type: "LineString", coordinates: [[0, 0], [0, 0]] },
    ...overrides,
  }
}

describe("buildStepInstruction", () => {
  it("builds a walking instruction with distance in meters", () => {
    const seg = makeSegment({ mode: "walking", distanceMeters: 329, to: { name: "Majestic Metro", latitude: 0, longitude: 0 } })
    expect(buildStepInstruction(seg)).toBe("Walk 329 m toward Majestic Metro.")
  })

  it("builds a walking instruction with distance in km when >= 1000m", () => {
    const seg = makeSegment({ mode: "walking", distanceMeters: 1500, to: { name: "Far Station", latitude: 0, longitude: 0 } })
    expect(buildStepInstruction(seg)).toBe("Walk 1.5 km toward Far Station.")
  })

  it("rewords Walk to Wheel for the wheelchair profile", () => {
    const seg = makeSegment({ mode: "walking", distanceMeters: 329, to: { name: "Majestic Metro", latitude: 0, longitude: 0 } })
    expect(buildStepInstruction(seg, { profile: "wheelchair" })).toBe("Wheel 329 m toward Majestic Metro.")
  })

  it("does not reword Walk for other profiles", () => {
    const seg = makeSegment({ mode: "walking", to: { name: "X", latitude: 0, longitude: 0 } })
    expect(buildStepInstruction(seg, { profile: "pregnant" })).toMatch(/^Walk/)
  })

  it("builds a metro instruction with stop count and line name", () => {
    const seg = makeSegment({
      mode: "metro",
      from: { name: "Majestic Metro", latitude: 0, longitude: 0 },
      to: { name: "Indiranagar Metro", latitude: 0, longitude: 0 },
      transitDetails: { lineName: "Purple Line", lineColor: "#2563eb", stopCount: 7, stops: [], waitMinutes: 5 },
    })
    expect(buildStepInstruction(seg)).toBe("Take the metro from Majestic Metro to Indiranagar Metro — 7 stops on the Purple Line.")
  })

  it("builds a metro instruction without transitDetails", () => {
    const seg = makeSegment({
      mode: "metro",
      from: { name: "A Metro", latitude: 0, longitude: 0 },
      to: { name: "B Metro", latitude: 0, longitude: 0 },
    })
    expect(buildStepInstruction(seg)).toBe("Take the metro from A Metro to B Metro.")
  })

  it("builds a bus instruction with route number and towards", () => {
    const seg = makeSegment({
      mode: "bus",
      from: { name: "Kempegowda Bus Station", latitude: 0, longitude: 0 },
      transitDetails: { lineName: "1", lineColor: "#16a34a", stopCount: 3, stops: [], waitMinutes: 10, routeNumber: "1", towards: "Shivajinagar" },
    })
    expect(buildStepInstruction(seg)).toBe("Take bus 1 toward Shivajinagar from Kempegowda Bus Station.")
  })

  it("falls back to the raw instruction for a bus segment with no routeNumber", () => {
    const seg = makeSegment({ mode: "bus", instruction: "Take the bus from X to Y" })
    expect(buildStepInstruction(seg)).toBe("Take the bus from X to Y")
  })

  it("builds an auto instruction", () => {
    const seg = makeSegment({ mode: "auto", to: { name: "13th Main Road", latitude: 0, longitude: 0 } })
    expect(buildStepInstruction(seg)).toBe("Take an auto toward 13th Main Road.")
  })

  it("appends an arrival sentence when isLast is true", () => {
    const seg = makeSegment({ mode: "auto", to: { name: "13th Main Road", latitude: 0, longitude: 0 } })
    expect(buildStepInstruction(seg, { isLast: true })).toBe("Take an auto toward 13th Main Road. You have arrived at 13th Main Road.")
  })
})

describe("buildArrivalAnnouncement", () => {
  it("names the final segment's destination", () => {
    const route = {
      segments: [
        makeSegment({ to: { name: "Mid Stop", latitude: 0, longitude: 0 } }),
        makeSegment({ to: { name: "Final Destination", latitude: 0, longitude: 0 } }),
      ],
    } as MultimodalRoute
    expect(buildArrivalAnnouncement(route)).toBe("You've arrived at Final Destination.")
  })
})

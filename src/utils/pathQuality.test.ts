import { describe, it, expect } from "vitest"
import { isStraightLineEstimate } from "./pathQuality"

const line = (n: number) => ({ coordinates: Array.from({ length: n }, (_, i) => [77 + i / 1000, 12.9]) })

describe("isStraightLineEstimate", () => {
  it("is true for a long walk or auto ride drawn as two points", () => {
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 800, geometry: line(2) })).toBe(true)
    expect(isStraightLineEstimate({ mode: "auto", distanceMeters: 5000, geometry: line(2) })).toBe(true)
  })
  it("is false once the path follows streets (three or more points)", () => {
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 800, geometry: line(25) })).toBe(false)
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 800, geometry: line(3) })).toBe(false)
  })
  it("is false for a few steps, where a straight line is the truth", () => {
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 60, geometry: line(2) })).toBe(false)
  })
  it("never applies to metro and bus legs, which are drawn between stations by design", () => {
    expect(isStraightLineEstimate({ mode: "metro", distanceMeters: 4000, geometry: line(2) })).toBe(false)
    expect(isStraightLineEstimate({ mode: "bus", distanceMeters: 4000, geometry: line(2) })).toBe(false)
  })
  it("copes with a missing geometry", () => {
    expect(isStraightLineEstimate({ mode: "walking", distanceMeters: 800 })).toBe(true)
  })
})

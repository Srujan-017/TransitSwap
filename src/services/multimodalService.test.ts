import { describe, it, expect, vi, beforeEach } from "vitest"
import api from "./api"
import { multimodalService } from "./multimodalService"

/** Feature-upgrade phase 5 — only a demo weather is sent; "live" is simply the server's default. */

vi.mock("./api", () => ({ default: { post: vi.fn(), get: vi.fn() } }))

const place = { name: "A", address: "A, Bengaluru", latitude: 12.97, longitude: 77.59 }

beforeEach(() => {
  vi.mocked(api.post).mockReset()
  vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: [], weather: { available: true, bad: true, kind: "rain", headline: "Rain", rule: "r" } } })
})

describe("multimodalService.getRoutes weather", () => {
  it("does not send a weather field for live weather", async () => {
    await multimodalService.getRoutes(place, place, "standard", "2026-11-16T08:30", "live")
    expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty("weather")
  })

  it("does not send a weather field when none was chosen", async () => {
    await multimodalService.getRoutes(place, place, "standard")
    expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty("weather")
  })

  it("sends the chosen demo weather", async () => {
    await multimodalService.getRoutes(place, place, "standard", undefined, "heavy_rain")
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ weather: "heavy_rain" })
  })

  it("returns the weather report from the response", async () => {
    const result = await multimodalService.getRoutes(place, place, "wheelchair", undefined, "rain")
    expect(result.weather?.bad).toBe(true)
    expect(result.weather?.kind).toBe("rain")
  })
})

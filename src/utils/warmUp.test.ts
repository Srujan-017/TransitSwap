import { describe, it, expect, vi, afterEach } from "vitest"
import { warmUpBackend } from "./warmUp"

afterEach(() => vi.unstubAllGlobals())

describe("warmUpBackend", () => {
  it("asks for the health page, without caching", () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal("fetch", fetchMock)
    warmUpBackend("https://api.example.test/api")
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/health", { cache: "no-store" })
  })

  it("never throws or rejects when the backend is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    expect(() => warmUpBackend("https://api.example.test/api")).not.toThrow()
    await Promise.resolve()
  })

  it("never throws when fetch itself is missing", () => {
    vi.stubGlobal("fetch", undefined)
    expect(() => warmUpBackend("https://api.example.test/api")).not.toThrow()
  })
})

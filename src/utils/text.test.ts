import { describe, it, expect } from "vitest"
import { stripLeadingEmoji } from "./text"

describe("stripLeadingEmoji", () => {
  it("removes an emoji at the start, and the space after it", () => {
    expect(stripLeadingEmoji("🎯 Recommended for high schedule & transfer reliability")).toBe("Recommended for high schedule & transfer reliability")
    expect(stripLeadingEmoji("🌱 Higher relative sustainability")).toBe("Higher relative sustainability")
    expect(stripLeadingEmoji("⚡ Fastest travel time among options")).toBe("Fastest travel time among options")
  })

  it("removes an emoji built from several parts (a variation selector, a joiner)", () => {
    expect(stripLeadingEmoji("🛋️ Comfortable")).toBe("Comfortable")
    expect(stripLeadingEmoji("🧑‍🦽 Step-free")).toBe("Step-free")
  })

  it("leaves text without a leading emoji exactly as it is", () => {
    expect(stripLeadingEmoji("No walking: autos cover the first and last mile.")).toBe("No walking: autos cover the first and last mile.")
    expect(stripLeadingEmoji("Fare is ₹46 (30% less)")).toBe("Fare is ₹46 (30% less)")
    expect(stripLeadingEmoji("")).toBe("")
  })

  it("only touches the start: an emoji later in the text stays", () => {
    expect(stripLeadingEmoji("Arrive early 🕗 at the station")).toBe("Arrive early 🕗 at the station")
  })

  it("keeps numbers and symbols that are not emoji", () => {
    expect(stripLeadingEmoji("90% prediction interval")).toBe("90% prediction interval")
    expect(stripLeadingEmoji("#1 pick")).toBe("#1 pick")
  })
})

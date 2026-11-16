import { describe, it, expect } from "vitest"
import { groupByDay } from "./groupByDay"

const NOW = new Date(2026, 10, 16, 12, 0, 0)
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString()

describe("groupByDay", () => {
  it("labels today and yesterday and puts the newest day first", () => {
    const items = [
      { id: "a", when: at(2026, 11, 14) },
      { id: "b", when: at(2026, 11, 16) },
      { id: "c", when: at(2026, 11, 15) },
    ]
    const groups = groupByDay(items, (i) => i.when, NOW)
    expect(groups.map((g) => g.label.split(",")[0])).toEqual(["Today", "Yesterday", "Sat"])
    expect(groups[2].label).toMatch(/14 Nov.*2026/)
  })

  it("keeps several items of one day together, in their original order", () => {
    const items = [
      { id: "a", when: at(2026, 11, 16, 18) },
      { id: "b", when: at(2026, 11, 16, 8) },
    ]
    const groups = groupByDay(items, (i) => i.when, NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"])
  })

  it("puts an item with an unreadable date under Earlier instead of crashing", () => {
    const groups = groupByDay([{ when: "not a date" }], (i) => i.when, NOW)
    expect(groups[0].label).toBe("Earlier")
  })

  it("returns nothing for nothing", () => {
    expect(groupByDay([], () => "", NOW)).toEqual([])
  })
})

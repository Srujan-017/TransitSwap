/**
 * Splits items into day groups, newest first: "Today", "Yesterday", or the date. `getDate` says when an item happened.
 * Items keep their original order inside a group, so a list that already arrives newest-first stays that way.
 */
export interface DayGroup<T> {
  key: string
  label: string
  items: T[]
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function groupByDay<T>(items: T[], getDate: (item: T) => string | Date, now: Date = new Date()): DayGroup<T>[] {
  const today = dayKey(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = dayKey(yesterdayDate)

  const groups = new Map<string, DayGroup<T>>()
  for (const item of items) {
    const d = new Date(getDate(item))
    const key = Number.isNaN(d.getTime()) ? "unknown" : dayKey(d)
    let group = groups.get(key)
    if (!group) {
      const label =
        key === "unknown" ? "Earlier"
        : key === today ? "Today"
        : key === yesterday ? "Yesterday"
        : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      group = { key, label, items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  // Newest day first; anything with an unreadable date goes last.
  const rank = (k: string) => (k === "unknown" ? "" : k)
  return [...groups.values()].sort((a, b) => (rank(a.key) < rank(b.key) ? 1 : rank(a.key) > rank(b.key) ? -1 : 0))
}

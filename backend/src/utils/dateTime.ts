// Problem 13/14 — ONE safe helper for turning a user-supplied departure value
// into a valid local Date. Reused by reliabilityService and
// historicalReliabilityService so date parsing isn't duplicated.
//
// Accepts either:
//   - "HH:mm" (from an HTML <input type="time">) → today at that local time
//   - "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" (local, no "Z") → that local datetime
// Never uses `new Date("08:30")`, which is not reliably parsed across JS
// engines, and never assumes UTC. Returns null (not "now") when nothing
// usable was supplied, so callers can honestly label a missing departure time
// instead of silently pretending the user chose "now".

const HHMM_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/
const LOCAL_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):([0-5]\d)(:\d{2})?$/

export function parseLocalDateTime(value?: string | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()

  if (LOCAL_ISO_PATTERN.test(trimmed)) {
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  const hhmmMatch = trimmed.match(HHMM_PATTERN)
  if (hhmmMatch) {
    const hours = Number(hhmmMatch[1])
    const minutes = Number(hhmmMatch[2])
    const result = new Date()
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  // Last resort — let the engine try, but never propagate an Invalid Date.
  const fallback = new Date(trimmed)
  return isNaN(fallback.getTime()) ? null : fallback
}

import type { MultimodalMode } from "../types/multimodal"

// ── Problem 9 — Relative Sustainability Score ───────────────────────────────
//
// This is NOT an emissions calculator. It does not estimate kilograms of CO2
// and must never be presented that way. It is a simple, transparent 0–100
// RELATIVE score: higher means a route leans more on walking/public transport
// relative to private motorised transport (auto), for THIS demo dataset only.
//
// Prototype relative sustainability factors (NOT official emission factors):
export const SUSTAINABILITY_MODE_FACTORS: Record<MultimodalMode, number> = {
  walking: 100,
  metro: 90,
  bus: 80,
  auto: 45,
}

export interface SustainabilityInput {
  segments: Array<{ mode: MultimodalMode; distanceMeters: number }>
}

export interface SustainabilityResult {
  sustainabilityScore: number // 0-100, relative — higher is more favorable
  sustainabilitySummary: string
}

/**
 * Calculates a distance-weighted relative sustainability score for a route:
 *   score = round( sum(segment distance x mode factor) / sum(segment distance) )
 * Guards against divide-by-zero (e.g. a route with no measurable distance).
 */
export function calculateSustainability(route: SustainabilityInput): SustainabilityResult {
  const totalDistance = route.segments.reduce((sum, seg) => sum + (seg.distanceMeters || 0), 0)

  if (totalDistance <= 0) {
    return {
      sustainabilityScore: 0,
      sustainabilitySummary: "Sustainability score unavailable — no route distance to evaluate.",
    }
  }

  const weightedSum = route.segments.reduce((sum, seg) => {
    const factor = SUSTAINABILITY_MODE_FACTORS[seg.mode] ?? 50
    return sum + (seg.distanceMeters || 0) * factor
  }, 0)

  const rawScore = weightedSum / totalDistance
  const sustainabilityScore = Math.round(Math.max(0, Math.min(100, rawScore)))

  let sustainabilitySummary: string
  if (sustainabilityScore >= 80) {
    sustainabilitySummary = "High relative sustainability — mostly walking and public transport."
  } else if (sustainabilityScore >= 60) {
    sustainabilitySummary = "Moderate relative sustainability — combines public transport with other modes."
  } else {
    sustainabilitySummary = "Lower relative sustainability — greater use of road-based private transport."
  }

  return { sustainabilityScore, sustainabilitySummary }
}

export const sustainabilityService = {
  calculateSustainability,
}

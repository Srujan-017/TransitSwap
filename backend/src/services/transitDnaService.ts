import mongoose from "mongoose"
import { User } from "../models/User"
import { mlPreferenceService } from "./ml/mlPreferenceService"
import { extractRouteFeatures } from "./ml/featureExtractor"
import type { EnrichedRoute } from "../types/intelligence"

import type { UserPreferences } from "../types"
import { getProfileWeights } from "./ml/mlPreferenceService"

export interface LearnedWeights {
  time: number
  cost: number
  walking: number
  reliability: number
  accessibility: number
  crowd?: number
  weather?: number
}

const DEFAULT_WEIGHTS: LearnedWeights = {
  time: 0.25,
  cost: 0.15,
  walking: 0.20,
  reliability: 0.25,
  accessibility: 0.15,
  crowd: 0.10,
  weather: 0.10,
}

/**
 * Adjusts feature weights according to explicit user profile preferences (prioritize, walkingTolerance).
 * Complements learned Pairwise Logistic Regression weights without overwriting ML model learning.
 */
export function getPreferenceAdjustedWeights(
  baseWeights: LearnedWeights,
  preferences?: UserPreferences,
): LearnedWeights {
  if (!preferences) return baseWeights

  const w: LearnedWeights = { ...baseWeights }
  const priority = preferences.prioritize

  if (priority === "speed" || priority === "time") {
    w.time = (w.time ?? 0.25) * 1.5
  } else if (priority === "reliability") {
    w.reliability = (w.reliability ?? 0.25) * 1.5
  } else if (priority === "cost" || priority === "cheapest") {
    w.cost = (w.cost ?? 0.15) * 1.5
  } else if (priority === "accessibility") {
    w.accessibility = (w.accessibility ?? 0.15) * 1.5
  } else if (priority === "comfort") {
    w.crowd = (w.crowd ?? 0.10) * 1.5
    w.weather = (w.weather ?? 0.10) * 1.5
  }

  // Problem 6 fix — budgetPreference existed on the User schema but was never
  // actually applied to scoring anywhere. "cheapest" increases cost importance,
  // matching how `priority` already increases importance for its own signal.
  if (preferences.budgetPreference === "cheapest") {
    w.cost = (w.cost ?? 0.15) * 1.5
  } else if (preferences.budgetPreference === "comfort") {
    w.crowd = (w.crowd ?? 0.10) * 1.3
    w.weather = (w.weather ?? 0.10) * 1.3
  }

  if (preferences.walkingTolerance === "low") {
    w.walking = (w.walking ?? 0.20) * 1.6
  } else if (preferences.walkingTolerance === "high") {
    w.walking = (w.walking ?? 0.20) * 0.5
  }

  // Renormalize weights so they sum to ~1.0
  const total = Object.values(w).reduce((a, b) => (a ?? 0) + (b ?? 0), 0)
  if (total > 0) {
    for (const key of Object.keys(w) as Array<keyof LearnedWeights>) {
      if (w[key] !== undefined) w[key] = Number((w[key]! / total).toFixed(4))
    }
  }

  return w
}

/**
 * Calculates a preference bonus/penalty on normalized scale [0, 1] for preferred transport mode.
 * Problem 6 fix — walking-tolerance and priority (reliability/comfort/accessibility)
 * adjustments used to live here TOO, on top of the weight reweighting already done
 * by getPreferenceAdjustedWeights() above, double-counting the same signal. Those
 * branches were removed; getPreferenceAdjustedWeights() is now the single place
 * that applies walkingTolerance and prioritize. Preferred-mode has no equivalent in
 * the weight vector (it's not one of the 7 ML features), so it's the one signal
 * that genuinely belongs only here.
 */
export function calculatePreferenceAdjustment(route: EnrichedRoute, preferences?: UserPreferences): number {
  if (!preferences) return 0
  let adjustment = 0

  // Preferred Transport Mode Preference (Soft bonus) — not represented in the
  // 7-dimensional weight vector, so this is its one and only application point.
  const mode = preferences.preferredMode
  if (mode && mode !== "any") {
    const routeModes = route.modes || route.segments.map((s) => s.mode)
    const hasPreferredMode = routeModes.includes(mode as any)
    if (hasPreferredMode) {
      adjustment += 0.12 // Preference boost for matching preferred transport mode
    }
  }

  return adjustment
}

export const transitDnaService = {
  /**
   * Scores an enriched route using feature extraction, profile weights, and explicit user preferences (0 - 100).
   */
  scoreRoute(
    route: EnrichedRoute,
    customWeights?: LearnedWeights,
    profile?: string,
    preferences?: UserPreferences,
  ): number {
    const vector = extractRouteFeatures(route, [route])
    const baseW = customWeights ?? getProfileWeights(profile)
    const w = getPreferenceAdjustedWeights(baseW, preferences)

    // Linear weighted sum across normalized features
    let score =
      vector.features.time * (w.time ?? 0.25) +
      vector.features.cost * (w.cost ?? 0.15) +
      vector.features.walking * (w.walking ?? 0.20) +
      vector.features.reliability * (w.reliability ?? 0.25) +
      vector.features.accessibility * (w.accessibility ?? 0.15) +
      vector.features.crowd * (w.crowd ?? 0.10) +
      vector.features.weather * (w.weather ?? 0.10)

    // Apply explicit user preference adjustments (mode match, walking bounds, reliability risk)
    score += calculatePreferenceAdjustment(route, preferences)

    return Math.round(Math.max(0, Math.min(1, score)) * 100)
  },

  /**
   * Generates human-readable, honest explainability tags based on actual route features,
   * profile preferences, user preferences, ML personalization state, and reliability metrics.
   */
  generateWhyRecommended(
    route: EnrichedRoute,
    allRoutes: EnrichedRoute[],
    profile?: string,
    preferences?: UserPreferences,
    isPersonalized?: boolean,
  ): string[] {
    const reasons: string[] = []
    if (allRoutes.length <= 1) return ["Only available route for this corridor."]

    const vector = extractRouteFeatures(route, allRoutes)
    const durations = allRoutes.map((r) => r.totalDurationSeconds)
    const fares = allRoutes.map((r) => r.totalFare)
    const walks = allRoutes.map((r) => r.totalWalkingMeters)
    const rels = allRoutes.map((r) => r.reliability?.score ?? 80)

    const minDur = Math.min(...durations)
    const minFare = Math.min(...fares)
    const minWalk = Math.min(...walks)
    const maxRel = Math.max(...rels)

    // 1. Problem 6 — Explicit User Preferences Explainability Tags
    if (preferences?.preferredMode && preferences.preferredMode !== "any") {
      const mode = preferences.preferredMode
      const routeModes = route.modes || route.segments.map((s) => s.mode)
      if (routeModes.includes(mode as any)) {
        const icon = mode === "metro" ? "🚇" : mode === "bus" ? "🚌" : mode === "auto" ? "🛺" : "🚶"
        const modeCap = mode.charAt(0).toUpperCase() + mode.slice(1)
        reasons.push(`${icon} Matches your preferred ${modeCap} mode`)
      }
    }

    if (preferences?.walkingTolerance === "low" && route.totalWalkingMeters <= 400) {
      reasons.push("🚶 Selected for low walking tolerance (<400m walk)")
    }

    if (preferences?.prioritize === "reliability" && (route.reliability?.score ?? 80) === maxRel) {
      reasons.push("🎯 Recommended for high schedule & transfer reliability")
    } else if ((preferences?.prioritize === "speed" || preferences?.prioritize === "time") && route.totalDurationSeconds === minDur) {
      reasons.push("⚡ Optimized for speed priority")
    } else if ((preferences?.prioritize === "cost" || preferences?.prioritize === "cheapest") && route.totalFare === minFare) {
      reasons.push("💰 Lowest fare for budget priority")
    }

    // Problem 23 — budgetPreference explainability (distinct from `prioritize` above).
    // Only claim it when the route genuinely reflects the stated budget preference.
    if (preferences?.budgetPreference === "comfort" && (route.crowd?.level === "LOW" || route.weatherImpact?.weatherFriendly)) {
      reasons.push("🛋️ Comfort preference favors lower crowd and weather impact")
    } else if (preferences?.budgetPreference === "cheapest" && route.totalFare === minFare && !reasons.some((r) => r.includes("fare"))) {
      reasons.push("💰 Budget preference favors lower fare")
    }

    // 2. Problem 2 & 3 — Reliability & Monte Carlo Transfer Risk Explainability
    const riskPercent = route.missedConnectionRisk?.overallRiskPercent ?? 0
    if (riskPercent <= 15 && route.transferCount > 0) {
      reasons.push("🔄 Low transfer & missed-connection risk")
    }
    if ((route.reliability?.score ?? 80) >= 85 && !reasons.some((r) => r.includes("reliability"))) {
      reasons.push("🎯 Predictable arrival time based on historical data")
    }

    // Confidence interval — only claim a real prediction interval when it was actually
    // computed from historical data (isDataDriven). A rule-of-thumb demo fallback must
    // never be presented as a statistically validated interval.
    if (route.confidenceInterval?.isDataDriven === true) {
      reasons.push(`📊 Nominal ${route.confidenceInterval.confidenceLevelPercent}% arrival prediction interval`)
    }

    // 3. Problem 4 & 5 — Profile-Specific Explainability Tags
    if (profile === "wheelchair") {
      if (route.accessibility?.status === "accessible") {
        reasons.push("♿ Step-free access & elevator available")
        reasons.push("👨‍🦽 Wheelchair accessible corridor")
      }
      if (route.totalWalkingMeters === minWalk) {
        reasons.push("👨‍🦽 Shortest rolling distance")
      }
    } else if (profile === "senior") {
      if (route.totalWalkingMeters === minWalk) {
        reasons.push("🧓 Minimal walking distance")
      }
      if (route.transferCount <= 1) {
        reasons.push("🔄 Minimal transfers & low physical effort")
      }
      if (route.accessibility?.status === "accessible") {
        reasons.push("🛗 Lift/escalator available at stations")
      }
    } else if (profile === "pregnant") {
      if (route.totalWalkingMeters === minWalk) {
        reasons.push("🤰 Minimizes walking distance & physical strain")
      }
      if (route.transferCount <= 1) {
        reasons.push("🔄 Fewer transfers & shorter waiting")
      }
      if (route.crowd?.level === "LOW") {
        reasons.push("👥 Low crowd exposure for maximum comfort")
      }
      if (route.weatherImpact?.weatherFriendly) {
        reasons.push("☂️ Weather-protected comfortable route")
      }
    } else if (profile === "luggage") {
      if (route.totalWalkingMeters === minWalk) {
        reasons.push("🧳 Minimal walking distance with heavy luggage")
      }
      if (route.transferCount <= 1) {
        reasons.push("🔄 Simpler transfers & easy interchange")
      }
      if (route.accessibility?.status === "accessible") {
        reasons.push("🛗 Elevators & escalators for easy bag transport")
      }
    } else if (profile === "reduced_mobility") {
      if (route.accessibility?.status === "accessible") {
        reasons.push("🦯 Step-free path & low physical effort")
      }
      if (route.totalWalkingMeters === minWalk) {
        reasons.push("🚶 Shorter walking segments")
      }
      if (route.transferCount <= 1) {
        reasons.push("🔄 Fewer transfers")
      }
    } else if (profile === "stroller") {
      if (route.accessibility?.status === "accessible") {
        reasons.push("👶 Ramp/lift access & stroller-friendly path")
      }
      if (route.totalWalkingMeters === minWalk) {
        reasons.push("🚶 Short stroller rolling distance")
      }
    }

    // 4. Problem 1 — ML Personalization Honesty Tag
    if (isPersonalized === true) {
      reasons.unshift("🧠 Personalized based on your previous route choices")
    }

    // 5. General Criteria Tags (Guaranteed ground truth comparison)
    if (route.totalDurationSeconds === minDur && !reasons.some((r) => r.includes("Fastest") || r.includes("speed"))) {
      reasons.push("⚡ Fastest travel time among options")
    }
    if (route.totalFare === minFare && !reasons.some((r) => r.includes("Fare") || r.includes("fare"))) {
      reasons.push("💰 Lowest estimated fare")
    }
    if (route.totalWalkingMeters === minWalk && reasons.length === 0) {
      reasons.push("🚶 Minimum walking distance")
    }

    // Crowd — grounded against the actual crowd level for this route, not the
    // pregnant-profile-only branch above, so any profile gets an honest crowd tag.
    if (route.crowd?.level === "LOW" && !reasons.some((r) => r.includes("crowd"))) {
      reasons.push("👥 Low crowd exposure")
    }

    // Sustainability — relative (0-100) score, not a real emissions estimate. Only
    // claim it when this route is genuinely at least as good as the best alternative
    // AND strictly ahead of at least one other route (otherwise every route would
    // tie and the claim would be meaningless).
    const sustainabilityScores = allRoutes.map((r) => r.sustainabilityScore ?? 0)
    const maxSustainability = Math.max(...sustainabilityScores)
    if (
      route.sustainabilityScore !== undefined &&
      maxSustainability > 0 &&
      route.sustainabilityScore === maxSustainability &&
      sustainabilityScores.some((s) => s < maxSustainability)
    ) {
      reasons.push("🌱 Higher relative sustainability")
    }

    if (reasons.length === 0) {
      reasons.push("⭐ Optimal multi-criteria balance score")
    }

    return reasons.slice(0, 4)
  },

  /**
   * Triggers Pairwise Logistic Regression learning from a user's explicit route selection.
   * Problem 7 fix — accepts an explicit source so the primary trigger (saving a
   * journey right after route selection) is labelled "USER_CHOICE" rather than
   * always being mislabelled "USER_FEEDBACK".
   */
  async learnFromUserChoice(
    userId: string,
    chosenRoute: EnrichedRoute,
    alternativeRoutes: EnrichedRoute[],
    source: "USER_CHOICE" | "USER_FEEDBACK" = "USER_FEEDBACK",
  ): Promise<LearnedWeights | null> {
    if (!userId || mongoose.connection.readyState !== 1) {
      return null
    }

    try {
      const result = await mlPreferenceService.recordRouteChoice(
        userId,
        chosenRoute,
        alternativeRoutes,
        source,
      )

      const dbUser = await User.findById(userId)
      if (dbUser && result.status.weights) {
        dbUser.transitDNA = {
          totalTrips: (dbUser.transitDNA?.totalTrips ?? 0) + 1,
          lastUpdated: new Date(),
          // Problem 1 fix — persist all 7 learned weights (crowd/weather were
          // previously dropped here even though the ML model learns them).
          learnedWeights: {
            time: result.status.weights.time,
            cost: result.status.weights.cost,
            walking: result.status.weights.walking,
            reliability: result.status.weights.reliability,
            accessibility: result.status.weights.accessibility,
            crowd: result.status.weights.crowd,
            weather: result.status.weights.weather,
          },
        }
        await dbUser.save()
        return result.status.weights
      }
    } catch (err) {
      console.warn("⚠️ TransitDNA Pairwise ML learning update error:", err)
    }

    return null
  },
}

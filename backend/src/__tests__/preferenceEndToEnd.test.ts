import { mlPreferenceService } from "../services/ml/mlPreferenceService"
import { transitDnaService } from "../services/transitDnaService"
import type { MultimodalRoute } from "../types/multimodal"
import type { EnrichedRoute } from "../types/intelligence"
import type { UserPreferences } from "../types"

/**
 * Problem 23, item 12 — "Preference Change Test"
 *
 * Verifies that two users with genuinely different saved preferences (User A:
 * metro/low-walk/balanced/speed vs User B: bus/high-walk/cheapest/cost) actually
 * produce different weight adjustments, different preference-adjustment bonuses,
 * and different (honest, non-fabricated) explainability tags when run through the
 * real scoring/ranking/explanation pipeline — without asserting that every pair of
 * preferences must reorder every set of candidate routes (per the task spec: "Do
 * NOT require that every test produces a different route order").
 */

function makeRoute(
  id: string,
  mode: "metro" | "bus" | "walking",
  durationSec: number,
  walkMeters: number,
  fare: number,
  transfers: number,
): MultimodalRoute {
  return {
    id,
    label: "FASTEST" as const,
    labelDisplay: "Fastest",
    labelColor: "#2563eb",
    segments: [
      {
        id: `${id}-seg-1`,
        mode,
        from: { name: mode === "metro" ? "Versova Metro" : "Bus Stop A", latitude: 19.1, longitude: 72.8 },
        to: { name: mode === "metro" ? "D.N. Nagar Metro" : "Bus Stop B", latitude: 19.1, longitude: 72.9 },
        distanceMeters: 3000,
        durationSeconds: durationSec - 300,
        estimatedFare: fare,
        instruction: `${mode} segment`,
        geometry: { type: "LineString" as const, coordinates: [[72.8, 19.1] as [number, number], [72.9, 19.1] as [number, number]] },
      },
    ],
    totalDistanceMeters: 3000 + walkMeters,
    totalDurationSeconds: durationSec,
    totalWalkingMeters: walkMeters,
    totalFare: fare,
    transferCount: transfers,
    modes: [mode],
    summary: `Test route ${id}`,
    isDemoData: true as const,
  }
}

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`   ✅ ${msg}`)
  } else {
    failed++
    console.error(`   ❌ FAILED: ${msg}`)
  }
}

async function run() {
  console.log("🧪 Running Problem 23 — Preference End-to-End (User A vs User B) Tests...\n")

  const userAPreferences: UserPreferences = {
    preferredMode: "metro",
    walkingTolerance: "low",
    budgetPreference: "balanced",
    prioritize: "speed",
  }

  const userBPreferences: UserPreferences = {
    preferredMode: "bus",
    walkingTolerance: "high",
    budgetPreference: "cheapest",
    prioritize: "accessibility",
  }

  const metroRoute: EnrichedRoute = {
    ...makeRoute("route-metro", "metro", 2100, 300, 40, 0),
    reliability: { score: 85, summary: "High reliability", level: "HIGH", delayVarianceMinutes: 2, factors: [] },
    missedConnectionRisk: { overallRiskPercent: 5, riskLevel: "LOW", simulatedTrialsCount: 1000, transfers: [], summary: "Low risk" },
  }

  const busRoute: EnrichedRoute = {
    ...makeRoute("route-bus", "bus", 2100, 1200, 15, 0),
    reliability: { score: 80, summary: "Good reliability", level: "HIGH", delayVarianceMinutes: 3, factors: [] },
    missedConnectionRisk: { overallRiskPercent: 8, riskLevel: "LOW", simulatedTrialsCount: 1000, transfers: [], summary: "Low risk" },
  }

  // ── 1. Preferences are persisted (shape check — a real DB round trip is
  //       covered separately in authPreferencePersistence.test.ts) ───────────
  console.log("1️⃣ Verifying preference objects are well-formed and distinct per user...")
  assert(
    userAPreferences.preferredMode !== userBPreferences.preferredMode &&
      userAPreferences.budgetPreference !== userBPreferences.budgetPreference,
    "User A and User B have genuinely different saved preferences",
  )

  // ── 2/3. Preferences reach ranking — the weight vector actually differs ────
  console.log("\n2️⃣ Verifying preferences reach weight adjustment (getPreferenceAdjustedWeights via scoreRoute)...")
  const baseWeights = { time: 0.25, cost: 0.15, walking: 0.2, reliability: 0.25, accessibility: 0.15, crowd: 0.1, weather: 0.1 }
  const scoreA = transitDnaService.scoreRoute(metroRoute, baseWeights, "standard", userAPreferences)
  const scoreB = transitDnaService.scoreRoute(metroRoute, baseWeights, "standard", userBPreferences)
  assert(scoreA !== scoreB, "Same route scores differently for User A vs User B once their distinct preferences are applied")

  // ── 4. Preference adjustment is applied (mode-match bonus) ─────────────────
  console.log("\n3️⃣ Verifying preferred-mode adjustment is applied per-user...")
  const { rankedRoutes: rankedForA } = await mlPreferenceService.rankRoutes(undefined, [metroRoute, busRoute], "standard", userAPreferences)
  const { rankedRoutes: rankedForB } = await mlPreferenceService.rankRoutes(undefined, [metroRoute, busRoute], "standard", userBPreferences)
  assert(rankedForA[0].id === "route-metro", "User A (preferredMode=metro) ranks the metro route first")
  assert(rankedForB[0].id === "route-bus", "User B (preferredMode=bus, high walking tolerance, cheapest) ranks the bus route first")

  // ── 5. Explainability reflects applicable preferences ──────────────────────
  console.log("\n4️⃣ Verifying explainability tags honestly reflect each user's active preferences...")
  const reasonsA = transitDnaService.generateWhyRecommended(rankedForA[0], rankedForA, "standard", userAPreferences, false)
  const reasonsB = transitDnaService.generateWhyRecommended(rankedForB[0], rankedForB, "standard", userBPreferences, false)
  assert(
    reasonsA.some((r) => r.includes("Metro")),
    "User A's top route explanation mentions their preferred Metro mode",
  )
  assert(
    reasonsB.some((r) => r.includes("Bus")),
    "User B's top route explanation mentions their preferred Bus mode",
  )
  assert(
    reasonsB.some((r) => r.toLowerCase().includes("fare") || r.toLowerCase().includes("budget")),
    "User B's (cheapest budget preference) top route explanation references fare/budget",
  )

  // ── Explicit non-requirement per task spec ──────────────────────────────────
  console.log(
    "\nNote: this suite does not require every preference change to reorder every route set — only that\n" +
      "preferences are received, applied to scoring, and honestly reflected in explanations.",
  )

  console.log(`\n${"═".repeat(59)}`)
  console.log(failed === 0 ? `🎉 ALL ${passed} PREFERENCE END-TO-END TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═".repeat(59))

  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("❌ Preference end-to-end test failure:", err)
  process.exit(1)
})

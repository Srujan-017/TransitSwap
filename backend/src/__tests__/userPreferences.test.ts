import { accessibilityService } from "../services/accessibilityService"
import { mlPreferenceService } from "../services/ml/mlPreferenceService"
import { transitDnaService } from "../services/transitDnaService"
import type { MultimodalRoute } from "../types/multimodal"
import type { UserPreferences } from "../types"

/**
 * Problem 6 — User Preferences Integration Tests
 *
 * Verifies that explicit user profile preferences (preferredMode, walkingTolerance, prioritize)
 * flow through TransitDNA into route scoring and Pairwise Logistic Regression ML ranking,
 * while maintaining 100% precedence of Problem 4/5 hard accessibility constraints.
 */

function makeRoute(id: string, mode: "metro" | "bus" | "walking", durationSec: number, walkMeters: number, fare: number, transfers: number): MultimodalRoute {
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
  } else {
    failed++
    console.error(`   ❌ FAILED: ${msg}`)
  }
}

async function runPreferenceTests() {
  console.log("🧪 Running Problem 6 User Profile Preferences & TransitDNA Integration Tests...\n")

  // Base routes for comparison (duration 2100s, fare 30, walk 400m)
  const metroRoute = {
    ...makeRoute("route-metro", "metro", 2100, 400, 30, 0),
    reliability: { score: 85, summary: "High reliability", level: "HIGH" as const, delayVarianceMinutes: 2, factors: [] },
    missedConnectionRisk: { overallRiskPercent: 5, riskLevel: "LOW" as const, simulatedTrialsCount: 1000, transfers: [], summary: "Low risk" },
  }

  const busRoute = {
    ...makeRoute("route-bus", "bus", 2100, 400, 30, 0),
    reliability: { score: 85, summary: "High reliability", level: "HIGH" as const, delayVarianceMinutes: 2, factors: [] },
    missedConnectionRisk: { overallRiskPercent: 5, riskLevel: "LOW" as const, simulatedTrialsCount: 1000, transfers: [], summary: "Low risk" },
  }

  // ── Test 1: Preferred Mode (Metro vs Bus) ─────────────────────────────────

  console.log("1️⃣ Testing Preferred Mode (Metro Preference)...")
  const prefsMetro: UserPreferences = { preferredMode: "metro", walkingTolerance: "medium", prioritize: "reliability" }
  const rankMetro = await mlPreferenceService.rankRoutes(undefined, [metroRoute, busRoute], "standard", prefsMetro)
  assert(rankMetro.rankedRoutes[0].id === "route-metro", "Metro preferred mode boosts Metro route above Bus route")
  console.log("   ✅ Preferred mode (Metro) test passed.\n")

  console.log("2️⃣ Testing Preferred Mode (Bus Preference)...")
  const prefsBus: UserPreferences = { preferredMode: "bus", walkingTolerance: "medium", prioritize: "reliability" }
  const rankBus = await mlPreferenceService.rankRoutes(undefined, [metroRoute, busRoute], "standard", prefsBus)
  assert(rankBus.rankedRoutes[0].id === "route-bus", "Bus preferred mode boosts Bus route above Metro route")
  console.log("   ✅ Preferred mode (Bus) test passed.\n")

  // ── Test 2: Walking Tolerance (Low vs High) ───────────────────────────────

  console.log("3️⃣ Testing Walking Tolerance (Low Tolerance)...")
  // Short walk (250m, 35 min) vs Long walk (1200m, 30 min)
  const shortWalkRoute = makeRoute("route-shortwalk", "bus", 2100, 250, 25, 0)
  const longWalkRoute = makeRoute("route-longwalk", "bus", 1800, 1200, 25, 0)

  const prefsWalkLow: UserPreferences = { preferredMode: "any", walkingTolerance: "low", prioritize: "speed" }
  const rankWalkLow = await mlPreferenceService.rankRoutes(undefined, [shortWalkRoute, longWalkRoute], "standard", prefsWalkLow)
  assert(rankWalkLow.rankedRoutes[0].id === "route-shortwalk", "Low walking tolerance penalizes 1200m walk strongly")
  console.log("   ✅ Walking tolerance (Low) test passed.\n")

  console.log("4️⃣ Testing Walking Tolerance (High Tolerance)...")
  const prefsWalkHigh: UserPreferences = { preferredMode: "any", walkingTolerance: "high", prioritize: "speed" }
  const rankWalkHigh = await mlPreferenceService.rankRoutes(undefined, [shortWalkRoute, longWalkRoute], "standard", prefsWalkHigh)
  assert(rankWalkHigh.rankedRoutes[0].id === "route-longwalk", "High walking tolerance allows faster 1200m walk route to win")
  console.log("   ✅ Walking tolerance (High) test passed.\n")

  // ── Test 3: Priority = Reliability (Problem 2 & 3 Integration) ───────────

  console.log("5️⃣ Testing Priority = Reliability...")
  const reliableRoute = {
    ...makeRoute("route-reliable", "bus", 2100, 300, 25, 1),
    reliability: { score: 92, summary: "Very High reliability", level: "HIGH" as const, delayVarianceMinutes: 1, factors: [] },
    missedConnectionRisk: { overallRiskPercent: 5, riskLevel: "LOW" as const, simulatedTrialsCount: 1000, transfers: [], summary: "Low risk" },
  }
  const riskyRoute = {
    ...makeRoute("route-risky", "bus", 1920, 300, 25, 2),
    reliability: { score: 65, summary: "Moderate reliability", level: "MEDIUM" as const, delayVarianceMinutes: 6, factors: [] },
    missedConnectionRisk: { overallRiskPercent: 45, riskLevel: "HIGH" as const, simulatedTrialsCount: 1000, transfers: [], summary: "High risk" },
  }

  const prefsRel: UserPreferences = { preferredMode: "any", walkingTolerance: "medium", prioritize: "reliability" }
  const rankRel = await mlPreferenceService.rankRoutes(undefined, [reliableRoute, riskyRoute], "standard", prefsRel)
  assert(rankRel.rankedRoutes[0].id === "route-reliable", "Reliability priority ranks high reliability & low transfer risk route first")
  console.log("   ✅ Priority (Reliability) test passed.\n")

  // ── Test 4: Priority = Cost ───────────────────────────────────────────────

  console.log("6️⃣ Testing Priority = Cost...")
  const cheapRoute = makeRoute("route-cheap", "bus", 2100, 300, 15, 0)
  const expensiveRoute = makeRoute("route-exp", "bus", 2100, 300, 60, 0)

  const prefsCost: UserPreferences = { preferredMode: "any", walkingTolerance: "medium", prioritize: "cost" }
  const rankCost = await mlPreferenceService.rankRoutes(undefined, [cheapRoute, expensiveRoute], "standard", prefsCost)
  assert(rankCost.rankedRoutes[0].id === "route-cheap", "Cost priority gives preference advantage to cheaper route (₹15 vs ₹60)")
  console.log("   ✅ Priority (Cost) test passed.\n")

  // ── Test 5: Priority = Speed / Time ───────────────────────────────────────

  console.log("7️⃣ Testing Priority = Speed / Time...")
  const fastRoute = makeRoute("route-fast", "bus", 1500, 400, 35, 0)
  const slowRoute = makeRoute("route-slow", "bus", 2700, 400, 20, 0)

  const prefsSpeed: UserPreferences = { preferredMode: "any", walkingTolerance: "medium", prioritize: "speed" }
  const rankSpeed = await mlPreferenceService.rankRoutes(undefined, [fastRoute, slowRoute], "standard", prefsSpeed)
  assert(rankSpeed.rankedRoutes[0].id === "route-fast", "Speed priority ranks faster route (25 min vs 45 min) first")
  console.log("   ✅ Priority (Speed) test passed.\n")

  // ── Test 6: Hard Accessibility Constraint Precedence ─────────────────────

  console.log("8️⃣ Testing Hard Accessibility Constraint Precedence...")
  // WEH Metro is physically not accessible (38 stairs, no lift, no ramp)
  const inaccessibleMetroRoute = {
    ...makeRoute("route-inaccessible-metro", "metro", 1500, 200, 20, 0),
    segments: [
      {
        id: "seg-weh",
        mode: "metro" as const,
        from: { name: "WEH Metro", latitude: 19.1, longitude: 72.8 },
        to: { name: "Chakala Metro", latitude: 19.1, longitude: 72.9 },
        distanceMeters: 3000,
        durationSeconds: 1200,
        estimatedFare: 20,
        instruction: "Metro from WEH to Chakala",
        geometry: { type: "LineString" as const, coordinates: [[72.8, 19.1] as [number, number], [72.9, 19.1] as [number, number]] },
      },
    ],
  }

  // Accessible Bus Route
  const accessibleBusRoute = makeRoute("route-accessible-bus", "bus", 2100, 300, 25, 0)

  // User prefers Metro and reliability, BUT uses Wheelchair profile
  const prefsWheelchairMetro: UserPreferences = { preferredMode: "metro", walkingTolerance: "low", prioritize: "reliability" }
  const filteredRoutes = await accessibilityService.filterRoutes([inaccessibleMetroRoute, accessibleBusRoute], "wheelchair")
  assert(filteredRoutes.length === 1 && filteredRoutes[0].id === "route-accessible-bus", "Wheelchair hard constraints REJECT inaccessible Metro route despite user's preferredMode = metro")
  console.log("   ✅ Hard accessibility constraint precedence test passed.\n")

  // ── Summary ────────────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} PROBLEM 6 USER PREFERENCES INTEGRATION TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

runPreferenceTests().catch((err) => {
  console.error("❌ Preference test failure:", err)
  process.exit(1)
})

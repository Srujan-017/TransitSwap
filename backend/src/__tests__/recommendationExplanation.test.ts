import { transitDnaService } from "../services/transitDnaService"
import type { EnrichedRoute } from "../types/intelligence"
import type { UserPreferences } from "../types"

/**
 * Problem 7 — Explainable & Trustworthy Recommendation Layer Unit Tests
 *
 * Verifies that the recommendation layer translates real calculated route features,
 * explicit preferences, ML personalization states, prediction intervals, and Monte Carlo
 * transfer risks into honest, human-readable, non-contradictory explainability tags.
 */

function makeEnrichedRoute(
  id: string,
  mode: "metro" | "bus" | "walking",
  durationSec: number,
  walkMeters: number,
  fare: number,
  relScore: number,
  riskPercent: number,
  accStatus: "accessible" | "not_accessible" | "unknown" = "accessible",
  crowdLevel: "LOW" | "MEDIUM" | "HIGH" | undefined = undefined,
  sustainabilityScore: number | undefined = undefined,
  isDataDriven = true,
): EnrichedRoute {
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
    transferCount: 1,
    modes: [mode],
    summary: `Test route ${id}`,
    isDemoData: true as const,
    reliability: {
      score: relScore,
      summary: "Historical reliability",
      level: "HIGH" as const,
      delayVarianceMinutes: 2,
      factors: [],
    },
    confidenceInterval: {
      expectedArrivalMin: "8:57 AM",
      expectedArrivalMax: "9:03 AM",
      meanDurationMinutes: Math.round(durationSec / 60),
      lowerBoundMinutes: Math.round(durationSec / 60) - 2,
      upperBoundMinutes: Math.round(durationSec / 60) + 3,
      confidenceLevelPercent: isDataDriven ? 90 : 0,
      explanation: "Historical arrival interval",
      isDataDriven,
    },
    missedConnectionRisk: {
      overallRiskPercent: riskPercent,
      riskLevel: riskPercent <= 15 ? "LOW" : "HIGH",
      simulatedTrialsCount: 1000,
      transfers: [],
      summary: "Transfer risk analysis",
    },
    accessibility: {
      profile: "standard",
      status: accStatus,
      blocked: false,
      summary: "Accessibility score",
      warnings: [],
      checkedStations: [],
      accessibilityScore: 85,
      rejectionReason: null,
      dataSource: "synthetic_demo",
    },
    crowd: crowdLevel
      ? { level: crowdLevel, source: "DEMO_DATA", summary: "Demo crowd data", stations: [] }
      : undefined,
    sustainabilityScore,
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

function runExplanationTests() {
  console.log("🧪 Running Problem 7 Explainable & Trustworthy Recommendation Layer Tests...\n")

  const routeMetro = makeEnrichedRoute("route-metro", "metro", 1800, 300, 30, 90, 8, "accessible")
  const routeBus = makeEnrichedRoute("route-bus", "bus", 2100, 600, 20, 75, 35, "accessible")
  const allRoutes = [routeMetro, routeBus]

  // ── Test 1: Grounded Preferred Mode Reason ─────────────────────────────────

  console.log("1️⃣ Testing Preferred Mode Grounded Reason...")
  const prefsMetro: UserPreferences = { preferredMode: "metro", walkingTolerance: "medium", prioritize: "speed" }
  const reasonsMetro = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "standard", prefsMetro, false)
  assert(reasonsMetro.some((r) => r.includes("Matches your preferred Metro mode")), "Metro route includes preferred Metro mode tag")

  const reasonsBus = transitDnaService.generateWhyRecommended(routeBus, allRoutes, "standard", prefsMetro, false)
  assert(!reasonsBus.some((r) => r.includes("preferred Metro mode")), "Bus route DOES NOT falsely claim preferred Metro mode tag")
  console.log("   ✅ Preferred mode grounded reason test passed.\n")

  // ── Test 2: Honest Personalization Claim (Trained vs New User) ─────────────

  console.log("2️⃣ Testing Honest Personalization Claim...")
  const reasonsNewUser = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "standard", prefsMetro, false)
  assert(!reasonsNewUser.some((r) => r.includes("previous route choices")), "New user (isPersonalized=false) DOES NOT falsely claim historical learning")

  const reasonsTrainedUser = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "standard", prefsMetro, true)
  assert(reasonsTrainedUser.some((r) => r.includes("previous route choices")), "Trained user (isPersonalized=true) honestly displays ML personalization tag")
  console.log("   ✅ Honest personalization claim test passed.\n")

  // ── Test 3: Problem 2 Reliability & Prediction Interval Explanation ────────

  console.log("3️⃣ Testing Reliability & Prediction Interval Explanation...")
  const reasonsRel = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "standard", undefined, false)
  assert(reasonsRel.some((r) => r.includes("Predictable arrival time")), "High reliability route includes predictable arrival time tag")
  console.log("   ✅ Reliability & prediction interval explanation test passed.\n")

  // ── Test 4: Problem 3 Monte Carlo Transfer Risk Explanation ───────────────

  console.log("4️⃣ Testing Monte Carlo Transfer Risk Explanation...")
  assert(reasonsRel.some((r) => r.includes("Low transfer & missed-connection risk")), "Low risk route (8%) includes low transfer risk tag")
  
  const reasonsHighRisk = transitDnaService.generateWhyRecommended(routeBus, allRoutes, "standard", undefined, false)
  assert(!reasonsHighRisk.some((r) => r.includes("Low transfer")), "High risk route (35%) DOES NOT falsely claim low transfer risk")
  console.log("   ✅ Monte Carlo transfer risk explanation test passed.\n")

  // ── Test 5: Problem 4 & 5 Accessibility Explanation Ground Truth ─────────

  console.log("5️⃣ Testing Accessibility Explanation Ground Truth...")
  const reasonsWheelchair = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "wheelchair", undefined, false)
  assert(reasonsWheelchair.some((r) => r.includes("Step-free access")), "Wheelchair profile route includes step-free access tag")
  console.log("   ✅ Accessibility ground truth explanation test passed.\n")

  // ── Test 6: No Contradictory Claims (Speed / Cost Ground Truth) ───────────

  console.log("6️⃣ Testing No Contradictory Claims...")
  // routeMetro: 1800s (fastest), routeBus: 2100s (slower)
  const reasonsFast = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "standard", undefined, false)
  assert(reasonsFast.some((r) => r.includes("Fastest travel time")), "Fastest route includes fastest travel time tag")

  const reasonsSlow = transitDnaService.generateWhyRecommended(routeBus, allRoutes, "standard", undefined, false)
  assert(!reasonsSlow.some((r) => r.includes("Fastest travel time")), "Slower route DOES NOT falsely claim fastest travel time")
  console.log("   ✅ No contradictory claims test passed.\n")

  // ── Test 7: Fare Ground Truth ──────────────────────────────────────────────

  console.log("7️⃣ Testing Fare Ground Truth...")
  // routeMetro fare=30, routeBus fare=20 -> routeBus has the lower fare here
  const reasonsLowFare = transitDnaService.generateWhyRecommended(routeBus, allRoutes, "standard", undefined, false)
  assert(reasonsLowFare.some((r) => r.includes("Lowest estimated fare")), "Route with the minimum fare among candidates includes lowest-fare tag")

  const reasonsHighFare = transitDnaService.generateWhyRecommended(routeMetro, allRoutes, "standard", undefined, false)
  assert(!reasonsHighFare.some((r) => r.includes("Lowest estimated fare")), "Route without the minimum fare DOES NOT falsely claim lowest fare")
  console.log("   ✅ Fare ground truth test passed.\n")

  // ── Test 8: Crowd Ground Truth ─────────────────────────────────────────────

  console.log("8️⃣ Testing Crowd Ground Truth...")
  // Reliability/risk/confidence deliberately kept unremarkable here so those signals
  // don't compete with — and crowd out — the one signal actually under test.
  const routeLowCrowd = makeEnrichedRoute("route-low-crowd", "metro", 1800, 300, 30, 70, 25, "accessible", "LOW", undefined, false)
  const routeHighCrowd = makeEnrichedRoute("route-high-crowd", "metro", 1800, 300, 30, 70, 25, "accessible", "HIGH", undefined, false)
  const crowdRoutes = [routeLowCrowd, routeHighCrowd]

  const reasonsLowCrowd = transitDnaService.generateWhyRecommended(routeLowCrowd, crowdRoutes, "standard", undefined, false)
  assert(reasonsLowCrowd.some((r) => r.includes("Low crowd exposure")), "LOW crowd route includes low-crowd tag")

  const reasonsHighCrowd = transitDnaService.generateWhyRecommended(routeHighCrowd, crowdRoutes, "standard", undefined, false)
  assert(!reasonsHighCrowd.some((r) => r.includes("Low crowd exposure")), "HIGH crowd route DOES NOT falsely claim low crowd exposure")
  console.log("   ✅ Crowd ground truth test passed.\n")

  // ── Test 9: Confidence Interval Honesty ────────────────────────────────────

  console.log("9️⃣ Testing Confidence Interval Honesty...")
  const routeDataDriven = makeEnrichedRoute("route-data-driven", "metro", 1800, 300, 30, 70, 25, "accessible", undefined, undefined, true)
  const routeDataDrivenPeer = makeEnrichedRoute("route-data-driven-peer", "bus", 1800, 300, 30, 70, 25, "accessible", undefined, undefined, true)
  const routePrototype = makeEnrichedRoute("route-prototype", "metro", 1800, 300, 30, 70, 25, "accessible", undefined, undefined, false)
  const routePrototypePeer = makeEnrichedRoute("route-prototype-peer", "bus", 1800, 300, 30, 70, 25, "accessible", undefined, undefined, false)

  const reasonsDataDriven = transitDnaService.generateWhyRecommended(routeDataDriven, [routeDataDriven, routeDataDrivenPeer], "standard", undefined, false)
  assert(reasonsDataDriven.some((r) => r.includes("arrival prediction interval")), "Data-driven confidence interval includes nominal interval tag")

  const reasonsPrototype = transitDnaService.generateWhyRecommended(routePrototype, [routePrototype, routePrototypePeer], "standard", undefined, false)
  assert(!reasonsPrototype.some((r) => r.includes("arrival prediction interval")), "Non-data-driven (prototype) interval DOES NOT falsely claim a statistical prediction interval")
  console.log("   ✅ Confidence interval honesty test passed.\n")

  // ── Test 10: Sustainability Ground Truth ───────────────────────────────────

  console.log("🔟 Testing Sustainability Ground Truth...")
  const routeGreener = makeEnrichedRoute("route-greener", "metro", 1800, 300, 30, 70, 25, "accessible", undefined, 80, false)
  const routeLessGreen = makeEnrichedRoute("route-less-green", "bus", 1800, 300, 30, 70, 25, "accessible", undefined, 40, false)
  const sustainabilityRoutes = [routeGreener, routeLessGreen]

  const reasonsGreener = transitDnaService.generateWhyRecommended(routeGreener, sustainabilityRoutes, "standard", undefined, false)
  assert(reasonsGreener.some((r) => r.includes("sustainability")), "Route with the highest relative sustainability score includes sustainability tag")

  const reasonsLessGreen = transitDnaService.generateWhyRecommended(routeLessGreen, sustainabilityRoutes, "standard", undefined, false)
  assert(!reasonsLessGreen.some((r) => r.includes("sustainability")), "Route without the highest sustainability score DOES NOT falsely claim it")
  console.log("   ✅ Sustainability ground truth test passed.\n")

  // ── Test 11: Truthful Fallback ─────────────────────────────────────────────

  console.log("1️⃣1️⃣ Testing Truthful Fallback...")
  // routeNeutral is strictly worse on every ground-truth criterion than routeBetter
  // (slower, pricier, more walking, unremarkable reliability/risk/crowd/sustainability),
  // so it has no honest grounds for any specific claim and must fall back to the
  // generic truthful message rather than showing a false or misleading reason.
  const routeBetter = makeEnrichedRoute("route-better", "metro", 1200, 100, 10, 95, 5, "accessible", "LOW", 90, true)
  const routeNeutral = makeEnrichedRoute("route-neutral", "bus", 2400, 900, 50, 70, 30, "unknown", "HIGH", 20, false)
  const reasonsFallback = transitDnaService.generateWhyRecommended(routeNeutral, [routeBetter, routeNeutral], "standard", undefined, false)
  assert(reasonsFallback.some((r) => r.includes("Optimal multi-criteria balance")), "Route with no valid specific reasons uses the truthful fallback")
  console.log("   ✅ Truthful fallback test passed.\n")

  // ── Summary ────────────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} PROBLEM 7 EXPLANATION LAYER UNIT TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

try {
  runExplanationTests()
} catch (err) {
  console.error("❌ Recommendation explanation test failure:", err)
  process.exit(1)
}

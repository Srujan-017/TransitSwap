import { accessibilityService } from "../services/accessibilityService"
import { mlPreferenceService } from "../services/ml/mlPreferenceService"
import { DEMO_ACCESSIBILITY_DATA } from "../data/accessibilityData"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * Problem 4 — Accessibility Dataset, Validation, Routing & Profile Tests
 *
 * Tests the complete accessibility pipeline:
 * 1. Demo dataset structure validation
 * 2. Station accessibility lookup
 * 3. Wheelchair hard-constraint filtering
 * 4. Stroller profile routing
 * 5. Senior profile routing
 * 6. Pregnant profile routing
 * 7. Luggage profile routing
 * 8. Reduced mobility routing
 * 9. Standard profile (no unnecessary restrictions)
 * 10. Accessibility score calculation
 * 11. Route rejection explanation
 * 12. Data source identification
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRoute(stationNames: string[]): MultimodalRoute {
  const segments = []
  for (let i = 0; i < stationNames.length - 1; i++) {
    segments.push({
      id: `seg-${i}`,
      mode: "metro" as const,
      from: { name: stationNames[i], latitude: 19.1, longitude: 72.8 },
      to: { name: stationNames[i + 1], latitude: 19.1, longitude: 72.9 },
      distanceMeters: 3000,
      durationSeconds: 600,
      estimatedFare: 15,
      instruction: `Metro from ${stationNames[i]} to ${stationNames[i + 1]}`,
      geometry: { type: "LineString" as const, coordinates: [[72.8, 19.1] as [number, number], [72.9, 19.1] as [number, number]] },
    })
  }
  return {
    id: "test-route",
    label: "FASTEST" as const,
    labelDisplay: "Fastest",
    labelColor: "#2563eb",
    segments,
    totalDistanceMeters: 6000,
    totalDurationSeconds: 1200,
    totalWalkingMeters: 200,
    totalFare: 30,
    transferCount: stationNames.length > 2 ? 1 : 0,
    modes: ["metro"] as any,
    summary: "Test route",
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

async function runAccessibilityTests() {
  console.log("🧪 Running Problem 4 Accessibility Dataset & Routing Tests...\n")

  // ── Test 1: Demo Dataset Structure ──────────────────────────────────────

  console.log("1️⃣  Testing Demo Dataset Structure Validation...")
  assert(DEMO_ACCESSIBILITY_DATA.length >= 20, `Dataset has ${DEMO_ACCESSIBILITY_DATA.length} records (expected >= 20)`)

  for (const record of DEMO_ACCESSIBILITY_DATA) {
    assert(typeof record.stationId === "string" && record.stationId.length > 0, `stationId is valid for ${record.stationName}`)
    assert(typeof record.stationName === "string", `stationName is valid for ${record.stationId}`)
    assert(record.transportMode === "metro" || record.transportMode === "bus", `transportMode is valid for ${record.stationId}`)
    assert(typeof record.latitude === "number" || record.latitude === null, `latitude is valid for ${record.stationId}`)
    assert(typeof record.longitude === "number" || record.longitude === null, `longitude is valid for ${record.stationId}`)
    assert(record.verificationSource === "synthetic_demo", `verificationSource is synthetic_demo for ${record.stationId}`)
    assert(typeof record.notes === "string", `notes is present for ${record.stationId}`)
    assert(["accessible", "partially_accessible", "not_accessible", "unknown"].includes(record.status), `status is valid enum for ${record.stationId}`)
  }

  // Check variety exists
  const statuses = new Set(DEMO_ACCESSIBILITY_DATA.map((r) => r.status))
  assert(statuses.has("accessible"), "Dataset has accessible stations")
  assert(statuses.has("partially_accessible"), "Dataset has partially accessible stations")
  assert(statuses.has("not_accessible"), "Dataset has not-accessible stations")
  assert(statuses.has("unknown"), "Dataset has unknown-status stations")
  console.log("   ✅ Demo dataset structure validation passed.\n")

  // ── Test 2: Station Lookup ─────────────────────────────────────────────

  console.log("2️⃣  Testing Station Accessibility Lookup...")
  const stations = await accessibilityService.listStations()
  assert(stations.length > 0, "listStations returns records")

  const versova = await accessibilityService.getStation("m1-01")
  assert(versova !== null, "getStation('m1-01') returns Versova Metro")
  assert(versova!.stationName === "Versova Metro", "Station name matches")
  assert(versova!.hasLift === true, "Versova has lift")
  assert(versova!.stepFreeEntrance === true, "Versova has step-free entrance")

  const weh = await accessibilityService.getStation("m1-05")
  assert(weh !== null, "getStation('m1-05') returns WEH Metro")
  assert(weh!.status === "not_accessible", "WEH is not accessible")
  assert(weh!.hasLift === false, "WEH has no lift")
  assert(weh!.stairCount === 38, "WEH has 38 stairs")

  const notFound = await accessibilityService.getStation("nonexistent")
  assert(notFound === null, "Nonexistent station returns null")
  console.log("   ✅ Station lookup tests passed.\n")

  // ── Test 3: Wheelchair Hard-Constraint Filtering ──────────────────────

  console.log("3️⃣  Testing Wheelchair Hard-Constraint Filtering...")

  // Route through accessible stations only — should pass
  const accessibleRoute = makeRoute(["Versova Metro", "D.N. Nagar Metro", "Andheri Metro"])
  const accEval = await accessibilityService.evaluateRoute(accessibleRoute, "wheelchair")
  assert(accEval.blocked === false, "Accessible route is NOT blocked for wheelchair")
  assert(accEval.accessibilityScore > 0, `Accessibility score is ${accEval.accessibilityScore} (> 0)`)
  assert(accEval.rejectionReason === null, "No rejection reason for accessible route")

  // Route through NOT accessible station — should be blocked
  const blockedRoute = makeRoute(["Versova Metro", "WEH Metro", "Chakala Metro"])
  const blockEval = await accessibilityService.evaluateRoute(blockedRoute, "wheelchair")
  assert(blockEval.blocked === true, "Route through WEH Metro IS blocked for wheelchair")
  assert(blockEval.rejectionReason !== null, "Rejection reason is provided")
  assert(blockEval.rejectionReason!.includes("WEH Metro"), "Rejection reason names the blocking station")
  assert(blockEval.accessibilityScore === 0, "Blocked route score is 0")
  console.log(`   Rejection: "${blockEval.rejectionReason}"`)

  // Filter routes — blocked route should be excluded
  const allRoutes = [accessibleRoute, blockedRoute]
  const filtered = await accessibilityService.filterRoutes(allRoutes, "wheelchair")
  assert(filtered.length === 1, `filterRoutes returns ${filtered.length} accessible route(s) (expected 1)`)
  console.log("   ✅ Wheelchair hard-constraint filtering passed.\n")

  // ── Test 4: Stroller Profile ───────────────────────────────────────────

  console.log("4️⃣  Testing Stroller Profile Routing...")
  const strollerEvalAccessible = await accessibilityService.evaluateRoute(accessibleRoute, "stroller")
  assert(strollerEvalAccessible.blocked === false, "Accessible route is NOT blocked for stroller")

  const strollerEvalBlocked = await accessibilityService.evaluateRoute(blockedRoute, "stroller")
  // Stroller at WEH: 38 stairs + no lift + no ramp → blocked (> 20 stairs)
  assert(strollerEvalBlocked.blocked === true, "WEH (38 stairs, no lift/ramp) is blocked for stroller")
  console.log("   ✅ Stroller profile tests passed.\n")

  // ── Test 5: Senior Profile ─────────────────────────────────────────────

  console.log("5️⃣  Testing Senior Profile Routing...")
  const seniorEvalAccessible = await accessibilityService.evaluateRoute(accessibleRoute, "senior")
  assert(seniorEvalAccessible.blocked === false, "Accessible route is NOT blocked for senior")

  // WEH has 38 stairs but only blocked if status="not_accessible" AND stairCount > 35
  const seniorEvalWeh = await accessibilityService.evaluateRoute(blockedRoute, "senior")
  assert(seniorEvalWeh.blocked === true, "WEH (38 stairs, not_accessible) is blocked for senior")
  assert(seniorEvalWeh.warnings.length > 0, "Senior profile generates warnings")
  console.log("   ✅ Senior profile tests passed.\n")

  // ── Test 6: Pregnant Profile ───────────────────────────────────────────

  console.log("6️⃣  Testing Pregnant Profile Routing...")
  const pregnantEval = await accessibilityService.evaluateRoute(accessibleRoute, "pregnant")
  assert(pregnantEval.blocked === false, "Accessible route is NOT blocked for pregnant")

  const pregnantEvalWeh = await accessibilityService.evaluateRoute(blockedRoute, "pregnant")
  assert(pregnantEvalWeh.blocked === true, "WEH (38 stairs, not_accessible) is blocked for pregnant")
  console.log("   ✅ Pregnant profile tests passed.\n")

  // ── Test 7: Luggage Profile ────────────────────────────────────────────

  console.log("7️⃣  Testing Luggage Profile Routing...")
  const luggageEval = await accessibilityService.evaluateRoute(accessibleRoute, "luggage")
  assert(luggageEval.blocked === false, "Accessible route is NOT blocked for luggage")
  console.log("   ✅ Luggage profile tests passed.\n")

  // ── Test 8: Reduced Mobility ───────────────────────────────────────────

  console.log("8️⃣  Testing Reduced Mobility Profile Routing...")
  const rmEval = await accessibilityService.evaluateRoute(accessibleRoute, "reduced_mobility")
  assert(rmEval.blocked === false, "Accessible route is NOT blocked for reduced_mobility")

  const rmEvalWeh = await accessibilityService.evaluateRoute(blockedRoute, "reduced_mobility")
  assert(rmEvalWeh.blocked === true, "WEH (not_accessible) is blocked for reduced_mobility")
  console.log("   ✅ Reduced mobility profile tests passed.\n")

  // ── Test 9: Standard Profile ───────────────────────────────────────────

  console.log("9️⃣  Testing Standard Profile (no unnecessary restrictions)...")
  const stdEval = await accessibilityService.evaluateRoute(blockedRoute, "standard")
  assert(stdEval.blocked === false, "Standard profile does NOT block any route")
  assert(stdEval.accessibilityScore > 0, "Standard profile still gets an accessibility score")
  console.log("   ✅ Standard profile tests passed.\n")

  // ── Test 10: Accessibility Score ───────────────────────────────────────

  console.log("🔟 Testing Accessibility Score Calculation...")
  const fullAccessRoute = makeRoute(["Versova Metro", "D.N. Nagar Metro"])
  const fullEval = await accessibilityService.evaluateRoute(fullAccessRoute, "standard")
  assert(fullEval.accessibilityScore >= 80, `Fully accessible route score is ${fullEval.accessibilityScore} (expected >= 80)`)

  const partialRoute = makeRoute(["Azad Nagar Metro", "Andheri Metro"])
  const partialEval = await accessibilityService.evaluateRoute(partialRoute, "standard")
  assert(partialEval.accessibilityScore >= 50, `Partially accessible route score is ${partialEval.accessibilityScore} (expected >= 50)`)
  assert(partialEval.accessibilityScore <= fullEval.accessibilityScore, "Partial score is <= full accessible score")
  console.log("   ✅ Accessibility score calculation passed.\n")

  // ── Test 11: Data Source ───────────────────────────────────────────────

  console.log("1️⃣1️⃣ Testing Data Source Identification...")
  assert(fullEval.dataSource === "synthetic_demo", `Data source is "${fullEval.dataSource}" (expected synthetic_demo)`)
  console.log("   ✅ Data source identification passed.\n")

  // ── Test 12: Transfer Station Accessibility Check ────────────────────────────

  console.log("1️⃣2️⃣ Testing Transfer Station Accessibility Check...")
  const transferRoute = makeRoute(["Versova Metro", "Azad Nagar Metro", "Andheri Metro", "WEH Metro"])
  const transferEval = await accessibilityService.evaluateRoute(transferRoute, "wheelchair")
  assert(transferEval.blocked === true, "Route with WEH transfer is blocked for wheelchair")
  assert(transferEval.checkedStations.length >= 3, `Checked ${transferEval.checkedStations.length} stations (expected >= 3)`)
  console.log("   ✅ Transfer station check passed.\n")

  // ── Test 13: Problem 5 Profile Diversity Test Scenario 1 ──────────────────

  console.log("1️⃣3️⃣ Testing Problem 5 Profile Diversity Scenario 1 (Route A: 0 stairs, lift vs Route B: 20 stairs, no lift)...")
  // Route A: 10 min walk (600m), 0 stairs (Versova), 1 transfer
  const routeA1Raw = {
    ...makeRoute(["Versova Metro", "D.N. Nagar Metro"]),
    id: "route-A1",
    totalWalkingMeters: 600,
    totalDurationSeconds: 1200,
    transferCount: 1,
  }
  // Route B: 6 min walk (360m), 38 stairs (WEH), 2 transfers
  const routeB1Raw = {
    ...makeRoute(["WEH Metro", "Chakala Metro", "Airport Road Metro"]),
    id: "route-B1",
    totalWalkingMeters: 360,
    totalDurationSeconds: 960,
    transferCount: 2,
  }

  // Wheelchair: Route B must be rejected
  const wcFilter = await accessibilityService.filterRoutes([routeA1Raw, routeB1Raw], "wheelchair")
  assert(wcFilter.length === 1 && wcFilter[0].id === "route-A1", "Wheelchair profile rejects Route B (no lift, 38 stairs)")

  // Senior: Route A must be preferred over Route B
  const seniorFiltered = await accessibilityService.filterRoutes([routeA1Raw, routeB1Raw], "senior")
  const seniorRank = await mlPreferenceService.rankRoutes("test-user", seniorFiltered, "senior")
  assert(seniorRank.rankedRoutes[0].id === "route-A1", "Senior profile ranks Route A (0 stairs, lift) above Route B (38 stairs)")

  // Luggage: Route A must be preferred over Route B
  const luggageFiltered = await accessibilityService.filterRoutes([routeA1Raw, routeB1Raw], "luggage")
  const luggageRank = await mlPreferenceService.rankRoutes("test-user", luggageFiltered, "luggage")
  assert(luggageRank.rankedRoutes[0].id === "route-A1", "Luggage profile ranks Route A (0 stairs, lift) above Route B (38 stairs)")

  // Reduced Mobility: Route A must be preferred over Route B
  const rmFiltered = await accessibilityService.filterRoutes([routeA1Raw, routeB1Raw], "reduced_mobility")
  const rmRank = await mlPreferenceService.rankRoutes("test-user", rmFiltered, "reduced_mobility")
  assert(rmRank.rankedRoutes[0].id === "route-A1", "Reduced Mobility ranks Route A above Route B")
  console.log("   ✅ Problem 5 Scenario 1 profile diversity passed.\n")

  // ── Test 14: Problem 5 Profile Diversity Test Scenario 2 ──────────────────

  console.log("1️⃣4️⃣ Testing Problem 5 Profile Diversity Scenario 2 (Route A: 15m walk, 0 stairs vs Route B: 7m walk, 44 stairs)...")
  // Route A: 15 min walk (900m), 0 stairs (Versova), 1 transfer
  const routeA2Raw = {
    ...makeRoute(["Versova Metro", "D.N. Nagar Metro"]),
    id: "route-A2",
    totalWalkingMeters: 900,
    totalDurationSeconds: 1500,
    transferCount: 1,
  }
  // Route B: 7 min walk (420m), 44 stairs (Saki Naka), 2 transfers
  const routeB2Raw = {
    ...makeRoute(["Saki Naka Metro", "Asalpha Metro", "Ghatkopar Metro"]),
    id: "route-B2",
    totalWalkingMeters: 420,
    totalDurationSeconds: 900,
    transferCount: 2,
  }

  // Senior: Prefers Route A (0 stairs) over Route B (44 stairs)
  const seniorFiltered2 = await accessibilityService.filterRoutes([routeA2Raw, routeB2Raw], "senior")
  const seniorRank2 = await mlPreferenceService.rankRoutes("test-user", seniorFiltered2, "senior")
  assert(seniorRank2.rankedRoutes[0].id === "route-A2", "Senior profile prefers Route A (0 stairs) over Route B (44 stairs)")

  // Pregnant: Prefers Route A (0 stairs, 1 transfer) over Route B (44 stairs, 2 transfers)
  const pregFiltered2 = await accessibilityService.filterRoutes([routeA2Raw, routeB2Raw], "pregnant")
  const pregRank2 = await mlPreferenceService.rankRoutes("test-user", pregFiltered2, "pregnant")
  assert(pregRank2.rankedRoutes[0].id === "route-A2", "Pregnant profile prefers Route A (0 stairs) over Route B (44 stairs)")

  // Luggage: Prefers Route A (0 stairs) over Route B (44 stairs)
  const luggageFiltered2 = await accessibilityService.filterRoutes([routeA2Raw, routeB2Raw], "luggage")
  const luggageRank2 = await mlPreferenceService.rankRoutes("test-user", luggageFiltered2, "luggage")
  assert(luggageRank2.rankedRoutes[0].id === "route-A2", "Luggage profile prefers Route A (0 stairs) over Route B (44 stairs)")

  // General / Standard: Prefers Route B (faster time 900s vs 1500s & shorter walk 420m vs 900m)
  const stdFiltered2 = await accessibilityService.filterRoutes([routeA2Raw, routeB2Raw], "standard")
  const stdRank2 = await mlPreferenceService.rankRoutes("test-user", stdFiltered2, "standard")
  assert(stdRank2.rankedRoutes[0].id === "route-B2", "General/Standard profile prefers Route B (faster time & shorter walk)")
  console.log("   ✅ Problem 5 Scenario 2 profile diversity passed.\n")

  // ── Summary ────────────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} PROBLEM 4 ACCESSIBILITY TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

runAccessibilityTests().catch((err) => {
  console.error("❌ Accessibility test failure:", err)
  process.exit(1)
})

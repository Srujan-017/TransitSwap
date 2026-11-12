import { accessibilityService } from "../services/accessibilityService"
import { DEMO_ACCESSIBILITY_DATA } from "../data/accessibilityData"
import type { AccessibilityRecord } from "../types/intelligence"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * Completion-phase 2 — two accessibility-engine gaps found while writing the paper.
 *
 * B7: the wheelchair rule (a) never consulted stepFreePlatform and (b) treated a
 *     ramp as a substitute for a lift, so a station with a ramp but stairs and no
 *     lift to the platform was admitted. No station in the shipped demo dataset
 *     triggers this (the 3 stations without lifts also lack ramps and are already
 *     blocked), so these tests use constructed records — the point is that an
 *     admin edit or real survey data can no longer slip through.
 * B6: the route-level warning list repeated a generic message once per station.
 *
 * accessibilityService.listStations() is replaced for the duration of the file so
 * the evaluation runs on the constructed records without a database.
 */

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string): boolean {
  if (condition) {
    passed++
    return true
  }
  failed++
  console.error(`   ❌ FAILED: ${msg}`)
  return false
}

// Two fully accessible metro stations to build records from.
const [cleanA, cleanB] = DEMO_ACCESSIBILITY_DATA.filter(
  (r) => r.transportMode === "metro" && r.status === "accessible" && r.hasLift === true && r.stepFreePlatform === true,
)

const routeBetween = (from: string, to: string): MultimodalRoute =>
  ({
    segments: [{ mode: "metro", from: { name: from }, to: { name: to } }],
    totalWalkingMeters: 300,
    transferCount: 0,
  }) as unknown as MultimodalRoute

type Profile = Parameters<typeof accessibilityService.evaluateRoute>[1]

// Evaluates a route from `cleanB` to a station whose record is cleanA with the given overrides.
async function evaluate(overrides: Partial<AccessibilityRecord>, profile: Profile) {
  const variant: AccessibilityRecord = { ...cleanA, ...overrides }
  const original = accessibilityService.listStations
  accessibilityService.listStations = async () => DEMO_ACCESSIBILITY_DATA.map((r) => (r.stationId === cleanA.stationId ? variant : r))
  try {
    return await accessibilityService.evaluateRoute(routeBetween(variant.stationName, cleanB.stationName), profile)
  } finally {
    accessibilityService.listStations = original
  }
}

// A station with stairs, a ramp, and no lift — the "ramp as lift substitute" case.
const RAMP_ONLY = {
  hasLift: false,
  hasRamp: true,
  stairCount: 12,
  stepFreeEntrance: true,
  stepFreePlatform: null,
  wheelchairAccessible: true,
  status: "partially_accessible" as const,
}

async function run() {
  console.log("🧪 Running Completion-phase 2 Accessibility Rule Tests (B6, B7)...\n")
  assert(Boolean(cleanA && cleanB && cleanA.stationId !== cleanB.stationId), "test fixtures: two distinct clean metro stations exist")

  console.log("1️⃣ B7 — a ramp is not a substitute for a lift when stairs remain...")
  const rampOnly = await evaluate(RAMP_ONLY, "wheelchair")
  assert(rampOnly.blocked === true, "ramp + 12 stairs + no lift + platform not confirmed step-free => blocked for wheelchair")
  assert(/ramp alone/.test(rampOnly.rejectionReason ?? ""), `the reason explains why (got: ${rampOnly.rejectionReason})`)
  assert(rampOnly.blockedReasonType === "station", "typed as a station exclusion")
  const rampOnlyButStepFree = await evaluate({ ...RAMP_ONLY, stepFreePlatform: true }, "wheelchair")
  assert(rampOnlyButStepFree.blocked === false, "the same station is admitted when the platform is confirmed step-free")
  const rampNoStairs = await evaluate({ ...RAMP_ONLY, stairCount: 0 }, "wheelchair")
  assert(rampNoStairs.blocked === false, "ramp + no stairs + no lift is admitted (nothing to climb)")
  console.log("   ✅ ramp-as-lift gap closed\n")

  console.log("2️⃣ B7 — an explicitly non-step-free platform blocks wheelchair routes...")
  const platform = await evaluate(
    { hasLift: true, hasRamp: true, stairCount: 0, stepFreePlatform: false, wheelchairAccessible: true, status: "partially_accessible" },
    "wheelchair",
  )
  assert(platform.blocked === true, "stepFreePlatform === false => blocked even with a lift and ramp recorded")
  assert(/no step-free access to the platform/.test(platform.rejectionReason ?? ""), `reason names the platform (got: ${platform.rejectionReason})`)
  console.log("   ✅ stepFreePlatform is now consulted\n")

  console.log("3️⃣ Open-world behaviour is preserved: unknown values never block...")
  const unknownLift = await evaluate(
    { hasLift: null, hasRamp: true, stairCount: 5, stepFreePlatform: null, wheelchairAccessible: true, status: "partially_accessible" },
    "wheelchair",
  )
  assert(unknownLift.blocked === false, "lift unknown => not blocked (a warning, not a rejection)")
  const unknownPlatform = await evaluate({ stepFreePlatform: null }, "wheelchair")
  assert(unknownPlatform.blocked === false, "platform unknown on an otherwise accessible station => not blocked")
  console.log("   ✅ unknown never blocks\n")

  console.log("4️⃣ Existing wheelchair rules are unchanged...")
  const legacy = await evaluate(
    { hasLift: false, hasRamp: false, stairCount: 12, stepFreePlatform: null, wheelchairAccessible: true, status: "partially_accessible" },
    "wheelchair",
  )
  assert(legacy.blocked === true && /no lift or ramp/.test(legacy.rejectionReason ?? ""), "no lift + no ramp + stairs still blocked with its original message")
  const notAccessible = await evaluate({ status: "not_accessible", wheelchairAccessible: false }, "wheelchair")
  assert(notAccessible.blocked === true && /not accessible|not wheelchair accessible/.test(notAccessible.rejectionReason ?? ""), "a not-accessible station still blocks")
  const clean = await evaluate({}, "wheelchair")
  assert(clean.blocked === false, "a fully accessible station still passes")
  console.log("   ✅ no regression in the existing rules\n")

  console.log("5️⃣ The new rules are scoped to the wheelchair profile...")
  for (const profile of ["stroller", "senior", "pregnant", "luggage", "reduced_mobility", "standard"] as const) {
    const result = await evaluate(RAMP_ONLY, profile)
    assert(result.blocked === false, `${profile}: the ramp-only station is not blocked by the wheelchair-only rule`)
  }
  console.log("   ✅ other profiles unaffected\n")

  console.log("6️⃣ B6 — the route-level warning list has no repeats...")
  const DEMO_NOTE = "Accessibility data is from the synthetic demo dataset."
  const original = accessibilityService.listStations
  accessibilityService.listStations = async () => DEMO_ACCESSIBILITY_DATA
  try {
    const evaluation = await accessibilityService.evaluateRoute(routeBetween(cleanA.stationName, cleanB.stationName), "wheelchair")
    assert(evaluation.warnings.filter((w) => w === DEMO_NOTE).length === 1, "the generic data-source warning appears exactly once on a two-station route")
    assert(new Set(evaluation.warnings).size === evaluation.warnings.length, "no warning string is repeated in the combined list")
    assert(
      evaluation.checkedStations.length === 2 && evaluation.checkedStations.every((s) => s.warnings.includes(DEMO_NOTE)),
      "per-station detail is unchanged: each station still lists its own copy",
    )
  } finally {
    accessibilityService.listStations = original
  }
  console.log("   ✅ combined warnings de-duplicated, per-station detail intact\n")

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} ACCESSIBILITY RULE-GAP TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error("❌ Accessibility rule-gap test failure:", err)
  process.exit(1)
})

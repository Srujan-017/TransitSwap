import { crowdService, findDemoCrowdRecord, circularGapMinutes, SLOT_WINDOW_MINUTES } from "../services/crowdService"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * Completion-phase 2 (B4) — crowd demo data must be matched to the time of travel.
 *
 * The bug: the clock was mapped onto four fixed slots (08:00/14:00/18:00/20:00) and,
 * when a station had no record for that exact slot, the code silently used the
 * station's FIRST record at ANY hour. So the 09:00 and 12:00 records could never
 * be matched directly, and every station reported its peak-hour reading around
 * the clock — MG Road was "HIGH" at 9:36 pm because of its 08:00 record, which
 * then hard-blocked wheelchair/senior/pregnant/stroller/luggage routes at night.
 *
 * All dates are constructed in local time (the service reads local hours), so the
 * test is independent of the machine's time zone and of the real clock.
 * No database is needed (no connection => no recent user reports).
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

// 12 Nov 2026 is a Thursday (weekday); 14 Nov 2026 is a Saturday (weekend).
const weekday = (hour: number, minute = 0) => new Date(2026, 10, 12, hour, minute)
const weekend = (hour: number, minute = 0) => new Date(2026, 10, 14, hour, minute)

// Minimal route: only metro/bus endpoint names are read by crowdService.routeSummary().
function routeThrough(...names: string[]): MultimodalRoute {
  const segments = names.slice(1).map((to, i) => ({ mode: "metro", from: { name: names[i] }, to: { name: to } }))
  return { segments } as unknown as MultimodalRoute
}

async function run() {
  console.log("🧪 Running Completion-phase 2 Crowd Time-Slot Tests (B4)...\n")

  console.log("1️⃣ Station readings are matched to the nearest time of the same day type...")
  assert(findDemoCrowdRecord("pl-08", weekday(8, 30))?.crowdLevel === "HIGH", "MG Road at 08:30 uses its 08:00 reading (HIGH)")
  assert(findDemoCrowdRecord("pl-08", weekday(14, 30))?.crowdLevel === "MEDIUM", "MG Road at 14:30 uses its 14:00 reading (MEDIUM)")
  assert(findDemoCrowdRecord("pl-12", weekday(9, 30))?.crowdLevel === "HIGH", "Majestic at 09:30 uses its 09:00 reading — previously unreachable")
  assert(findDemoCrowdRecord("pl-14", weekday(21, 59))?.crowdLevel === "MEDIUM", "Magadi Road at 21:59 is still within 2 h of its 20:00 reading")
  console.log("   ✅ nearest-time matching works, including the 09:00 slot that was previously unreachable\n")

  console.log("2️⃣ Regression: no reading is invented outside a station's time coverage...")
  assert(findDemoCrowdRecord("pl-08", weekday(21, 36)) === undefined, "MG Road at 21:36 has NO reading (was HIGH from the 08:00 record)")
  assert(findDemoCrowdRecord("pl-08", weekday(11, 0)) === undefined, "MG Road at 11:00 is 3 h from both readings => no reading")
  assert(findDemoCrowdRecord("pl-12", weekday(14, 0)) === undefined, "Majestic at 14:00 has no reading (was HIGH at every hour)")
  assert(findDemoCrowdRecord("pl-12", weekday(3, 0)) === undefined, "Majestic at 03:00 has no reading")
  assert(findDemoCrowdRecord("b-02", weekday(8, 0)) === undefined, "a station with no records at all has no reading")
  console.log("   ✅ stations are no longer HIGH around the clock\n")

  console.log("3️⃣ The time window boundary is exactly 2 hours...")
  assert(SLOT_WINDOW_MINUTES === 120, "window is 120 minutes")
  assert(findDemoCrowdRecord("pl-08", weekday(10, 0)) !== undefined, "exactly 2 h after the 08:00 reading is included")
  assert(findDemoCrowdRecord("pl-08", weekday(10, 1)) === undefined, "2 h 1 min after is excluded")
  console.log("   ✅ boundary correct\n")

  console.log("4️⃣ Day type is respected...")
  assert(findDemoCrowdRecord("b-10", weekend(12, 0))?.crowdLevel === "LOW", "Malleshwaram bus stop on Saturday 12:00 uses its weekend reading (LOW)")
  assert(findDemoCrowdRecord("b-10", weekday(12, 0)) === undefined, "the same stop on a weekday has no reading (weekend-only record)")
  assert(findDemoCrowdRecord("pl-08", weekend(8, 30)) === undefined, "MG Road on Saturday has no reading (weekday-only records)")
  console.log("   ✅ weekday and weekend readings are kept apart\n")

  console.log("5️⃣ Times wrap correctly past midnight...")
  assert(circularGapMinutes(23 * 60 + 30, 30) === 60, "23:30 and 00:30 are 60 minutes apart")
  assert(circularGapMinutes(0, 0) === 0, "identical times are 0 apart")
  assert(circularGapMinutes(12 * 60, 0) === 720, "noon and midnight are 12 h apart (the maximum)")
  console.log("   ✅ wrap-around correct\n")

  console.log("6️⃣ stationEstimate() reports UNAVAILABLE honestly, with a reason...")
  const night = await crowdService.stationEstimate("pl-08", "MG Road Metro", weekday(21, 36))
  assert(night.source === "UNAVAILABLE" && night.crowdLevel === undefined, "MG Road at 21:36 is UNAVAILABLE, with no level")
  assert(/does not cover this time of day/.test(night.summary), "the summary says WHY (no data for this time), not just 'unavailable'")
  const peak = await crowdService.stationEstimate("pl-08", "MG Road Metro", weekday(8, 30))
  assert(peak.source === "DEMO_DATA" && peak.crowdLevel === "HIGH", "MG Road at 08:30 is DEMO_DATA / HIGH")
  assert(night.stationName === "MG Road Metro", "an unavailable estimate still carries the station name")
  console.log("   ✅ estimates honest\n")

  console.log("7️⃣ routeSummary() uses the time of travel...")
  const route = routeThrough("MG Road Metro", "Majestic Metro")
  const peakRoute = await crowdService.routeSummary(route, weekday(8, 30))
  assert(peakRoute.level === "HIGH" && peakRoute.source === "DEMO_DATA", "08:30: MG Road HIGH + Majestic HIGH => route HIGH")
  const middayRoute = await crowdService.routeSummary(route, weekday(14, 30))
  assert(middayRoute.level === "MEDIUM", "14:30: only MG Road has a reading (MEDIUM) => route MEDIUM")
  const nightRoute = await crowdService.routeSummary(route, weekday(21, 36))
  assert(nightRoute.level === undefined && nightRoute.source === "UNAVAILABLE", "21:36: no station has a reading => route UNAVAILABLE (cannot trigger the crowd hard-block)")
  console.log("   ✅ route-level crowd follows the time of travel\n")

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} CROWD TIME-SLOT TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error("❌ Crowd time-slot test failure:", err)
  process.exit(1)
})

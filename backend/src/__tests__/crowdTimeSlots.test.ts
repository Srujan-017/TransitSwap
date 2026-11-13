import { crowdService, findDemoCrowdRecord, circularGapMinutes, blendedLevel, SLOT_WINDOW_MINUTES } from "../services/crowdService"
import {
  DEMO_CROWD_DATA,
  LEGACY_CROWD_DATA,
  busRouteCrowdLevel,
  stationLoad,
  stationTypeOf,
  levelFromLoad,
} from "../data/crowdData"
import { METRO_STATIONS, BUS_STOPS, BUS_ROUTES } from "../data/transitData"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * Crowd data tests.
 *
 * Completion-phase 2 (B4): crowd readings must be matched to the time of travel by the
 * nearest-reading rule (same day type, within 2 hours). That rule is written for a SPARSE
 * table, so parts 1-6 exercise it against the original 16 spot readings (LEGACY_CROWD_DATA)
 * and pin the old bug: a station's first reading used at every hour, so MG Road looked
 * "HIGH" at 9:36 pm.
 *
 * Feature-upgrade phase 2: the built-in table is now a complete hourly profile for every
 * metro station and bus stop, so crowd is never "unavailable" inside the network, and a
 * route's crowd is worked out per leg (parts 7-11).
 *
 * All dates are constructed in local time (the service reads local hours), so the test is
 * independent of the machine's time zone and of the real clock. No database is needed.
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
const sparse = (id: string, when: Date) => findDemoCrowdRecord(id, when, LEGACY_CROWD_DATA)

// A route made of the given legs; each leg is [mode, from, to, minutes, routeNumber?].
type Leg = ["metro" | "bus" | "walking" | "auto", string, string, number, string?]
function routeOf(...legs: Leg[]): MultimodalRoute {
  const segments = legs.map(([mode, from, to, minutes, routeNumber], i) => ({
    id: `seg-${i}`,
    mode,
    from: { name: from },
    to: { name: to },
    durationSeconds: minutes * 60,
    transitDetails: mode === "metro" ? { lineName: "Purple Line" } : mode === "bus" ? { lineName: "Bus", routeNumber } : undefined,
  }))
  return { segments } as unknown as MultimodalRoute
}

async function run() {
  console.log("🧪 Running Crowd Data Tests...\n")

  console.log("1️⃣ Sparse table: readings are matched to the nearest time of the same day type...")
  assert(sparse("pl-08", weekday(8, 30))?.crowdLevel === "HIGH", "MG Road at 08:30 uses its 08:00 reading (HIGH)")
  assert(sparse("pl-08", weekday(14, 30))?.crowdLevel === "MEDIUM", "MG Road at 14:30 uses its 14:00 reading (MEDIUM)")
  assert(sparse("pl-12", weekday(9, 30))?.crowdLevel === "HIGH", "Majestic at 09:30 uses its 09:00 reading — previously unreachable")
  assert(sparse("pl-14", weekday(21, 59))?.crowdLevel === "MEDIUM", "Magadi Road at 21:59 is still within 2 h of its 20:00 reading")
  console.log("   ✅ nearest-time matching works\n")

  console.log("2️⃣ Regression: no reading is invented outside a sparse table's time coverage...")
  assert(sparse("pl-08", weekday(21, 36)) === undefined, "MG Road at 21:36 has NO reading (was HIGH from the 08:00 record)")
  assert(sparse("pl-08", weekday(11, 0)) === undefined, "MG Road at 11:00 is 3 h from both readings => no reading")
  assert(sparse("pl-12", weekday(14, 0)) === undefined, "Majestic at 14:00 has no reading (was HIGH at every hour)")
  assert(sparse("pl-12", weekday(3, 0)) === undefined, "Majestic at 03:00 has no reading")
  assert(sparse("b-02", weekday(8, 0)) === undefined, "a station with no records at all has no reading")
  console.log("   ✅ stations are not HIGH around the clock\n")

  console.log("3️⃣ The time window boundary is exactly 2 hours...")
  assert(SLOT_WINDOW_MINUTES === 120, "window is 120 minutes")
  assert(sparse("pl-08", weekday(10, 0)) !== undefined, "exactly 2 h after the 08:00 reading is included")
  assert(sparse("pl-08", weekday(10, 1)) === undefined, "2 h 1 min after is excluded")
  console.log("   ✅ boundary correct\n")

  console.log("4️⃣ Day type is respected...")
  assert(sparse("b-10", weekend(12, 0))?.crowdLevel === "LOW", "Malleshwaram bus stop on Saturday 12:00 uses its weekend reading (LOW)")
  assert(sparse("b-10", weekday(12, 0)) === undefined, "the same stop on a weekday has no reading (weekend-only record)")
  assert(sparse("pl-08", weekend(8, 30)) === undefined, "MG Road on Saturday has no reading (weekday-only records)")
  console.log("   ✅ weekday and weekend readings are kept apart\n")

  console.log("5️⃣ Times wrap correctly past midnight...")
  assert(circularGapMinutes(23 * 60 + 30, 30) === 60, "23:30 and 00:30 are 60 minutes apart")
  assert(circularGapMinutes(0, 0) === 0, "identical times are 0 apart")
  assert(circularGapMinutes(12 * 60, 0) === 720, "noon and midnight are 12 h apart (the maximum)")
  console.log("   ✅ wrap-around correct\n")

  console.log("6️⃣ A station with no records at all is still reported UNAVAILABLE, with a reason...")
  const unknown = await crowdService.stationEstimate("not-a-station", "Nowhere", weekday(8, 30))
  assert(unknown.source === "UNAVAILABLE" && unknown.crowdLevel === undefined, "an unknown station is UNAVAILABLE, with no level")
  assert(unknown.stationName === "Nowhere", "an unavailable estimate still carries the station name")
  console.log("   ✅ honest for unknown stations\n")

  console.log("7️⃣ Complete coverage: every station and stop, both day types, all 24 hours...")
  const places = [...METRO_STATIONS.map((s) => s.id), ...BUS_STOPS.map((s) => s.id)]
  assert(DEMO_CROWD_DATA.length === places.length * 2 * 24, `table has ${places.length * 2 * 24} records (got ${DEMO_CROWD_DATA.length})`)
  let uncovered = 0
  for (const id of places) {
    for (const day of [weekday, weekend]) {
      for (let h = 0; h < 24; h++) {
        for (const minute of [0, 29, 31, 59]) {
          if (!findDemoCrowdRecord(id, day(h, minute))) uncovered++
        }
      }
    }
  }
  assert(uncovered === 0, `no station/stop is ever without a reading (uncovered lookups: ${uncovered})`)
  const unavailable = await Promise.all(places.map((id) => crowdService.stationEstimate(id, undefined, weekday(3, 15))))
  assert(unavailable.every((e) => e.source === "DEMO_DATA" && e.crowdLevel === "LOW"), "at 03:15 every station is DEMO_DATA / LOW, not unavailable")
  console.log("   ✅ crowd is never unavailable inside the network\n")

  console.log("8️⃣ The profile has the right shape...")
  const lvl = (id: string, when: Date) => findDemoCrowdRecord(id, when)?.crowdLevel
  assert(lvl("pl-08", weekday(8, 30)) === "HIGH", "MG Road is HIGH on a weekday at 08:30")
  assert(lvl("pl-08", weekday(22, 0)) === "LOW", "MG Road is LOW on a weekday at 22:00")
  assert(lvl("pl-12", weekday(18, 0)) === "HIGH", "Majestic (interchange) is HIGH at the evening peak")
  assert(lvl("pl-12", weekday(14, 0)) === "MEDIUM", "Majestic is MEDIUM at 14:00 — busy even off-peak")
  assert(lvl("pl-01", weekday(18, 0)) === "HIGH", "Whitefield (IT corridor) is HIGH at the evening peak")
  assert(lvl("pl-01", weekend(8, 30)) === "LOW", "Whitefield is LOW on a Saturday morning")
  assert(lvl("pl-08", weekend(17, 0)) !== "LOW", "MG Road (city centre) is not LOW on a Saturday evening")
  let residentialHigh = 0
  for (const s of [...METRO_STATIONS, ...BUS_STOPS]) {
    if (stationTypeOf(s.id) !== "residential") continue
    for (const day of ["weekday", "weekend"] as const) {
      for (let h = 0; h < 24; h++) if (levelFromLoad(stationLoad(s.id, day, h)) === "HIGH") residentialHigh++
    }
  }
  assert(residentialHigh === 0, `a residential station is never HIGH from the baseline alone (count: ${residentialHigh})`)
  const highShare = DEMO_CROWD_DATA.filter((r) => r.crowdLevel === "HIGH").length / DEMO_CROWD_DATA.length
  assert(highShare > 0.03 && highShare < 0.2, `HIGH is a minority of readings, not everywhere (${(highShare * 100).toFixed(1)}%)`)
  console.log("   ✅ peaks, off-peak, night and weekends look right\n")

  console.log("9️⃣ The original spot readings are kept as anchors...")
  const anchorsKept = LEGACY_CROWD_DATA.every((r) => {
    const hour = Number(r.timeSlot.split(":")[0])
    const when = r.dayType === "weekday" ? weekday(hour) : weekend(hour)
    return findDemoCrowdRecord(r.stationId, when)?.crowdLevel === r.crowdLevel
  })
  assert(anchorsKept, "every original reading appears unchanged at its own hour")
  assert(LEGACY_CROWD_DATA.length === 16, "the original table is intact (16 readings)")
  console.log("   ✅ anchors agree with the generated profile\n")

  console.log("🔟 routeSummary(): crowd per leg, at the time the rider is there...")
  const departure = weekday(7, 30)
  // Walk 40 min, then ride MG Road -> Majestic: boarding happens at 08:10, in the peak.
  const afterWalk = await crowdService.routeSummary(
    routeOf(["walking", "Home", "MG Road Metro", 40], ["metro", "MG Road Metro", "Majestic Metro", 25]), departure)
  assert(afterWalk.legs?.length === 1 && afterWalk.legs[0].boardLevel === "HIGH", "boarding at 08:10 (after a 40 min walk) is judged at 08:10, not at the 07:30 departure")
  const earlyLeg = await crowdService.routeSummary(routeOf(["metro", "MG Road Metro", "Majestic Metro", 25]), weekday(5, 0))
  assert(earlyLeg.level === "MEDIUM" || earlyLeg.level === "LOW", "the same ride at 05:00 is not HIGH")
  // The most crowded leg decides, not the average.
  const mixed = await crowdService.routeSummary(
    routeOf(["metro", "Whitefield Metro", "Hoodi Metro", 10], ["metro", "MG Road Metro", "Majestic Metro", 25]), weekday(8, 30))
  assert(mixed.legs?.length === 2, "two legs reported")
  assert(mixed.level === "HIGH", "route is HIGH when any leg is HIGH — not averaged away by a quieter leg")
  assert(mixed.legs?.every((l) => l.level) === true, "every metro leg has a LOW/MEDIUM/HIGH level")
  assert(/most crowded leg/.test(mixed.summary), "the summary names the most crowded leg")
  const quiet = await crowdService.routeSummary(routeOf(["metro", "MG Road Metro", "Majestic Metro", 25]), weekday(22, 0))
  assert(quiet.level === "LOW" && quiet.source === "DEMO_DATA", "22:00: LOW, from demo data")
  const walkOnly = await crowdService.routeSummary(routeOf(["walking", "A", "B", 10], ["auto", "B", "C", 12]), weekday(8, 30))
  assert(walkOnly.level === "LOW" && walkOnly.source === "NOT_APPLICABLE" && walkOnly.legs?.length === 0, "walk/auto-only route has no transit crowd (LOW, NOT_APPLICABLE)")
  console.log("   ✅ per-leg, time-aware, worst-leg crowd\n")

  console.log("1️⃣1️⃣ Bus crowd is modelled per route and hour...")
  const r5 = BUS_ROUTES.find((r) => r.number === "5")!
  const peakBus = await crowdService.routeSummary(routeOf(["bus", "Koramangala Bus Stop", "HSR Layout Bus Stop", 20, "5"]), weekday(8, 30))
  assert(peakBus.legs?.[0].onboardLevel === busRouteCrowdLevel(r5.id, "weekday", 8), "bus leg carries the on-board level of its route at that hour")
  assert(peakBus.legs?.[0].label === "Bus 5", "bus leg is labelled with its route number")
  const nightBus = await crowdService.routeSummary(routeOf(["bus", "Koramangala Bus Stop", "HSR Layout Bus Stop", 20, "5"]), weekday(3, 0))
  assert(nightBus.legs?.[0].onboardLevel === "LOW" && nightBus.level === "LOW", "the same bus at 03:00 is LOW")
  const levelsAcrossDay = new Set(Array.from({ length: 24 }, (_, h) => busRouteCrowdLevel(r5.id, "weekday", h)))
  assert(levelsAcrossDay.size >= 2, "a bus route's crowd changes through the day")
  assert(busRouteCrowdLevel("no-such-route", "weekday", 8) === undefined, "unknown bus route has no modelled crowd")
  console.log("   ✅ bus crowd follows route and hour\n")

  console.log("1️⃣2️⃣ Recent reports can move a quiet station to HIGH (blend cut-offs)...")
  const blend = (reports: number, baseline: number) => blendedLevel(reports * 0.7 + baseline * 0.3)
  assert(blend(3, 1) === "HIGH", "unanimous HIGH reports over a LOW baseline give HIGH (used to round down to MEDIUM)")
  assert(blend(1, 3) === "LOW", "unanimous LOW reports over a HIGH baseline give LOW")
  assert(blend(2, 1) === "MEDIUM" && blend(2, 3) === "MEDIUM", "MEDIUM reports stay MEDIUM against either extreme")
  assert(blend(3, 3) === "HIGH" && blend(1, 1) === "LOW" && blend(2, 2) === "MEDIUM", "agreeing reports and baseline are unchanged")
  assert(blend(3, 2) === "HIGH" && blend(1, 2) === "LOW", "unanimous reports over a MEDIUM baseline win")
  console.log("   ✅ (end-to-end version runs in dashboard.test.ts)\n")

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} CROWD DATA TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error("❌ Crowd data test failure:", err)
  process.exit(1)
})

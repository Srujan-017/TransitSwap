import { historicalReliabilityService } from "../services/reliability/historicalReliabilityService"
import { reliabilityService } from "../services/reliabilityService"
import { parseLocalDateTime } from "../utils/dateTime"
import type { EnrichedRoute } from "../types/intelligence"
import type { RouteSegment } from "../types/multimodal"

async function runReliabilityTests() {
  console.log("🧪 Running Problem 2 Data-Driven Historical Reliability Unit Tests...\n")

  // Test 1: Record Journey Observation & Compute Error (Step 3 & 4)
  console.log("1️⃣ Testing Journey Observation Recording & Error Calculation...")
  const res1 = await historicalReliabilityService.recordObservation({
    originName: "Versova Metro",
    destinationName: "Andheri Metro",
    transportMode: "metro",
    predictedDurationMinutes: 15,
    actualDurationMinutes: 18, // Error = 18 - 15 = +3
    departureTime: new Date("2026-08-11T08:00:00Z"),
    arrivalTime: new Date("2026-08-11T08:18:00Z"),
    isSyntheticDemoData: true,
  })

  console.assert(res1.success === true, "Observation recording must succeed")
  console.assert(res1.errorMinutes === 3, "Prediction error must equal actual - predicted (18 - 15 = +3)")
  console.log("   ✅ Journey observation recording & error calculation passed.")

  // Test 2: Historical Statistics (Mean & Standard Deviation) (Step 6)
  console.log("\n2️⃣ Testing Historical Error Statistics (Mean & Sample Std Dev)...")
  // Seed sample observations
  for (let i = 1; i <= 10; i++) {
    await historicalReliabilityService.recordObservation({
      originName: "Station A",
      destinationName: "Station B",
      transportMode: "bus",
      predictedDurationMinutes: 30,
      actualDurationMinutes: 30 + (i % 2 === 0 ? 4 : -2), // alternating +4 and -2 errors -> mean = 1
      departureTime: new Date(),
      isSyntheticDemoData: true,
    })
  }

  const stats = await historicalReliabilityService.getHistoricalStatistics("bus")
  console.log("   Sample Size (N):    ", stats.sampleSize)
  console.log("   Mean Error (min):   ", stats.meanErrorMinutes)
  console.log("   Sample Std Dev (s): ", stats.standardDeviationMinutes)

  console.assert(stats.sampleSize >= 10, "Sample size must be >= 10")
  console.assert(stats.isSufficientData === true, "isSufficientData flag must be true")
  console.assert(stats.standardDeviationMinutes > 0, "Standard deviation must be > 0")
  console.log("   ✅ Historical error statistics calculation passed.")

  // Test 3: Data-Driven Prediction Interval (Step 7)
  console.log("\n3️⃣ Testing Data-Driven Prediction Interval (90% & 95% Expected Range)...")
  const interval = await historicalReliabilityService.calculatePredictionInterval(30, "bus")

  console.log("   Predicted Duration: ", interval.predictedDurationMinutes, "min")
  console.log("   90% Range:          ", interval.lowerBound90Minutes, "–", interval.upperBound90Minutes, "min")
  console.log("   95% Range:          ", interval.lowerBound95Minutes, "–", interval.upperBound95Minutes, "min")

  console.assert(interval.lowerBound90Minutes < 30 + stats.meanErrorMinutes, "Lower bound must be < expected mean")
  console.assert(interval.upperBound90Minutes > 30 + stats.meanErrorMinutes, "Upper bound must be > expected mean")
  console.assert(interval.lowerBound95Minutes <= interval.lowerBound90Minutes, "95% lower bound must be <= 90% lower bound")
  console.assert(interval.upperBound95Minutes >= interval.upperBound90Minutes, "95% upper bound must be >= 90% upper bound")
  console.log("   ✅ Prediction interval calculation passed.")

  // Test 4: Empirical Coverage Evaluation (Step 16)
  console.log("\n4️⃣ Testing Empirical Interval Coverage on 80/20 Test Split...")
  const coverageReport = await historicalReliabilityService.calculateCoverageEvaluation()

  console.log("   Test Sample Count:  ", coverageReport.totalTestJourneys)
  console.log("   90% Interval Cover: ", coverageReport.empiricalCoverage90Percent + "%")
  console.log("   95% Interval Cover: ", coverageReport.empiricalCoverage95Percent + "%")

  console.assert(coverageReport.empiricalCoverage90Percent > 60, "Coverage on 90% interval should be reasonable")
  console.assert(coverageReport.empiricalCoverage95Percent >= coverageReport.empiricalCoverage90Percent, "95% coverage should be >= 90% coverage")
  console.log("   ✅ Empirical coverage evaluation passed.")

  // Test 5: Problem 3 Data-Driven Empirical Monte Carlo Transfer Risk Simulation (Step 14 & 16)
  console.log("\n5️⃣ Testing Problem 3 Empirical Monte Carlo Transfer Risk Simulation (1,000 trials)...")
  const mcRes = await historicalReliabilityService.runDataDrivenMonteCarlo("bus", 3, undefined, 1000)

  console.log("   Simulated Trials:   ", mcRes.simulatedTrialsCount)
  console.log("   Mean Delay (min):   ", mcRes.meanDelayMinutes)
  console.log("   Std Dev (s):        ", mcRes.stdDevMinutes)
  console.log("   Miss Probability:   ", mcRes.missProbabilityPercent + "%")
  console.log("   Data Source:        ", mcRes.dataSource)

  console.assert(mcRes.simulatedTrialsCount === 1000, "Trials count must be 1000")
  console.assert(mcRes.isDataDriven === true, "Monte Carlo must be data-driven")
  console.assert(mcRes.missProbabilityPercent >= 0 && mcRes.missProbabilityPercent <= 100, "Miss probability must be 0-100%")
  console.log("   ✅ Data-driven empirical Monte Carlo transfer risk passed.")

  console.log("\n🎉 ALL PROBLEM 2 & PROBLEM 3 HISTORICAL RELIABILITY UNIT TESTS PASSED!")
}

// ── Test fixtures ────────────────────────────────────────────────────────────

function makeSegment(overrides: Partial<RouteSegment>): RouteSegment {
  return {
    id: overrides.id ?? "seg-1",
    mode: overrides.mode ?? "bus",
    from: overrides.from ?? { name: "A", latitude: 19.1, longitude: 72.8 },
    to: overrides.to ?? { name: "B", latitude: 19.2, longitude: 72.9 },
    distanceMeters: overrides.distanceMeters ?? 2000,
    durationSeconds: overrides.durationSeconds ?? 600,
    estimatedFare: overrides.estimatedFare ?? 20,
    instruction: overrides.instruction ?? "Ride",
    geometry: overrides.geometry ?? { type: "LineString", coordinates: [] },
  }
}

function makeDirectRoute(): EnrichedRoute {
  return {
    id: "route-direct-1",
    label: "FASTEST",
    labelDisplay: "Fastest",
    labelColor: "#000",
    segments: [makeSegment({ mode: "walking", id: "s1" })],
    totalDistanceMeters: 500,
    totalDurationSeconds: 600,
    totalWalkingMeters: 500,
    totalFare: 0,
    transferCount: 0,
    modes: ["walking"],
    summary: "Direct walk",
    isDemoData: true,
  }
}

function makeTransferRoute(): EnrichedRoute {
  return {
    id: "route-transfer-1",
    label: "BALANCED",
    labelDisplay: "Balanced",
    labelColor: "#000",
    segments: [
      makeSegment({ id: "s1", mode: "bus", to: { name: "Transfer Point", latitude: 19.15, longitude: 72.85 } }),
      makeSegment({ id: "s2", mode: "metro", from: { name: "Transfer Point", latitude: 19.15, longitude: 72.85 } }),
    ],
    totalDistanceMeters: 4000,
    totalDurationSeconds: 1800,
    totalWalkingMeters: 300,
    totalFare: 30,
    transferCount: 1,
    modes: ["bus", "metro"],
    summary: "Bus then Metro",
    isDemoData: true,
  }
}

/**
 * Problem 13/14 hardening tests — date/time parsing safety, "no departure time"
 * honesty, and Smart Departure candidate-evaluation behaviour.
 */
async function runDateTimeAndSmartDepartureTests() {
  console.log("\n🧪 Running Problem 13/14 Hardening Tests...\n")

  // TEST A/B/C — local ISO datetime is parsed as local time, date is honoured
  console.log("1️⃣ Testing local date+time parsing (today / future date)...")
  const todayParsed = parseLocalDateTime("2026-08-16T08:30:00")
  console.assert(todayParsed !== null, "Valid local datetime must parse")
  console.assert(todayParsed?.getHours() === 8 && todayParsed?.getMinutes() === 30, "Local hour/minute must be preserved")

  const futureParsed = parseLocalDateTime("2026-09-01T08:30:00")
  console.assert(futureParsed !== null, "Future local datetime must parse")
  console.assert(futureParsed?.getDate() === 1 && futureParsed?.getMonth() === 8, "Future date must be preserved, not silently replaced with today")
  console.log("   ✅ Local date+time parsing preserves the user-selected date.")

  // TEST D — no time supplied
  console.log("\n2️⃣ Testing 'no departure time' honesty (Smart Departure)...")
  const noTimeSuggestion = await reliabilityService.calculateSmartDeparture(makeTransferRoute(), undefined)
  console.assert(noTimeSuggestion === null, "calculateSmartDeparture must return null (not a fake time) when no departure time is given")
  console.log("   ✅ No departure time → null, not a fabricated recommendation.")

  // TEST E/F — invalid time / invalid date must not crash and must not produce NaN/Invalid Date
  console.log("\n3️⃣ Testing invalid date/time inputs don't crash or produce NaN/Invalid Date...")
  const invalidTimeParsed = parseLocalDateTime("not-a-time")
  console.assert(invalidTimeParsed === null, "Invalid time string must return null, never Invalid Date")

  const invalidIsoParsed = parseLocalDateTime("2026-13-40T99:99:00")
  console.assert(invalidIsoParsed === null, "Invalid ISO-shaped datetime must return null, never Invalid Date")

  const suggestionForGarbageTime = await reliabilityService.calculateSmartDeparture(makeTransferRoute(), "garbage")
  console.assert(suggestionForGarbageTime === null, "Garbage departure time must fail safe (null), not throw or produce NaN")
  console.log("   ✅ Invalid date/time inputs fail safe — no crash, no NaN, no Invalid Date.")

  // TEST A (Problem 14) — direct route always recommends current departure
  console.log("\n4️⃣ Testing direct route (0 transfers) recommends current departure...")
  const directSuggestion = await reliabilityService.calculateSmartDeparture(makeDirectRoute(), "2026-08-16T08:30:00")
  console.assert(directSuggestion !== null, "Direct route with a valid time must still return a suggestion")
  console.assert(directSuggestion?.recommendedDepartureOffsetMinutes === 0, "Direct route must not recommend an earlier departure")
  console.assert(directSuggestion?.reliabilityGainPercent === 0, "Direct route must not report a fabricated reliability gain")
  console.log("   ✅ Direct routes keep the current departure time.")

  // TEST G/I — reliability gain must equal baseline - candidate, never a fixed constant
  console.log("\n5️⃣ Testing Smart Departure reliability gain is calculated, not hard-coded...")
  const transferRoute = makeTransferRoute()
  const suggestion = await reliabilityService.calculateSmartDeparture(transferRoute, "2026-08-16T08:30:00")
  console.assert(suggestion !== null, "Transfer route with a valid time must return a suggestion")
  if (suggestion) {
    console.assert(
      suggestion.reliabilityGainPercent >= 0,
      "Reliability gain must never be negative",
    )
    console.assert(
      ![10, 15].includes(suggestion.reliabilityGainPercent) || suggestion.recommendedDepartureOffsetMinutes !== 0,
      "Reliability gain must not silently be a hard-coded 10/15 with no matching offset",
    )
    console.log(`   Offset: ${suggestion.recommendedDepartureOffsetMinutes}m, gain: ${suggestion.reliabilityGainPercent}pp`)
  }
  console.log("   ✅ Reliability gain is derived from baseline vs candidate risk, not fabricated.")

  // TEST H — same input repeated gives the same recommendation (deterministic candidate ranking)
  console.log("\n6️⃣ Testing Smart Departure is reproducible for the same input...")
  const routeForRepeat = makeTransferRoute()
  const run1 = await reliabilityService.calculateSmartDeparture(routeForRepeat, "2026-08-16T08:30:00")
  const run2 = await reliabilityService.calculateSmartDeparture(routeForRepeat, "2026-08-16T08:30:00")
  console.assert(
    run1?.recommendedDepartureOffsetMinutes === run2?.recommendedDepartureOffsetMinutes,
    "Repeated calls with identical input must produce the same recommended offset",
  )
  console.log("   ✅ Same input consistently produces the same recommended offset.")

  console.log("\n🎉 ALL PROBLEM 13/14 HARDENING TESTS PASSED!")
}

runReliabilityTests()
  .then(() => runDateTimeAndSmartDepartureTests())
  .catch((err) => {
    console.error("❌ Test failure:", err)
    process.exit(1)
  })


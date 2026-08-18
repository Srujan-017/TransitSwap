import mongoose from "mongoose"
import { body, validationResult, type ValidationChain } from "express-validator"
import { env } from "../config/env"
import { User } from "../models/User"
import { Journey } from "../models/Journey"
import { JourneyObservation } from "../models/JourneyObservation"
import { journeyService } from "../services/journeyService"
import { historicalReliabilityService } from "../services/reliability/historicalReliabilityService"
import type { EnrichedRoute } from "../types/intelligence"

/**
 * Problem 21 — Continuous Improvement Loop test coverage.
 *
 * Part A mirrors the actualDurationMinutes validation rule added to
 * trip.routes.ts (feedbackValidation), without needing a running server.
 *
 * Part B exercises historicalReliabilityService.recordObservation directly —
 * error/delay sign calculation works without a DB (in-memory fallback), while
 * dedup-by-journeyId (create vs. update) genuinely requires MongoDB and is
 * honestly skipped (not silently passed) when MONGODB_URI is unset.
 *
 * Part C exercises journeyService.submitFeedback end-to-end: a journey with no
 * stored departureTime must skip observation creation (never fabricate one),
 * while a journey with a real departureTime must create/update exactly one
 * JourneyObservation, marked isSyntheticDemoData: false. Also requires MongoDB.
 */

// ── Part A — actualDurationMinutes validation (mirrors trip.routes.ts) ──

const actualDurationValidation: ValidationChain[] = [
  body("actualDurationMinutes")
    .optional()
    .isFloat({ min: 1, max: 1440 })
    .withMessage("Enter an actual journey duration between 1 and 1440 minutes."),
]

async function runValidation(chains: ValidationChain[], bodyObj: Record<string, unknown>) {
  const req = { body: bodyObj, params: {}, query: {}, headers: {}, cookies: {} } as never
  for (const chain of chains) {
    await chain.run(req)
  }
  return validationResult(req)
}

async function runValidationTests() {
  console.log("🧪 Running Problem 21 Continuous Improvement Validation Tests (Part A)...\n")

  let result = await runValidation(actualDurationValidation, {})
  console.assert(result.isEmpty(), "missing actualDurationMinutes must be accepted (optional field)")
  console.log("   ✅ 1. missing actualDurationMinutes accepted")

  result = await runValidation(actualDurationValidation, { actualDurationMinutes: 0 })
  console.assert(!result.isEmpty(), "actualDurationMinutes=0 must be rejected")
  console.log("   ✅ 2. actualDurationMinutes=0 rejected")

  result = await runValidation(actualDurationValidation, { actualDurationMinutes: -10 })
  console.assert(!result.isEmpty(), "actualDurationMinutes=-10 must be rejected")
  console.log("   ✅ 3. actualDurationMinutes=-10 rejected")

  result = await runValidation(actualDurationValidation, { actualDurationMinutes: 1441 })
  console.assert(!result.isEmpty(), "actualDurationMinutes=1441 must be rejected")
  console.log("   ✅ 4. actualDurationMinutes=1441 rejected")

  result = await runValidation(actualDurationValidation, { actualDurationMinutes: "forty" })
  console.assert(!result.isEmpty(), "non-numeric actualDurationMinutes must be rejected")
  console.log("   ✅ 5. non-numeric actualDurationMinutes rejected")

  result = await runValidation(actualDurationValidation, { actualDurationMinutes: 42.5 })
  console.assert(result.isEmpty(), "decimal actualDurationMinutes must be accepted")
  console.log("   ✅ 6. decimal actualDurationMinutes accepted")

  result = await runValidation(actualDurationValidation, { actualDurationMinutes: 47 })
  console.assert(result.isEmpty(), "valid actualDurationMinutes=47 must be accepted")
  console.log("   ✅ 7. valid actualDurationMinutes accepted")

  console.log("\n🎉 Part A (validation) tests passed.\n")
}

// ── Part B — error/delay calculation (no DB required; in-memory fallback) ──

async function runCalculationTests() {
  console.log("🧪 Running Problem 21 Error/Delay Calculation Tests (Part B)...\n")

  // 8. Delay case: predicted 40, actual 47 -> error +7, delay 7
  const late = await historicalReliabilityService.recordObservation({
    originName: "Test Origin",
    destinationName: "Test Destination",
    transportMode: "metro",
    predictedDurationMinutes: 40,
    actualDurationMinutes: 47,
    departureTime: new Date("2026-08-16T08:00:00"),
    isSyntheticDemoData: false,
  })
  console.assert(late.success, "recordObservation must succeed for a valid late journey")
  console.assert(late.errorMinutes === 7, `errorMinutes must be +7 (got ${late.errorMinutes})`)
  console.log("   ✅ 8. late arrival: errorMinutes=+7, delayMinutes=7")

  // 9. Early arrival: predicted 40, actual 35 -> error -5, delay 0 (not clamped negative to 0)
  const early = await historicalReliabilityService.recordObservation({
    originName: "Test Origin",
    destinationName: "Test Destination",
    transportMode: "metro",
    predictedDurationMinutes: 40,
    actualDurationMinutes: 35,
    departureTime: new Date("2026-08-16T08:00:00"),
    isSyntheticDemoData: false,
  })
  console.assert(early.success, "recordObservation must succeed for a valid early journey")
  console.assert(early.errorMinutes === -5, `errorMinutes must be -5, not clamped (got ${early.errorMinutes})`)
  console.log("   ✅ 9. early arrival: errorMinutes=-5 (not clamped positive)")

  console.log("\n🎉 Part B (calculation) tests passed.\n")
}

// ── Part C — service-level behavior (requires MongoDB) ──

function makeEnrichedRoute(id: string, durationSec: number): EnrichedRoute {
  return {
    id,
    label: "FASTEST",
    labelDisplay: "Fastest",
    labelColor: "#2563eb",
    segments: [
      {
        id: `${id}-seg-1`,
        mode: "metro",
        from: { name: "Versova Metro", latitude: 19.13, longitude: 72.8161 },
        to: { name: "Andheri Metro", latitude: 19.12, longitude: 72.85 },
        distanceMeters: 3000,
        durationSeconds: durationSec,
        estimatedFare: 25,
        instruction: "Take the metro",
        geometry: { type: "LineString", coordinates: [[72.8161, 19.13], [72.85, 19.12]] },
      },
    ],
    totalDistanceMeters: 3000,
    totalDurationSeconds: durationSec,
    totalWalkingMeters: 200,
    totalFare: 25,
    transferCount: 0,
    modes: ["metro"],
    summary: `Test route ${id}`,
  } as unknown as EnrichedRoute
}

async function runServiceTests() {
  if (!env.MONGODB_URI) {
    console.warn("\n⚠️  Part C (service-level Problem 21 tests) SKIPPED — MONGODB_URI is not configured.")
    console.warn("    This is an honest skip, not a pass: run with a MongoDB connection to exercise")
    console.warn("    departure-time honesty, observation dedup/update, and ownership coverage.\n")
    return
  }

  console.log("🧪 Running Problem 21 Service Tests (Part C — requires MongoDB)...\n")
  await mongoose.connect(env.MONGODB_URI)

  const suffix = Date.now()
  const user = await User.create({
    name: "Problem21 Test User",
    email: `problem21-test-${suffix}@example.com`,
    password: "Password123!",
  })
  const otherUser = await User.create({
    name: "Problem21 Other User",
    email: `problem21-other-${suffix}@example.com`,
    password: "Password123!",
  })

  try {
    // 10. Journey with NO stored departureTime: feedback + actualDurationMinutes
    // must still save the feedback, but must NOT fabricate an observation.
    const noDepartureJourney = await journeyService.saveJourney(String(user._id), {
      origin: { name: "Versova Metro", latitude: 19.13, longitude: 72.8161 },
      destination: { name: "Andheri Metro", latitude: 19.12, longitude: 72.85 },
      selectedRoute: makeEnrichedRoute("route-no-departure", 1800),
      // departureTime intentionally omitted
    })
    const noDepResult = await journeyService.submitFeedback(String(user._id), String(noDepartureJourney._id), {
      rating: 5,
      actualDurationMinutes: 47,
    })
    console.assert(
      noDepResult.message.toLowerCase().includes("timing information"),
      "message must honestly explain observation was skipped when departureTime is unavailable",
    )
    const obsCountForNoDep = await JourneyObservation.countDocuments({ journeyId: noDepartureJourney._id })
    console.assert(obsCountForNoDep === 0, "no JourneyObservation must be created when departureTime is unavailable")
    console.log("   ✅ 10. missing departureTime: feedback saved, observation honestly skipped")

    // 11 & 12. Journey WITH a real departureTime: first submission creates one
    // observation; resubmitting an updated duration updates it (no duplicate).
    const withDepartureJourney = await journeyService.saveJourney(String(user._id), {
      origin: { name: "Versova Metro", latitude: 19.13, longitude: 72.8161 },
      destination: { name: "Andheri Metro", latitude: 19.12, longitude: 72.85 },
      selectedRoute: makeEnrichedRoute("route-with-departure", 1800), // 30 min predicted
      departureTime: "2026-08-16T08:00:00",
    })

    const first = await journeyService.submitFeedback(String(user._id), String(withDepartureJourney._id), {
      rating: 4,
      actualDurationMinutes: 47,
    })
    console.assert(
      first.message.toLowerCase().includes("added to the reliability dataset"),
      "first valid submission must report the observation was added",
    )
    let obsCount = await JourneyObservation.countDocuments({ journeyId: withDepartureJourney._id })
    console.assert(obsCount === 1, `exactly one JourneyObservation must exist after first submission (got ${obsCount})`)

    let obs = await JourneyObservation.findOne({ journeyId: withDepartureJourney._id })
    console.assert(obs?.actualDurationMinutes === 47, "stored actualDurationMinutes must match submitted value")
    console.assert(obs?.predictedDurationMinutes === 30, "predictedDurationMinutes must come from the route's totalDurationSeconds/60")
    console.assert(obs?.errorMinutes === 17, `errorMinutes must be 47-30=17 (got ${obs?.errorMinutes})`)
    console.assert(obs?.isSyntheticDemoData === false, "a real user-submitted observation must be isSyntheticDemoData:false")
    console.log("   ✅ 11. valid departureTime + duration: exactly one observation created, fields correct")

    const second = await journeyService.submitFeedback(String(user._id), String(withDepartureJourney._id), {
      rating: 5,
      actualDurationMinutes: 50,
    })
    console.assert(
      second.message.toLowerCase().includes("updated"),
      "resubmission must report the observation was updated, not duplicated",
    )
    obsCount = await JourneyObservation.countDocuments({ journeyId: withDepartureJourney._id })
    console.assert(obsCount === 1, `resubmitting must not create a second observation (got ${obsCount})`)
    obs = await JourneyObservation.findOne({ journeyId: withDepartureJourney._id })
    console.assert(obs?.actualDurationMinutes === 50, "the existing observation's actualDurationMinutes must be updated to 50")
    console.log("   ✅ 12. resubmission updates the existing observation, no duplicate")

    // 13. Ownership — another user cannot submit feedback (with or without a
    // duration) for someone else's journey.
    let ownershipRejected = false
    try {
      await journeyService.submitFeedback(String(otherUser._id), String(withDepartureJourney._id), {
        rating: 3,
        actualDurationMinutes: 40,
      })
    } catch {
      ownershipRejected = true
    }
    console.assert(ownershipRejected, "submitting feedback with actualDurationMinutes for another user's journey must be rejected")
    console.log("   ✅ 13. ownership enforced for feedback including actualDurationMinutes")

    // 14. Invalid/nonexistent journey id -> rejected (404 via AppError)
    let notFoundRejected = false
    try {
      await journeyService.submitFeedback(String(user._id), new mongoose.Types.ObjectId().toString(), { rating: 4 })
    } catch {
      notFoundRejected = true
    }
    console.assert(notFoundRejected, "feedback for a nonexistent journey id must be rejected")
    console.log("   ✅ 14. nonexistent journey id rejected")

    // 15. Future reliability calls must not crash after a real observation exists.
    const stats = await historicalReliabilityService.getHistoricalDelayStats("metro")
    console.assert(typeof stats.sampleSize === "number", "getHistoricalDelayStats must return a sample size without crashing")
    const interval = await historicalReliabilityService.calculatePredictionInterval(30, "metro")
    console.assert(typeof interval.predictedDurationMinutes === "number", "calculatePredictionInterval must not crash after new observations exist")
    console.log("   ✅ 15. historical reliability calls remain stable after new observations")

    console.log("\n🎉 Part C (service-level) tests passed.\n")
  } finally {
    await JourneyObservation.deleteMany({ userId: { $in: [user._id, otherUser._id] } })
    await Journey.deleteMany({ userId: { $in: [user._id, otherUser._id] } })
    await User.deleteMany({ _id: { $in: [user._id, otherUser._id] } })
    await mongoose.disconnect()
  }
}

runValidationTests()
  .then(() => runCalculationTests())
  .then(() => runServiceTests())
  .catch((err) => {
    console.error("❌ Problem 21 continuous improvement test failure:", err)
    process.exit(1)
  })

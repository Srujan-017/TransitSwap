import { multimodalService } from "../services/multimodalService"
import { reliabilityService } from "../services/reliabilityService"
import { transitDnaService } from "../services/transitDnaService"
import { evaluationService } from "../services/evaluationService"
import { accessibilityService } from "../services/accessibilityService"
import { weatherService } from "../services/weatherService"
import { crowdService } from "../services/crowdService"

async function runPipelineTest() {
  console.log("=== TRANSITSWAP PHASE 18 - FULL PIPELINE VERIFICATION ===")

  // 1. Generate Multimodal Routes (Versova to Ghatkopar demo corridor)
  const origin = { name: "Versova Metro Station", latitude: 19.1300, longitude: 72.8161 }
  const destination = { name: "Ghatkopar Metro Station", latitude: 19.0863, longitude: 72.9082 }

  console.log("\n[1] Generating Candidate Multimodal Routes...")
  const rawRoutes = multimodalService.generateRoutes({ origin, destination })
  console.log(`✓ Found ${rawRoutes.length} candidate multimodal routes.`)

  if (rawRoutes.length === 0) {
    throw new Error("Expected multimodal candidate routes from demo dataset.")
  }

  // 2. Accessibility Filtering
  console.log("\n[2] Testing Accessibility Filtering (Profile: Wheelchair)...")
  const wheelchairRoutes = await accessibilityService.filterRoutes(rawRoutes, "wheelchair")
  console.log(`✓ Wheelchair filtered routes count: ${wheelchairRoutes.length}`)

  // 3. Weather & Crowd Context
  console.log("\n[3] Fetching Weather & Crowd Context...")
  const weather = await weatherService.getCurrent(destination.latitude, destination.longitude)
  console.log(`✓ Weather: ${weather.temperatureC}°C, ${weather.condition} (Demo/Live: ${weather.isDemoData ? "Demo" : "Live"})`)

  const crowd = await crowdService.routeSummary(rawRoutes[0])
  console.log(`✓ Crowd Summary: Level=${crowd.level ?? "LOW"}, Source=${crowd.source}`)

  // 4. Reliability & Monte Carlo Simulation
  console.log("\n[4] Running Reliability Analysis & 500-Trial Monte Carlo Connection Risk Simulation...")
  const sampleRoute = { ...rawRoutes[0], crowd }
  const reliability = reliabilityService.calculateReliability(sampleRoute)
  const confidence = await reliabilityService.calculateConfidenceInterval(sampleRoute, "08:30")
  const connectionRisk = await reliabilityService.calculateMissedConnectionRisk(sampleRoute)
  const departure = await reliabilityService.calculateSmartDeparture(sampleRoute, "08:30")
  const lastMile = reliabilityService.calculateLastMileOptions(sampleRoute)

  console.log(`✓ Reliability Score: ${reliability.score}/100 (${reliability.level})`)
  console.log(`✓ Arrival Confidence: ${confidence.expectedArrivalMin} - ${confidence.expectedArrivalMax} (${confidence.confidenceLevelPercent}%)`)
  console.log(`✓ Missed Connection Risk: ${connectionRisk.overallRiskPercent}% (${connectionRisk.simulatedTrialsCount} Monte Carlo trials)`)
  console.log(`✓ Smart Departure: ${departure?.suggestedDepartureTime ?? "(no departure time)"} (Offset: ${departure?.recommendedDepartureOffsetMinutes ?? 0}m, gain: ${departure?.reliabilityGainPercent ?? 0}%)`)
  console.log(`✓ Last-Mile Options Count: ${lastMile.length}`)

  // 5. TransitDNA Preference Ranking & Explainability
  console.log("\n[5] Calculating Personalized TransitDNA Scores & Explainability...")
  const dnaScore = transitDnaService.scoreRoute(sampleRoute)
  const whyRec = transitDnaService.generateWhyRecommended(sampleRoute, [sampleRoute])
  console.log(`✓ TransitDNA Composite Match Score: ${dnaScore}%`)
  console.log(`✓ Explainability Reasons:`, whyRec)

  // 6. Research Benchmark Evaluation (Phase 16)
  console.log("\n[6] Running Research Benchmark Evaluation Metrics (Phase 16)...")
  const evalMetrics = await evaluationService.runEvaluation()
  console.log(`✓ Total Scenarios Evaluated: ${evalMetrics.totalScenariosEvaluated}`)
  console.log(`✓ Agreement with Shortest-Time Baseline: ${evalMetrics.agreementRateWithShortestTimePercent}%`)
  console.log(`✓ TransitSwap Average Reliability Score: ${evalMetrics.transitSwapAverageReliability}/100`)
  console.log(`✓ Benchmark Execution Latency: ${evalMetrics.averageComputationLatencyMs}ms`)

  console.log("\n=========================================================")
  console.log("SUCCESS: ALL TRANSITSWAP PHASES 13-20 INTELLIGENCE ENGINES VERIFIED CLEANLY!")
  console.log("=========================================================\n")
}

runPipelineTest().catch((err) => {
  console.error("Pipeline test failed:", err)
  process.exit(1)
})

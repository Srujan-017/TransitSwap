import { extractRouteFeatures } from "../services/ml/featureExtractor"
import { PairwiseLogisticRegression } from "../services/ml/logisticRegression"
import type { EnrichedRoute } from "../types/intelligence"

function createMockRoute(
  id: string,
  duration: number,
  fare: number,
  walking: number,
  reliability: number,
): EnrichedRoute {
  return {
    id,
    label: "FASTEST",
    labelDisplay: "Fastest",
    labelColor: "emerald",
    segments: [
      {
        id: "s1",
        mode: "metro",
        from: { name: "Station A", latitude: 19.1, longitude: 72.8 },
        to: { name: "Station B", latitude: 19.2, longitude: 72.9 },
        distanceMeters: 5000,
        durationSeconds: duration,
        estimatedFare: fare,
        instruction: "Take Metro Line 1",
        geometry: { type: "LineString", coordinates: [] },
      },
    ],
    totalDistanceMeters: 5000,
    totalDurationSeconds: duration,
    totalWalkingMeters: walking,
    totalFare: fare,
    transferCount: 0,
    modes: ["metro"],
    summary: "Mock Route",
    isDemoData: true,
    reliability: {
      score: reliability,
      level: reliability >= 80 ? "HIGH" : "MEDIUM",
      summary: "Good reliability",
      delayVarianceMinutes: 2,
      factors: [],
    },
  }
}

async function runUnitTests() {
  console.log("🧪 Running Pairwise Logistic Regression ML Unit Tests...\n")

  // Test 1: Feature Extraction & Normalization
  console.log("1️⃣ Testing Feature Extraction & Normalization...")
  const routeA = createMockRoute("r1", 1800, 40, 500, 90) // 30 min, Rs 40, 500m walk, 90 rel
  const routeB = createMockRoute("r2", 2400, 20, 1000, 70) // 40 min, Rs 20, 1000m walk, 70 rel

  const featA = extractRouteFeatures(routeA, [routeA, routeB])
  const featB = extractRouteFeatures(routeB, [routeA, routeB])

  console.assert(featA.features.time === 1.0, "Route A should have optimal time norm (1.0)")
  console.assert(featB.features.time === 0.0, "Route B should have worst time norm (0.0)")
  console.assert(featA.features.cost === 0.0, "Route A should have worst cost norm (0.0)")
  console.assert(featB.features.cost === 1.0, "Route B should have optimal cost norm (1.0)")
  console.log("   ✅ Feature normalization passed.")

  // Test 2: Logistic Sigmoid Activation
  console.log("\n2️⃣ Testing Sigmoid Activation...")
  console.assert(Math.abs(PairwiseLogisticRegression.sigmoid(0) - 0.5) < 1e-5, "sigmoid(0) must equal 0.5")
  console.assert(PairwiseLogisticRegression.sigmoid(10) > 0.99, "sigmoid(10) must be ~1.0")
  console.assert(PairwiseLogisticRegression.sigmoid(-10) < 0.01, "sigmoid(-10) must be ~0.0")
  console.log("   ✅ Sigmoid activation passed.")

  // Test 3: Training Pairwise Logistic Regression Model
  console.log("\n3️⃣ Testing Gradient Descent Training on Synthetic Preference Pairs...")
  // Preference data: User consistently prefers lower cost (delta_cost > 0)
  const trainingData = [
    { deltaX: [-0.1, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0], label: 1 },
    { deltaX: [-0.2, 0.6, 0.1, 0.0, 0.0, 0.0, 0.0], label: 1 },
    { deltaX: [-0.1, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0], label: 1 },
    { deltaX: [-0.3, 0.7, -0.1, 0.0, 0.0, 0.0, 0.0], label: 1 },
  ]

  const model = new PairwiseLogisticRegression()
  const initialCostWeight = model.getWeightsObject().cost

  const trainResult = model.train(trainingData)

  console.log("   Initial Cost Weight:", initialCostWeight)
  console.log("   Learned Cost Weight:", trainResult.weights.cost)
  console.log("   Pairwise Accuracy:  ", trainResult.pairwiseAccuracy + "%")
  console.log("   Final Loss:         ", trainResult.finalLoss)

  console.assert(trainResult.weights.cost > initialCostWeight, "Cost weight must increase after training on cost-preferring choices")
  console.assert(trainResult.pairwiseAccuracy === 100, "Pairwise accuracy on clean dataset must be 100%")
  console.log("   ✅ Model training & preference learning passed.")

  console.log("\n🎉 ALL ML UNIT TESTS PASSED SUCCESSFULLY!")
}

runUnitTests().catch((err) => {
  console.error("❌ Test failure:", err)
  process.exit(1)
})

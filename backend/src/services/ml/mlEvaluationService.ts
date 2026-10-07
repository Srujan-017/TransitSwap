import { PairwiseLogisticRegression, type LogisticModelWeights } from "./logisticRegression"
import { createSeededRandom, seededGaussianNoise, seededShuffle } from "./seededRandom"

export interface MLEvaluationReport {
  isSimulatedBenchmark: true
  totalSamplesCount: number
  trainingSamplesCount: number
  testSamplesCount: number
  mlPairwiseAccuracyPercent: number
  baselineRuleAccuracyPercent: number
  accuracyImprovementPercent: number
  logLoss: number
  learnedWeights: LogisticModelWeights
  disclaimer: string
  evaluatedAt: string
}

interface SyntheticSample {
  deltaX: number[]
  label: number
  archetype: string
}

// Phase 8 — fixed seed so the synthetic dataset and its split are
// reproducible: the same seed always yields the same noisy samples and the
// same train/test partition, so the reported numbers don't drift between runs.
const BENCHMARK_SEED = 7
const NOISE_SCALE = 0.3
const SAMPLES_PER_ARCHETYPE = 20
const TRAIN_RATIO = 0.8

export const mlEvaluationService = {
  /**
   * Generates a reproducible synthetic pairwise dataset for demo & benchmark comparison,
   * trains both Pairwise Logistic Regression and measures baseline rule agreement.
   * isSimulatedBenchmark — this evaluates learning dynamics on synthetic archetypes,
   * NOT real user behavior; see the disclaimer field on the returned report.
   */
  async runMLEvaluation(): Promise<MLEvaluationReport> {
    const syntheticSamples = this.generateSyntheticPreferenceDataset()
    const totalSamples = syntheticSamples.length

    // Phase 8 fix — the previous positional 80/20 slice was taken from an
    // unshuffled, archetype-ordered list, so the test set (the last 20%) was
    // drawn entirely from whichever archetype happened to be generated last —
    // never a mix of all 3. A stratified split guarantees every archetype (and
    // both labels) appears in both the train and test sets.
    const { train: trainSamples, test: testSamples } = stratifiedSplit(syntheticSamples, TRAIN_RATIO, BENCHMARK_SEED)

    // 1. Train Proposed Pairwise Logistic Regression Model
    const mlModel = new PairwiseLogisticRegression()
    const trainResult = mlModel.train(trainSamples)
    // Phase 8 — accuracy is reported from the held-out test set only;
    // trainResult.pairwiseAccuracy (computed on the training data itself) is
    // intentionally not surfaced here, since a model's fit to its own
    // training data says nothing about whether it generalizes.
    const mlTestAccuracy = mlModel.evaluateAccuracy(testSamples)

    // 2. Evaluate Baseline Rule-Based Model on the exact same Test Set
    const baselineAccuracy = this.evaluateBaselineAccuracy(testSamples)

    const improvement = Number((mlTestAccuracy - baselineAccuracy).toFixed(1))

    return {
      isSimulatedBenchmark: true,
      totalSamplesCount: totalSamples,
      trainingSamplesCount: trainSamples.length,
      testSamplesCount: testSamples.length,
      mlPairwiseAccuracyPercent: mlTestAccuracy,
      baselineRuleAccuracyPercent: baselineAccuracy,
      accuracyImprovementPercent: improvement,
      logLoss: trainResult.finalLoss,
      learnedWeights: trainResult.weights,
      disclaimer:
        "PROTOTYPE RESEARCH EVALUATION — Evaluated using a stratified 80/20 train/test split on synthetic, noisy, two-class (balanced) commuter choice pairs. Both accuracy figures are measured on the held-out test set only. Demonstrates data-driven Pairwise Logistic Regression learning-to-rank optimization over fixed baseline rules; it is NOT a measurement of real user behavior.",
      evaluatedAt: new Date().toISOString(),
    }
  },

  /**
   * Generates reproducible, noisy, two-class synthetic pairwise training data
   * representing 3 distinct commuter archetypes:
   * 1. Budget Commuter (prefers low cost)
   * 2. Hurry/Speed/Reliability Commuter (prefers low duration & high reliability & low risk)
   * 3. Accessible/Comfort Commuter (prefers low walking & high accessibility)
   *
   * Phase 8 fix — previously every sample had label 1 (chosen > rejected) and
   * an exact, noise-free deltaX per archetype, so the dataset was single-class
   * (a constant "always predict 1" classifier scored 100%) and unrealistically
   * clean. Each archetype's base vector now gets independent Gaussian noise
   * per sample ("noisy, varied"), and is mirrored into its {rejected-chosen,
   * label:0} counterpart ("two-class"), exactly like real recorded choices
   * are now stored (see mlPreferenceService.buildPairwiseDocs).
   */
  generateSyntheticPreferenceDataset(): SyntheticSample[] {
    const rand = createSeededRandom(BENCHMARK_SEED)

    // 9-D base vectors: [time, cost, walking, reliability, accessibility, crowd, weather, connectionRisk, transfers]
    const archetypes: Array<{ name: string; base: number[] }> = [
      {
        name: "cost_sensitive",
        // Route A (cheaper, slightly slower, one more transfer): delta_cost > 0, delta_time < 0
        base: [-0.2, 0.5, 0.1, 0.0, 0.0, 0.1, 0.0, 0.0, -0.1],
      },
      {
        name: "speed_reliability_sensitive",
        // Route B (faster, more reliable, lower risk, pricier): delta_time > 0, delta_rel > 0, delta_cost < 0
        base: [0.4, -0.3, 0.0, 0.4, 0.0, 0.1, 0.1, 0.3, 0.1],
      },
      {
        name: "walking_accessibility_sensitive",
        // Route C (less walking, accessible, fewer transfers)
        base: [0.0, -0.1, 0.5, 0.1, 0.4, 0.1, 0.2, 0.05, 0.15],
      },
    ]

    const samples: SyntheticSample[] = []
    for (const archetype of archetypes) {
      for (let i = 0; i < SAMPLES_PER_ARCHETYPE; i++) {
        const deltaX = archetype.base.map((value) =>
          Number(Math.max(-1, Math.min(1, value + seededGaussianNoise(rand, NOISE_SCALE))).toFixed(4)),
        )
        samples.push({ deltaX, label: 1, archetype: archetype.name })
        samples.push({ deltaX: deltaX.map((v) => -v), label: 0, archetype: archetype.name })
      }
    }

    return samples
  },

  /**
   * Measures fixed rule-based baseline accuracy on test samples, using the
   * same 9-feature standard-profile weights as transitDnaService.DEFAULT_WEIGHTS.
   */
  evaluateBaselineAccuracy(samples: Array<{ deltaX: number[]; label: number }>): number {
    if (samples.length === 0) return 0
    // Fixed baseline weights, matching mlPreferenceService's DEFAULT_WEIGHTS order:
    // time, cost, walking, reliability, accessibility, crowd, weather, connectionRisk, transfers
    const baselineWeights = [0.25, 0.15, 0.20, 0.25, 0.15, 0.10, 0.10, 0.15, 0.10]
    let correct = 0

    for (const sample of samples) {
      const scoreDiff = baselineWeights.reduce((sum, w, idx) => sum + w * (sample.deltaX[idx] ?? 0), 0)
      const pred = scoreDiff >= 0 ? 1 : 0
      if (pred === sample.label) {
        correct++
      }
    }

    return Number(((correct / samples.length) * 100).toFixed(1))
  },
}

/**
 * Phase 8 — splits samples into train/test while guaranteeing every
 * (archetype, label) group is represented in both sets (when it has ≥2
 * members), rather than a positional slice that can starve the test set of
 * whole archetypes or labels entirely.
 */
export function stratifiedSplit<T extends { archetype: string; label: number }>(
  samples: T[],
  trainRatio: number,
  seed: number,
): { train: T[]; test: T[] } {
  const groups = new Map<string, T[]>()
  for (const sample of samples) {
    const key = `${sample.archetype}:${sample.label}`
    const group = groups.get(key) ?? []
    group.push(sample)
    groups.set(key, group)
  }

  const train: T[] = []
  const test: T[] = []
  let groupIndex = 0
  for (const group of groups.values()) {
    const shuffled = seededShuffle(group, seed + groupIndex)
    groupIndex += 1
    const splitIdx = group.length >= 2 ? Math.max(1, Math.round(group.length * trainRatio)) : group.length
    train.push(...shuffled.slice(0, splitIdx))
    test.push(...shuffled.slice(splitIdx))
  }

  return {
    train: seededShuffle(train, seed + 1000),
    test: seededShuffle(test, seed + 2000),
  }
}

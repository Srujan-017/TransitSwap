/**
 * Pairwise Logistic Regression Engine for Learning-to-Rank.
 *
 * Implements mathematical binary logistic regression trained on pairwise difference vectors:
 * Delta_X = X_preferred - X_rejected
 * Target: y = 1 for preferred > rejected
 *
 * Probability formula:
 * P(A > B) = sigmoid(w · (X_A - X_B)) = 1 / (1 + e^(-w · Delta_X))
 */

export interface LogisticModelWeights {
  time: number
  cost: number
  walking: number
  reliability: number
  accessibility: number
  crowd: number
  weather: number
}

export interface TrainingSample {
  deltaX: number[] // 7-D difference vector: X_preferred - X_rejected
  label: number    // 1 for preferred > rejected
}

export interface TrainingResult {
  weights: LogisticModelWeights
  weightsArray: number[]
  iterations: number
  finalLoss: number
  pairwiseAccuracy: number
  sampleCount: number
}

export class PairwiseLogisticRegression {
  private weights: number[]
  private learningRate: number
  private maxIterations: number
  private l2Penalty: number

  constructor(
    initialWeights: number[] = [0.25, 0.15, 0.20, 0.25, 0.15, 0.10, 0.10],
    learningRate = 0.05,
    maxIterations = 200,
    l2Penalty = 0.01,
  ) {
    this.weights = [...initialWeights]
    this.learningRate = learningRate
    this.maxIterations = maxIterations
    this.l2Penalty = l2Penalty
  }

  /**
   * Sigmoid activation function: 1 / (1 + e^-z)
   * Bounds input z to [-20, 20] to avoid floating point underflow/overflow.
   */
  public static sigmoid(z: number): number {
    const boundedZ = Math.max(-20, Math.min(20, z))
    return 1 / (1 + Math.exp(-boundedZ))
  }

  /**
   * Computes dot product between weight vector w and difference vector deltaX
   */
  public static dot(w: number[], deltaX: number[]): number {
    return w.reduce((sum, val, idx) => sum + val * (deltaX[idx] ?? 0), 0)
  }

  /**
   * Predicts preference probability P(A > B) given feature difference deltaX = X_A - X_B
   */
  public predictProbability(deltaX: number[]): number {
    const z = PairwiseLogisticRegression.dot(this.weights, deltaX)
    return PairwiseLogisticRegression.sigmoid(z)
  }

  /**
   * Computes Binary Cross-Entropy Loss with L2 Regularization
   */
  public computeLoss(samples: TrainingSample[]): number {
    if (samples.length === 0) return 0
    let totalLoss = 0

    for (const sample of samples) {
      const p = this.predictProbability(sample.deltaX)
      // Clamp p to [1e-7, 1 - 1e-7] for log safety
      const clampedP = Math.max(1e-7, Math.min(1 - 1e-7, p))
      const loss = -(sample.label * Math.log(clampedP) + (1 - sample.label) * Math.log(1 - clampedP))
      totalLoss += loss
    }

    const bce = totalLoss / samples.length
    const l2Norm = this.weights.reduce((sum, w) => sum + w * w, 0)
    return bce + 0.5 * this.l2Penalty * l2Norm
  }

  /**
   * Computes pairwise classification accuracy (%) on a sample set
   */
  public evaluateAccuracy(samples: TrainingSample[]): number {
    if (samples.length === 0) return 0
    let correct = 0

    for (const sample of samples) {
      const p = this.predictProbability(sample.deltaX)
      const pred = p >= 0.5 ? 1 : 0
      if (pred === sample.label) {
        correct++
      }
    }

    return Number(((correct / samples.length) * 100).toFixed(1))
  }

  /**
   * Trains the pairwise logistic regression model via Batch Gradient Descent
   */
  public train(samples: TrainingSample[]): TrainingResult {
    if (samples.length === 0) {
      return {
        weights: this.getWeightsObject(),
        weightsArray: [...this.weights],
        iterations: 0,
        finalLoss: 0,
        pairwiseAccuracy: 0,
        sampleCount: 0,
      }
    }

    const numFeatures = this.weights.length
    const N = samples.length

    for (let iter = 0; iter < this.maxIterations; iter++) {
      const gradients = new Array(numFeatures).fill(0)

      for (const sample of samples) {
        const p = this.predictProbability(sample.deltaX)
        const error = p - sample.label // (hat{y} - y)

        for (let j = 0; j < numFeatures; j++) {
          gradients[j] += error * (sample.deltaX[j] ?? 0)
        }
      }

      // Update weights with gradient step & L2 regularization
      for (let j = 0; j < numFeatures; j++) {
        const grad = gradients[j] / N + this.l2Penalty * this.weights[j]
        this.weights[j] -= this.learningRate * grad
        // Ensure non-negative feature weight constraint so higher feature values correlate with preference
        this.weights[j] = Math.max(0.01, this.weights[j])
      }
    }

    const finalLoss = this.computeLoss(samples)
    const accuracy = this.evaluateAccuracy(samples)

    return {
      weights: this.getWeightsObject(),
      weightsArray: [...this.weights],
      iterations: this.maxIterations,
      finalLoss: Number(finalLoss.toFixed(4)),
      pairwiseAccuracy: accuracy,
      sampleCount: N,
    }
  }

  public getWeightsArray(): number[] {
    return [...this.weights]
  }

  public getWeightsObject(): LogisticModelWeights {
    return {
      time: Number(this.weights[0].toFixed(4)),
      cost: Number(this.weights[1].toFixed(4)),
      walking: Number(this.weights[2].toFixed(4)),
      reliability: Number(this.weights[3].toFixed(4)),
      accessibility: Number(this.weights[4].toFixed(4)),
      crowd: Number(this.weights[5].toFixed(4)),
      weather: Number(this.weights[6].toFixed(4)),
    }
  }

  public setWeights(w: number[] | LogisticModelWeights): void {
    if (Array.isArray(w)) {
      this.weights = [...w]
    } else {
      this.weights = [w.time, w.cost, w.walking, w.reliability, w.accessibility, w.crowd, w.weather]
    }
  }
}

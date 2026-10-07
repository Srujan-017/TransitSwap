import mongoose from "mongoose"
import { JourneyObservation, type IJourneyObservation } from "../../models/JourneyObservation"
import { parseLocalDateTime } from "../../utils/dateTime"

export interface HistoricalErrorStats {
  sampleSize: number
  meanErrorMinutes: number
  standardDeviationMinutes: number
  varianceMinutes: number
  minErrorMinutes: number
  maxErrorMinutes: number
  isSufficientData: boolean
  groupingLevel: "route_specific" | "mode_specific" | "overall_transit" | "insufficient_data"
  // Problem 2 fix — whether the observations behind this stats group are
  // synthetic/demo or real, computed from the actual records used (previously
  // this wasn't tracked here at all, and calculatePredictionInterval() below
  // just hardcoded `true`).
  isSyntheticDemoData: boolean
}

export interface PredictionIntervalResult {
  predictedDurationMinutes: number
  expectedArrivalMinStr: string
  expectedArrivalMaxStr: string
  lowerBound90Minutes: number
  upperBound90Minutes: number
  lowerBound95Minutes: number
  upperBound95Minutes: number
  margin90Minutes: number
  margin95Minutes: number
  meanErrorMinutes: number
  stdDevMinutes: number
  sampleSize: number
  confidenceLevelPercent: number
  reliabilityStatus: "data_driven_high" | "data_driven_moderate" | "limited_historical_data" | "insufficient_data"
  explanation: string
  groupingLevel: string
  isSyntheticDemoData: boolean
  // Problem 2 fix — explicit flag so callers/UI never need to infer "is this a
  // genuine statistical interval" from reliabilityStatus string matching alone.
  isDataDriven: boolean
}

export interface CoverageEvaluationReport {
  isSimulatedBenchmark: true
  totalTestJourneys: number
  covered90Count: number
  covered95Count: number
  empiricalCoverage90Percent: number
  empiricalCoverage95Percent: number
  meanObservedError: number
  stdDevObservedError: number
  disclaimer: string
  evaluatedAt: string
}

const MINIMUM_SAMPLE_THRESHOLD = 5

// In-memory fallback dataset for offline / unauthenticated demo mode
const memoryObservations: Array<{
  transportMode: string
  predictedDurationMinutes: number
  actualDurationMinutes: number
  errorMinutes: number
  delayMinutes: number
  createdAt: Date
  isSyntheticDemoData: boolean
}> = []

export const historicalReliabilityService = {
  /**
   * Records a new journey observation after duration validation.
   */
  async recordObservation(input: {
    userId?: string
    // Problem 21 — when provided, this observation is linked to (and, on a
    // second call for the same journey, upserted onto) that Journey's single
    // observation record instead of creating a duplicate.
    journeyId?: string
    routeId?: string
    originName: string
    destinationName: string
    transportMode: "metro" | "bus" | "walking" | "auto" | "multimodal"
    predictedDurationMinutes: number
    actualDurationMinutes?: number
    departureTime: Date | string
    arrivalTime?: Date | string
    weatherCondition?: string
    crowdLevel?: "LOW" | "MEDIUM" | "HIGH"
    transferCount?: number
    isSyntheticDemoData?: boolean
  }): Promise<{ success: boolean; observationId?: string; errorMinutes?: number; wasUpdate?: boolean; message: string }> {
    const departure = new Date(input.departureTime)
    let arrival: Date

    if (input.arrivalTime) {
      arrival = new Date(input.arrivalTime)
    } else if (typeof input.actualDurationMinutes === "number" && input.actualDurationMinutes > 0) {
      arrival = new Date(departure.getTime() + input.actualDurationMinutes * 60 * 1000)
    } else {
      return { success: false, message: "Invalid journey observation: arrival time or actual duration required." }
    }

    // Step 3: Compute actual duration & validate
    const actualMin = (arrival.getTime() - departure.getTime()) / (1000 * 60)
    const predictedMin = input.predictedDurationMinutes

    if (isNaN(actualMin) || actualMin <= 0 || actualMin > 1440) {
      return { success: false, message: "Invalid actual duration computed (must be 0 < duration <= 24 hrs)." }
    }
    if (isNaN(predictedMin) || predictedMin <= 0 || predictedMin > 1440) {
      return { success: false, message: "Invalid predicted duration provided." }
    }

    // Step 4 & 5: Compute error = actual - predicted, delay = max(0, actual - predicted)
    const errorMinutes = Number((actualMin - predictedMin).toFixed(2))
    const delayMinutes = Number(Math.max(0, actualMin - predictedMin).toFixed(2))

    if (mongoose.connection.readyState === 1) {
      try {
        const payload = {
          userId: input.userId ? new mongoose.Types.ObjectId(input.userId) : undefined,
          journeyId: input.journeyId ? new mongoose.Types.ObjectId(input.journeyId) : undefined,
          routeId: input.routeId,
          originName: input.originName,
          destinationName: input.destinationName,
          transportMode: input.transportMode,
          predictedDurationMinutes: predictedMin,
          actualDurationMinutes: Number(actualMin.toFixed(2)),
          errorMinutes,
          delayMinutes,
          departureTime: departure,
          arrivalTime: arrival,
          weatherCondition: input.weatherCondition,
          crowdLevel: input.crowdLevel,
          transferCount: input.transferCount ?? 0,
          isSyntheticDemoData: input.isSyntheticDemoData ?? false,
        }

        // Problem 21 — a journeyId means this observation belongs to exactly one
        // Journey. Upsert on it so re-submitting a revised actual duration for
        // the same journey updates that one record rather than creating another.
        let wasUpdate = false
        if (input.journeyId) {
          const existing = await JourneyObservation.findOne({ journeyId: payload.journeyId })
          wasUpdate = existing !== null
        }
        const obs = input.journeyId
          ? (await JourneyObservation.findOneAndUpdate(
              { journeyId: payload.journeyId },
              payload,
              { upsert: true, new: true, setDefaultsOnInsert: true },
            ))!
          : await JourneyObservation.create(payload)

        return {
          success: true,
          observationId: obs._id.toString(),
          errorMinutes,
          wasUpdate,
          message: `Journey observation ${wasUpdate ? "updated" : "saved"}. Error: ${errorMinutes >= 0 ? "+" : ""}${errorMinutes} min (delay: ${delayMinutes} min).`,
        }
      } catch (err) {
        console.warn("⚠️ Failed to store observation in DB:", err)
      }
    }

    // Offline memory fallback
    memoryObservations.push({
      transportMode: input.transportMode,
      predictedDurationMinutes: predictedMin,
      actualDurationMinutes: Number(actualMin.toFixed(2)),
      errorMinutes,
      delayMinutes,
      createdAt: new Date(),
      isSyntheticDemoData: input.isSyntheticDemoData ?? false,
    })

    return {
      success: true,
      errorMinutes,
      message: `Journey observation cached in memory. Error: ${errorMinutes >= 0 ? "+" : ""}${errorMinutes} min.`,
    }
  },

  /**
   * Step 6 & 8: Computes sample mean error & sample standard deviation with hierarchical fallback.
   */
  async getHistoricalStatistics(
    transportMode?: string,
    routeId?: string,
  ): Promise<HistoricalErrorStats> {
    let rawErrors: number[] = []
    let groupingLevel: HistoricalErrorStats["groupingLevel"] = "insufficient_data"
    let isSyntheticDemoData = false

    if (mongoose.connection.readyState === 1) {
      try {
        // Hierarchical Fallback Step 1: Route-specific historical data
        if (routeId) {
          const routeObs = await JourneyObservation.find({ routeId }).select("errorMinutes isSyntheticDemoData")
          if (routeObs.length >= MINIMUM_SAMPLE_THRESHOLD) {
            rawErrors = routeObs.map((o) => o.errorMinutes)
            groupingLevel = "route_specific"
            isSyntheticDemoData = routeObs.some((o) => o.isSyntheticDemoData)
          }
        }

        // Hierarchical Fallback Step 2: Mode-specific historical data
        if (rawErrors.length < MINIMUM_SAMPLE_THRESHOLD && transportMode) {
          const modeObs = await JourneyObservation.find({ transportMode }).select("errorMinutes isSyntheticDemoData")
          if (modeObs.length >= MINIMUM_SAMPLE_THRESHOLD) {
            rawErrors = modeObs.map((o) => o.errorMinutes)
            groupingLevel = "mode_specific"
            isSyntheticDemoData = modeObs.some((o) => o.isSyntheticDemoData)
          }
        }

        // Hierarchical Fallback Step 3: Overall transit historical data
        if (rawErrors.length < MINIMUM_SAMPLE_THRESHOLD) {
          const allObs = await JourneyObservation.find().select("errorMinutes isSyntheticDemoData")
          if (allObs.length >= MINIMUM_SAMPLE_THRESHOLD) {
            rawErrors = allObs.map((o) => o.errorMinutes)
            groupingLevel = "overall_transit"
            isSyntheticDemoData = allObs.some((o) => o.isSyntheticDemoData)
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to query historical stats from DB:", err)
      }
    }

    // Memory cache fallback if DB unavailable or empty
    if (rawErrors.length < MINIMUM_SAMPLE_THRESHOLD && memoryObservations.length > 0) {
      const modeFiltered = memoryObservations.filter((o) => !transportMode || o.transportMode === transportMode)
      const target = modeFiltered.length >= MINIMUM_SAMPLE_THRESHOLD ? modeFiltered : memoryObservations
      if (target.length >= MINIMUM_SAMPLE_THRESHOLD) {
        rawErrors = target.map((o) => o.errorMinutes)
        groupingLevel = modeFiltered.length >= MINIMUM_SAMPLE_THRESHOLD ? "mode_specific" : "overall_transit"
        isSyntheticDemoData = target.some((o) => o.isSyntheticDemoData)
      }
    }

    const N = rawErrors.length
    if (N < MINIMUM_SAMPLE_THRESHOLD) {
      return {
        sampleSize: N,
        meanErrorMinutes: 0,
        standardDeviationMinutes: 0,
        varianceMinutes: 0,
        minErrorMinutes: 0,
        maxErrorMinutes: 0,
        isSufficientData: false,
        groupingLevel: "insufficient_data",
        isSyntheticDemoData: false,
      }
    }

    // Mathematical Mean: mu = sum(error_i) / N
    const meanError = rawErrors.reduce((sum, err) => sum + err, 0) / N

    // Sample Variance & Standard Deviation: s = sqrt( sum((x_i - mu)^2) / (N - 1) )
    const ss = rawErrors.reduce((sum, err) => sum + Math.pow(err - meanError, 2), 0)
    const variance = N > 1 ? ss / (N - 1) : 0
    const stdDev = Math.sqrt(variance)

    return {
      sampleSize: N,
      meanErrorMinutes: Number(meanError.toFixed(2)),
      standardDeviationMinutes: Number(stdDev.toFixed(2)),
      varianceMinutes: Number(variance.toFixed(2)),
      minErrorMinutes: Math.min(...rawErrors),
      maxErrorMinutes: Math.max(...rawErrors),
      isSufficientData: true,
      groupingLevel,
      isSyntheticDemoData,
    }
  },

  /**
   * Step 7: Computes data-driven prediction intervals (90% & 95% confidence windows).
   * Range formula: predictedDuration + meanError +/- z * stdDev
   */
  async calculatePredictionInterval(
    predictedDurationMinutes: number,
    transportMode?: string,
    routeId?: string,
    departureTimeStr?: string,
  ): Promise<PredictionIntervalResult> {
    const stats = await this.getHistoricalStatistics(transportMode, routeId)
    // Problem 13 fix — safe local parsing instead of `new Date("08:30")` (Invalid
    // Date). null means no usable departure time was supplied; label honestly
    // rather than silently pretending the user chose "now".
    const parsedDeparture = parseLocalDateTime(departureTimeStr)
    const departureDate = parsedDeparture ?? new Date()
    const noTimePrefix = parsedDeparture ? "" : "No departure time selected — showing an estimate for leaving now. "

    if (!stats.isSufficientData) {
      // Step 19: Cold start — no fake statistical intervals
      const defaultLower = Math.max(1, Math.round(predictedDurationMinutes * 0.9))
      const defaultUpper = Math.round(predictedDurationMinutes * 1.15)
      const minArr = new Date(departureDate.getTime() + defaultLower * 60 * 1000)
      const maxArr = new Date(departureDate.getTime() + defaultUpper * 60 * 1000)

      return {
        predictedDurationMinutes: Math.round(predictedDurationMinutes),
        expectedArrivalMinStr: this.formatClockTime(minArr),
        expectedArrivalMaxStr: this.formatClockTime(maxArr),
        lowerBound90Minutes: defaultLower,
        upperBound90Minutes: defaultUpper,
        lowerBound95Minutes: defaultLower,
        upperBound95Minutes: defaultUpper,
        margin90Minutes: Math.round((defaultUpper - defaultLower) / 2),
        margin95Minutes: Math.round((defaultUpper - defaultLower) / 2),
        meanErrorMinutes: 0,
        stdDevMinutes: 0,
        sampleSize: stats.sampleSize,
        // Problem 2 fix — this is NOT a genuine 90% statistical confidence
        // level (there isn't enough data to compute one). 0 + isDataDriven:false
        // tells callers/UI not to display it as a real confidence percentage.
        confidenceLevelPercent: 0,
        reliabilityStatus: "insufficient_data",
        explanation: `${noTimePrefix}Prototype fallback estimate — insufficient historical observations to compute a genuine confidence interval.`,
        groupingLevel: "insufficient_data",
        isSyntheticDemoData: false,
        isDataDriven: false,
      }
    }

    // Step 7 Critical values: z_90 = 1.645, z_95 = 1.96
    const z90 = 1.645
    const z95 = 1.96

    const expectedMean = predictedDurationMinutes + stats.meanErrorMinutes
    const margin90 = Math.max(1.5, z90 * stats.standardDeviationMinutes)
    const margin95 = Math.max(2.0, z95 * stats.standardDeviationMinutes)

    const lower90 = Math.max(1, Math.round(expectedMean - margin90))
    const upper90 = Math.round(expectedMean + margin90)
    const lower95 = Math.max(1, Math.round(expectedMean - margin95))
    const upper95 = Math.round(expectedMean + margin95)

    const minArr = new Date(departureDate.getTime() + lower90 * 60 * 1000)
    const maxArr = new Date(departureDate.getTime() + upper90 * 60 * 1000)

    const status: PredictionIntervalResult["reliabilityStatus"] =
      stats.sampleSize >= 20 ? "data_driven_high" : "data_driven_moderate"

    return {
      predictedDurationMinutes: Math.round(predictedDurationMinutes),
      expectedArrivalMinStr: this.formatClockTime(minArr),
      expectedArrivalMaxStr: this.formatClockTime(maxArr),
      lowerBound90Minutes: lower90,
      upperBound90Minutes: upper90,
      lowerBound95Minutes: lower95,
      upperBound95Minutes: upper95,
      margin90Minutes: Math.round(margin90),
      margin95Minutes: Math.round(margin95),
      meanErrorMinutes: stats.meanErrorMinutes,
      stdDevMinutes: stats.standardDeviationMinutes,
      sampleSize: stats.sampleSize,
      confidenceLevelPercent: 90,
      reliabilityStatus: status,
      explanation: `${noTimePrefix}90% prediction interval based on prototype historical data (${stats.sampleSize} ${stats.groupingLevel.replace("_", " ")} observations, mean error: ${stats.meanErrorMinutes >= 0 ? "+" : ""}${stats.meanErrorMinutes}m, σ=${stats.standardDeviationMinutes}m).`,
      groupingLevel: stats.groupingLevel,
      // Problem 2 fix — reflects whether the observations actually used were
      // synthetic/demo, instead of always claiming true.
      isSyntheticDemoData: stats.isSyntheticDemoData,
      isDataDriven: true,
    }
  },

  /**
   * Step 16, 17, 18: Empirical coverage calculation on 80/20 train/test split.
   */
  async calculateCoverageEvaluation(): Promise<CoverageEvaluationReport> {
    const demoData = this.generateSyntheticJourneyObservations()

    // 80/20 Chronological Split
    const splitIdx = Math.floor(demoData.length * 0.8)
    const trainSet = demoData.slice(0, splitIdx)
    const testSet = demoData.slice(splitIdx)

    // Compute training parameters from trainSet
    const trainErrors = trainSet.map((d) => d.errorMinutes)
    const N = trainErrors.length
    const meanError = trainErrors.reduce((a, b) => a + b, 0) / N
    const ss = trainErrors.reduce((sum, e) => sum + Math.pow(e - meanError, 2), 0)
    const stdDev = Math.sqrt(ss / (N - 1))

    const z90 = 1.645
    const z95 = 1.96
    const margin90 = z90 * stdDev
    const margin95 = z95 * stdDev

    let covered90 = 0
    let covered95 = 0

    // Evaluate empirical coverage on unseen testSet
    for (const testObs of testSet) {
      const expectedMean = testObs.predictedDurationMinutes + meanError
      const lower90 = expectedMean - margin90
      const upper90 = expectedMean + margin90
      const lower95 = expectedMean - margin95
      const upper95 = expectedMean + margin95

      if (testObs.actualDurationMinutes >= lower90 && testObs.actualDurationMinutes <= upper90) {
        covered90++
      }
      if (testObs.actualDurationMinutes >= lower95 && testObs.actualDurationMinutes <= upper95) {
        covered95++
      }
    }

    const testN = testSet.length || 1
    const coverage90 = Number(((covered90 / testN) * 100).toFixed(1))
    const coverage95 = Number(((covered95 / testN) * 100).toFixed(1))

    return {
      isSimulatedBenchmark: true,
      totalTestJourneys: testN,
      covered90Count: covered90,
      covered95Count: covered95,
      empiricalCoverage90Percent: coverage90,
      empiricalCoverage95Percent: coverage95,
      meanObservedError: Number(meanError.toFixed(2)),
      stdDevObservedError: Number(stdDev.toFixed(2)),
      disclaimer:
        "PROTOTYPE RESEARCH EVALUATION — Empirical coverage measured on unseen test dataset using 80/20 chronological train/test split. All demo observations are synthetic.",
      evaluatedAt: new Date().toISOString(),
    }
  },

  /**
   * Step 7, 8, 9, 10, 11: Computes data-driven delay statistics (mean delay & sample std dev)
   * with hierarchical mode/transit fallback and minimum sample thresholding.
   */
  async getHistoricalDelayStats(
    transportMode?: string,
    routeId?: string,
  ): Promise<{
    sampleSize: number
    meanDelayMinutes: number
    standardDeviationMinutes: number
    delays: number[]
    isSufficientData: boolean
    groupingLevel: "route_specific" | "mode_specific" | "overall_transit" | "insufficient_data"
    dataSource: "historical" | "synthetic_demo" | "insufficient_data"
  }> {
    let rawDelays: number[] = []
    let groupingLevel: "route_specific" | "mode_specific" | "overall_transit" | "insufficient_data" = "insufficient_data"
    let dataSource: "historical" | "synthetic_demo" | "insufficient_data" = "insufficient_data"

    if (mongoose.connection.readyState === 1) {
      try {
        // Hierarchical Fallback Step 1: Route-specific historical delays
        if (routeId) {
          const routeObs = await JourneyObservation.find({ routeId }).select("delayMinutes errorMinutes isSyntheticDemoData")
          if (routeObs.length >= MINIMUM_SAMPLE_THRESHOLD) {
            rawDelays = routeObs.map((o) => typeof o.delayMinutes === "number" ? o.delayMinutes : Math.max(0, o.errorMinutes))
            groupingLevel = "route_specific"
            dataSource = routeObs.some((o) => o.isSyntheticDemoData) ? "synthetic_demo" : "historical"
          }
        }

        // Hierarchical Fallback Step 2: Mode-specific historical delays
        if (rawDelays.length < MINIMUM_SAMPLE_THRESHOLD && transportMode) {
          const modeObs = await JourneyObservation.find({ transportMode }).select("delayMinutes errorMinutes isSyntheticDemoData")
          if (modeObs.length >= MINIMUM_SAMPLE_THRESHOLD) {
            rawDelays = modeObs.map((o) => typeof o.delayMinutes === "number" ? o.delayMinutes : Math.max(0, o.errorMinutes))
            groupingLevel = "mode_specific"
            dataSource = modeObs.some((o) => o.isSyntheticDemoData) ? "synthetic_demo" : "historical"
          }
        }

        // Hierarchical Fallback Step 3: Overall transit historical delays
        if (rawDelays.length < MINIMUM_SAMPLE_THRESHOLD) {
          const allObs = await JourneyObservation.find().select("delayMinutes errorMinutes isSyntheticDemoData")
          if (allObs.length >= MINIMUM_SAMPLE_THRESHOLD) {
            rawDelays = allObs.map((o) => typeof o.delayMinutes === "number" ? o.delayMinutes : Math.max(0, o.errorMinutes))
            groupingLevel = "overall_transit"
            dataSource = allObs.some((o) => o.isSyntheticDemoData) ? "synthetic_demo" : "historical"
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to query historical delay stats from DB:", err)
      }
    }

    // In-memory fallback
    if (rawDelays.length < MINIMUM_SAMPLE_THRESHOLD && memoryObservations.length > 0) {
      const modeFiltered = memoryObservations.filter((o) => !transportMode || o.transportMode === transportMode)
      const target = modeFiltered.length >= MINIMUM_SAMPLE_THRESHOLD ? modeFiltered : memoryObservations
      if (target.length >= MINIMUM_SAMPLE_THRESHOLD) {
        rawDelays = target.map((o) => typeof o.delayMinutes === "number" ? o.delayMinutes : Math.max(0, o.errorMinutes))
        groupingLevel = modeFiltered.length >= MINIMUM_SAMPLE_THRESHOLD ? "mode_specific" : "overall_transit"
        dataSource = "synthetic_demo"
      }
    }

    const N = rawDelays.length
    if (N < MINIMUM_SAMPLE_THRESHOLD) {
      return {
        sampleSize: N,
        meanDelayMinutes: 0,
        standardDeviationMinutes: 0,
        delays: [],
        isSufficientData: false,
        groupingLevel: "insufficient_data",
        dataSource: "insufficient_data",
      }
    }

    // Step 8 & 9: Dynamic Mean & Sample Standard Deviation Calculation
    const meanDelay = rawDelays.reduce((sum, d) => sum + d, 0) / N
    const ss = rawDelays.reduce((sum, d) => sum + Math.pow(d - meanDelay, 2), 0)
    const stdDev = N > 1 ? Math.sqrt(ss / (N - 1)) : 0

    return {
      sampleSize: N,
      meanDelayMinutes: Number(meanDelay.toFixed(2)),
      standardDeviationMinutes: Number(stdDev.toFixed(2)),
      delays: rawDelays,
      isSufficientData: true,
      groupingLevel,
      dataSource,
    }
  },

  /**
   * Step 15 & 16: Data-Driven Monte Carlo simulation using Empirical Resampling
   * (randomly samples from actual stored historical delay observations for 1,000 trials).
   */
  async runDataDrivenMonteCarlo(
    transportMode: string,
    scheduledBufferMinutes: number,
    routeId?: string,
    trialsCount = 1000,
  ): Promise<{
    missProbabilityPercent: number
    simulatedTrialsCount: number
    meanDelayMinutes: number
    stdDevMinutes: number
    sampleSize: number
    dataSource: "historical" | "synthetic_demo" | "insufficient_data"
    isDataDriven: boolean
  }> {
    const delayStats = await this.getHistoricalDelayStats(transportMode, routeId)

    if (!delayStats.isSufficientData || delayStats.delays.length === 0) {
      return {
        missProbabilityPercent: 0,
        simulatedTrialsCount: trialsCount,
        meanDelayMinutes: 0,
        stdDevMinutes: 0,
        sampleSize: 0,
        dataSource: "insufficient_data",
        isDataDriven: false,
      }
    }

    let missedCount = 0
    const N = delayStats.delays.length

    // Step 16 & 18: Empirical Resampling Monte Carlo Loop
    for (let t = 0; t < trialsCount; t++) {
      // Step 16: Randomly sample one historical delay from dataset
      const randomIdx = Math.floor(Math.random() * N)
      const sampledDelay = delayStats.delays[randomIdx]

      // Step 18: Compare sampled delay against scheduled transfer buffer
      if (sampledDelay > scheduledBufferMinutes) {
        missedCount++
      }
    }

    // Step 19: Missed connection probability calculation
    const missProbabilityPercent = Math.round((missedCount / trialsCount) * 100)

    return {
      missProbabilityPercent,
      simulatedTrialsCount: trialsCount,
      meanDelayMinutes: delayStats.meanDelayMinutes,
      stdDevMinutes: delayStats.standardDeviationMinutes,
      sampleSize: delayStats.sampleSize,
      dataSource: delayStats.dataSource,
      isDataDriven: true,
    }
  },

  /**
   * Step 20: Generates reproducible synthetic journey observations for demo seeding.
   */
  generateSyntheticJourneyObservations() {
    const items: Array<{
      transportMode: "metro" | "bus" | "auto" | "multimodal"
      predictedDurationMinutes: number
      actualDurationMinutes: number
      errorMinutes: number
      delayMinutes: number
      createdAt: Date
    }> = []

    // Seed 40 synthetic bus journeys (Mean delay 3.4m, SD 2.1m)
    for (let i = 0; i < 40; i++) {
      const predicted = 30 + (i % 5) * 4
      const noise = (Math.sin(i * 1.5) * 2.1) + 3.4
      const actual = Number(Math.max(10, predicted + noise).toFixed(2))
      const error = Number((actual - predicted).toFixed(2))
      const delay = Number(Math.max(0, error).toFixed(2))
      items.push({
        transportMode: "bus",
        predictedDurationMinutes: predicted,
        actualDurationMinutes: actual,
        errorMinutes: error,
        delayMinutes: delay,
        createdAt: new Date(Date.now() - (40 - i) * 3600 * 1000),
      })
    }

    // Seed 40 synthetic metro journeys (Mean delay 0.9m, SD 1.1m)
    for (let i = 0; i < 40; i++) {
      const predicted = 20 + (i % 4) * 3
      const noise = (Math.cos(i * 1.2) * 1.1) + 0.9
      const actual = Number(Math.max(10, predicted + noise).toFixed(2))
      const error = Number((actual - predicted).toFixed(2))
      const delay = Number(Math.max(0, error).toFixed(2))
      items.push({
        transportMode: "metro",
        predictedDurationMinutes: predicted,
        actualDurationMinutes: actual,
        errorMinutes: error,
        delayMinutes: delay,
        createdAt: new Date(Date.now() - (40 - i) * 3600 * 1000),
      })
    }

    return items
  },

  /**
   * Step 20: Seeds synthetic observations into MongoDB if database is connected and empty.
   */
  async seedDemoObservationsIfEmpty(): Promise<number> {
    if (mongoose.connection.readyState !== 1) return 0
    try {
      const count = await JourneyObservation.countDocuments()
      if (count > 0) return count

      const syntheticData = this.generateSyntheticJourneyObservations()
      const docs = syntheticData.map((d) => ({
        originName: "Demo Origin",
        destinationName: "Demo Destination",
        transportMode: d.transportMode,
        predictedDurationMinutes: d.predictedDurationMinutes,
        actualDurationMinutes: d.actualDurationMinutes,
        errorMinutes: d.errorMinutes,
        delayMinutes: d.delayMinutes,
        departureTime: d.createdAt,
        arrivalTime: new Date(d.createdAt.getTime() + d.actualDurationMinutes * 60 * 1000),
        isSyntheticDemoData: true,
      }))

      await JourneyObservation.insertMany(docs)
      console.log(`✅ Seeded ${docs.length} synthetic journey observations into MongoDB.`)
      return docs.length
    } catch (err) {
      console.warn("⚠️ Could not seed demo journey observations:", err)
      return 0
    }
  },

  formatClockTime(date: Date): string {
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12
    hours = hours ? hours : 12
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`
    return `${hours}:${minStr} ${ampm}`
  },
}


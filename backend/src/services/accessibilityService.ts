import mongoose from "mongoose"
import { Accessibility } from "../models/Accessibility"
import { AccessibilityReport } from "../models/AccessibilityReport"
import { DEMO_ACCESSIBILITY_DATA } from "../data/accessibilityData"
import { AppError } from "../middleware/errorHandler"
import type { AccessibilityProfile } from "../types"
import type {
  AccessibilityEvaluation,
  AccessibilityRecord,
  AccessibilityStatus,
  CheckedAccessibilityStation,
} from "../types/intelligence"
import type { MultimodalRoute } from "../types/multimodal"

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeRecord(record: AccessibilityRecord | { toObject(): unknown }): AccessibilityRecord {
  if ("toObject" in record) {
    const raw = record.toObject() as AccessibilityRecord & { lastVerified: Date }
    return { ...raw, lastVerified: new Date(raw.lastVerified).toISOString().slice(0, 10) }
  }
  return record
}

function matchRecordByName(name: string, records: AccessibilityRecord[]) {
  const normalized = name.toLowerCase()
  return records.find((r) => r.stationName.toLowerCase() === normalized)
}

function extractTransitStations(route: MultimodalRoute, records: AccessibilityRecord[]) {
  const stationMap = new Map<string, AccessibilityRecord>()
  for (const segment of route.segments) {
    if (segment.mode !== "metro" && segment.mode !== "bus") continue
    const from = matchRecordByName(segment.from.name, records)
    const to = matchRecordByName(segment.to.name, records)
    if (from) stationMap.set(from.stationId, from)
    if (to) stationMap.set(to.stationId, to)
  }
  return [...stationMap.values()]
}

// ── Accessibility Score Calculation (0–100, transparent) ────────────────────

/**
 * Calculates a transparent, interpretable accessibility score for a single station.
 *
 * Score breakdown (each factor contributes points):
 *   Step-free entrance:     15 points
 *   Step-free platform:     15 points
 *   Lift available:         15 points
 *   Ramp available:         10 points
 *   Escalator available:    10 points
 *   Tactile paving:         10 points
 *   Accessible toilet:       5 points
 *   Low stair count:        10 points (10 if 0 stairs, 5 if <10, 0 if >=10)
 *   Wheelchair accessible:  10 points
 *   Total possible:        100 points
 */
function calculateStationScore(record: AccessibilityRecord): number {
  let score = 0

  if (record.stepFreeEntrance === true) score += 15
  else if (record.stepFreeEntrance === null) score += 7 // unknown = partial credit

  if (record.stepFreePlatform === true) score += 15
  else if (record.stepFreePlatform === null) score += 7

  if (record.hasLift === true) score += 15
  else if (record.hasLift === null) score += 7

  if (record.hasRamp === true) score += 10
  else if (record.hasRamp === null) score += 5

  if (record.hasEscalator === true) score += 10
  else if (record.hasEscalator === null) score += 5

  if (record.tactilePaving === true) score += 10
  else if (record.tactilePaving === null) score += 5

  if (record.accessibleToilet === true) score += 5
  else if (record.accessibleToilet === null) score += 2

  const stairs = record.stairCount ?? 0
  if (stairs === 0) score += 10
  else if (stairs < 10) score += 5

  if (record.wheelchairAccessible === true) score += 10
  else if (record.wheelchairAccessible === null) score += 5

  return Math.min(100, score)
}

/**
 * Calculates a profile-specific accessibility/suitability score (0-100) for a route.
 * Takes into account station features (lift, ramp, step-free, stairs), walking distance,
 * transfer count, crowd levels, and physical effort according to the selected profile.
 */
function calculateProfileAccessibilityScore(
  route: MultimodalRoute,
  stations: AccessibilityRecord[],
  profile: AccessibilityEvaluation["profile"],
): number {
  const stationScores = stations.map((s) => calculateStationScore(s))
  const avgStationScore = stationScores.length > 0
    ? stationScores.reduce((a, b) => a + b, 0) / stationScores.length
    : 70

  const totalStairs = stations.reduce((sum, s) => sum + (s.stairCount ?? 0), 0)
  const walkingMeters = route.totalWalkingMeters
  const transfers = route.transferCount

  let score = 50

  if (profile === "wheelchair") {
    score = avgStationScore
    if (totalStairs === 0) score += 10
    if (walkingMeters < 500) score += 10
    else if (walkingMeters > 700) score -= 15
    if (transfers === 0) score += 10
    else if (transfers >= 2) score -= 15
  } else if (profile === "senior") {
    score = 60
    if (totalStairs === 0) score += 25
    else if (totalStairs <= 10) score += 10
    else if (totalStairs > 20) score -= 25

    if (walkingMeters < 400) score += 25
    else if (walkingMeters <= 700) score += 10
    else if (walkingMeters > 1000) score -= 30

    if (transfers === 0) score += 20
    else if (transfers === 1) score += 10
    else if (transfers >= 2) score -= 25

    if (stations.length > 0 && stations.every((s) => s.hasLift === true || s.hasEscalator === true || (s.stairCount ?? 0) === 0)) {
      score += 15
    }
  } else if (profile === "pregnant") {
    score = 60
    if (walkingMeters < 400) score += 30
    else if (walkingMeters <= 700) score += 15
    else if (walkingMeters > 1000) score -= 35

    if (transfers === 0) score += 25
    else if (transfers === 1) score += 10
    else if (transfers >= 2) score -= 30

    if (totalStairs === 0) score += 20
    else if (totalStairs > 15) score -= 25

    if (stations.length > 0 && stations.every((s) => s.hasLift === true || s.hasEscalator === true)) {
      score += 15
    }
  } else if (profile === "luggage") {
    score = 60
    if (totalStairs === 0) score += 30
    // Problem 5 fix — >20 must be checked before >10, otherwise the >10 branch
    // always fires first and >20 can never be reached.
    else if (totalStairs > 20) score -= 40
    else if (totalStairs > 10) score -= 25

    if (stations.length > 0 && stations.every((s) => s.hasLift === true || s.hasEscalator === true || (s.stairCount ?? 0) === 0)) {
      score += 25
    }

    if (transfers === 0) score += 20
    else if (transfers === 1) score += 10
    else if (transfers >= 2) score -= 25

    if (walkingMeters < 400) score += 15
    else if (walkingMeters > 700) score -= 20
  } else if (profile === "reduced_mobility") {
    score = 60
    if (stations.length > 0 && stations.every((s) => s.stepFreeEntrance === true || s.hasLift === true || s.hasRamp === true)) {
      score += 25
    }
    if (totalStairs === 0) score += 20
    else if (totalStairs > 10) score -= 25

    if (walkingMeters < 400) score += 20
    else if (walkingMeters > 700) score -= 25

    if (transfers === 0) score += 15
    else if (transfers >= 2) score -= 20
  } else if (profile === "stroller") {
    score = 60
    if (stations.length > 0 && stations.every((s) => s.hasLift === true || s.hasRamp === true || s.stepFreeEntrance === true)) {
      score += 30
    }
    if (totalStairs === 0) score += 20
    else if (totalStairs > 10) score -= 25

    if (walkingMeters < 500) score += 15
    else if (walkingMeters > 800) score -= 25

    if (transfers === 0) score += 15
    else if (transfers >= 2) score -= 20
  } else {
    score = avgStationScore
  }

  return Math.round(Math.max(0, Math.min(100, score)))
}

// ── Station-Level Warnings ──────────────────────────────────────────────────

function stationWarnings(record: AccessibilityRecord, profile: AccessibilityEvaluation["profile"]): string[] {
  const warnings: string[] = []

  // Data-source warning
  if (record.verificationSource === "synthetic_demo" || record.verificationSource === "Demo Accessibility Dataset") {
    warnings.push("Accessibility data is from the synthetic demo dataset.")
  }

  // Universal warnings
  if (record.status === "unknown") warnings.push("Accessibility information is incomplete for this station.")
  if (record.status === "not_accessible") warnings.push(`${record.stationName} is marked not accessible.`)
  if (record.hasLift === false) warnings.push("Lift is unavailable.")
  if (record.hasRamp === false) warnings.push("Ramp is unavailable.")
  if (record.stepFreeEntrance === false) warnings.push("Step-free entrance is unavailable.")
  if (record.stepFreePlatform === false) warnings.push("Step-free platform is unavailable.")

  const stairs = record.stairCount ?? 0
  if (stairs > 0) warnings.push(`Contains approximately ${stairs} stairs.`)

  // Profile-specific warnings
  if (profile === "wheelchair") {
    if (record.wheelchairAccessible === false) warnings.push("Station is not wheelchair accessible.")
    if (record.hasLift === null) warnings.push("Lift availability unverified — wheelchair users should confirm before travel.")
  }

  if (profile === "stroller") {
    if (record.hasLift === false && record.hasRamp === false) warnings.push("No lift or ramp — stroller access may be difficult.")
    if (stairs > 10) warnings.push("Significant stair count may be difficult with a stroller.")
  }

  if (profile === "senior") {
    if (stairs > 20) warnings.push("High stair count may be difficult for senior travellers.")
    if (record.hasEscalator === false && stairs > 10) warnings.push("No escalator available with a significant stair count.")
  }

  if (profile === "pregnant") {
    if (stairs > 10) warnings.push("This station involves stair effort that may be avoidable.")
    if (record.hasLift === false && stairs > 5) warnings.push("No lift available — consider alternatives if stairs are a concern.")
  }

  if (profile === "luggage") {
    if (stairs > 10) warnings.push("Stairs may be inconvenient with heavy luggage.")
    if (record.hasLift === false && record.hasEscalator === false) warnings.push("No lift or escalator — heavy luggage may be difficult.")
  }

  if (profile === "reduced_mobility") {
    if (record.stepFreeEntrance === false) warnings.push("Step-free entrance unavailable — may require assistance.")
    if (record.hasLift === false && stairs > 5) warnings.push("No lift with stair access required.")
  }

  return warnings
}

// ── Hard Constraint Logic (route rejection) ─────────────────────────────────

/**
 * Determines if a station BLOCKS a route for the given profile.
 *
 * Hard constraints = route is REJECTED (not just ranked lower).
 * Returns a rejection reason string if blocked, null otherwise.
 */
function getBlockReason(record: AccessibilityRecord, profile: AccessibilityEvaluation["profile"]): string | null {
  // Standard/fastest/cheapest/comfort profiles are never hard-blocked
  if (profile === "standard" || profile === "fastest" || profile === "cheapest" || profile === "comfort") return null

  // Wheelchair — strictest hard constraints
  if (profile === "wheelchair") {
    if (record.status === "not_accessible") {
      return `${record.stationName} is marked not accessible.`
    }
    if (record.wheelchairAccessible === false) {
      return `${record.stationName} is explicitly not wheelchair accessible.`
    }
    // Requires step-free access: if entrance or platform is explicitly false AND no lift/ramp
    if (record.stepFreeEntrance === false && record.hasLift === false && record.hasRamp === false) {
      return `${record.stationName} requires stairs and has no step-free alternative (no lift, no ramp).`
    }
    if (record.hasLift === false && record.hasRamp === false && (record.stairCount ?? 0) > 0) {
      return `${record.stationName} has ${record.stairCount} stairs with no lift or ramp available.`
    }
    return null
  }

  // Stroller — hard block only when station is explicitly not_accessible or has impossible stairs
  if (profile === "stroller") {
    if (record.status === "not_accessible") {
      return `${record.stationName} is marked not accessible.`
    }
    if (record.hasLift === false && record.hasRamp === false && (record.stairCount ?? 0) > 20) {
      return `${record.stationName} has ${record.stairCount} stairs with no lift or ramp — impractical with a stroller.`
    }
    return null
  }

  // Senior — hard block only when genuinely impossible
  if (profile === "senior") {
    if (record.status === "not_accessible" && (record.stairCount ?? 0) > 35) {
      return `${record.stationName} has ${record.stairCount} stairs and is marked not accessible.`
    }
    return null
  }

  // Pregnant — hard block only for extreme inaccessibility
  if (profile === "pregnant") {
    if (record.status === "not_accessible" && (record.stairCount ?? 0) > 35) {
      return `${record.stationName} has ${record.stairCount} stairs and is marked not accessible.`
    }
    return null
  }

  // Luggage — hard block only for extreme cases
  if (profile === "luggage") {
    if (record.status === "not_accessible" && (record.stairCount ?? 0) > 35) {
      return `${record.stationName} has ${record.stairCount} stairs and is not accessible.`
    }
    return null
  }

  // Reduced mobility — hard block when step-free is impossible
  if (profile === "reduced_mobility") {
    if (record.status === "not_accessible") {
      return `${record.stationName} is marked not accessible.`
    }
    if (record.stepFreeEntrance === false && record.hasLift === false && record.hasRamp === false && (record.stairCount ?? 0) > 15) {
      return `${record.stationName} requires ${record.stairCount} stairs with no step-free alternative.`
    }
    return null
  }

  return null
}

// ── Walking Distance Warnings ───────────────────────────────────────────────

function walkingWarnings(route: MultimodalRoute, profile: AccessibilityEvaluation["profile"]) {
  const warnings: string[] = []
  const walkingMeters = route.totalWalkingMeters
  if ((profile === "senior" || profile === "pregnant" || profile === "luggage") && walkingMeters > 1000) {
    warnings.push(`This route has ${Math.round(walkingMeters)}m of walking (over 1 km).`)
  }
  if ((profile === "wheelchair" || profile === "stroller" || profile === "reduced_mobility") && walkingMeters > 700) {
    warnings.push(`This route has ${Math.round(walkingMeters)}m of walking/rolling distance.`)
  }
  return warnings
}

// ── Combined Status ─────────────────────────────────────────────────────────

function combineStatus(stations: CheckedAccessibilityStation[], blocked: boolean): AccessibilityStatus {
  if (stations.length === 0) return "unknown"
  if (blocked) return "not_accessible"
  if (stations.some((s) => s.status === "unknown")) return "unknown"
  if (stations.some((s) => s.status === "partially_accessible")) return "partially_accessible"
  if (stations.some((s) => s.status === "not_accessible")) return "not_accessible"
  return "accessible"
}

// ── Determine data source from records ──────────────────────────────────────

function determineDataSource(records: AccessibilityRecord[]): AccessibilityEvaluation["dataSource"] {
  if (records.length === 0) return "synthetic_demo"
  const sources = new Set(records.map((r) => r.verificationSource))
  if (sources.size === 1) {
    const src = [...sources][0]
    if (src === "synthetic_demo" || src === "Demo Accessibility Dataset") return "synthetic_demo"
    if (src === "field_survey" || src === "Surveyed Dataset") return "field_survey"
    if (src === "community_report" || src === "User Report") return "community_report"
    if (src === "transit_authority") return "transit_authority"
    if (src === "external_dataset") return "external_dataset"
  }
  return "mixed"
}

// ── Main Service ────────────────────────────────────────────────────────────

export const accessibilityService = {
  async listStations(): Promise<AccessibilityRecord[]> {
    if (mongoose.connection.readyState === 1) {
      const stored = await Accessibility.find().sort({ stationName: 1 })
      if (stored.length > 0) return stored.map(normalizeRecord)
    }
    return DEMO_ACCESSIBILITY_DATA
  },

  async getStation(stationId: string): Promise<AccessibilityRecord | null> {
    if (mongoose.connection.readyState === 1) {
      const stored = await Accessibility.findOne({ stationId })
      if (stored) return normalizeRecord(stored)
    }
    return DEMO_ACCESSIBILITY_DATA.find((s) => s.stationId === stationId) ?? null
  },

  /**
   * Evaluates the accessibility of an entire route for the given profile.
   * Checks EVERY transit station/segment, calculates score, applies hard constraints.
   */
  async evaluateRoute(route: MultimodalRoute, profile: AccessibilityProfile | "fastest" | "cheapest" | "comfort"): Promise<AccessibilityEvaluation> {
    const records = await this.listStations()
    const stations = extractTransitStations(route, records)

    let firstBlockReason: string | null = null
    const checkedStations = stations.map<CheckedAccessibilityStation>((record) => {
      const blockReason = getBlockReason(record, profile)
      if (blockReason && !firstBlockReason) firstBlockReason = blockReason
      return {
        stationId: record.stationId,
        stationName: record.stationName,
        status: record.status,
        warnings: stationWarnings(record, profile),
      }
    })

    const blocked = firstBlockReason !== null
    const warnings = [...checkedStations.flatMap((s) => s.warnings), ...walkingWarnings(route, profile)]
    const status = combineStatus(checkedStations, blocked)

    // Calculate route-level profile-specific accessibility score
    const profileScore = calculateProfileAccessibilityScore(route, stations, profile)
    const accessibilityScore = blocked ? 0 : profileScore

    const dataSource = determineDataSource(stations)

    return {
      profile,
      status,
      blocked,
      summary: blocked
        ? `Route excluded: ${firstBlockReason}`
        : status === "accessible"
          ? "All stations accessible according to the current dataset."
          : status === "unknown"
            ? "Accessibility information is incomplete for some stations."
            : "Partially accessible; review warnings before travel.",
      warnings,
      checkedStations,
      accessibilityScore,
      rejectionReason: firstBlockReason,
      dataSource,
    }
  },

  /**
   * Filters routes by hard accessibility constraints, keeping only feasible routes.
   * Blocked routes are NOT silently removed — the evaluation contains the rejection reason.
   */
  async filterRoutes<T extends MultimodalRoute>(routes: T[], profile: AccessibilityProfile | "fastest" | "cheapest" | "comfort") {
    const enriched = await Promise.all(routes.map(async (route) => ({ route, evaluation: await this.evaluateRoute(route, profile) })))
    return enriched
      .filter(({ evaluation }) => !evaluation.blocked)
      .map(({ route, evaluation }) => ({ ...route, accessibility: evaluation }))
  },

  /**
   * Submits a community accessibility report for a station.
   */
  async reportIssue(
    userId: string,
    input: { stationId: string; stationName: string; issueType: string; description: string },
  ) {
    if (mongoose.connection.readyState !== 1) {
      throw new AppError("Database is not connected. Configure MONGODB_URI to submit reports.", 503)
    }
    return AccessibilityReport.create({
      userId,
      stationId: input.stationId,
      stationName: input.stationName,
      issueType: input.issueType,
      description: input.description,
      status: "pending",
    })
  },

  /**
   * Lists recent community reports for a station.
   */
  async getReportsForStation(stationId: string) {
    if (mongoose.connection.readyState !== 1) return []
    return AccessibilityReport.find({ stationId }).sort({ createdAt: -1 }).limit(20)
  },

  /**
   * Seeds synthetic demo accessibility records into MongoDB if the collection is empty.
   * Uses upsert to avoid duplicate records on repeated execution.
   */
  async seedDemoAccessibilityIfEmpty(): Promise<number> {
    if (mongoose.connection.readyState !== 1) return 0
    try {
      const count = await Accessibility.countDocuments()
      if (count > 0) return count

      for (const record of DEMO_ACCESSIBILITY_DATA) {
        await Accessibility.updateOne(
          { stationId: record.stationId },
          {
            $setOnInsert: {
              stationId: record.stationId,
              stationName: record.stationName,
              transportMode: record.transportMode,
              latitude: record.latitude,
              longitude: record.longitude,
              hasLift: record.hasLift,
              hasRamp: record.hasRamp,
              hasEscalator: record.hasEscalator,
              stairCount: record.stairCount,
              tactilePaving: record.tactilePaving,
              accessibleToilet: record.accessibleToilet,
              wheelchairAccessible: record.wheelchairAccessible,
              stepFreeEntrance: record.stepFreeEntrance,
              stepFreePlatform: record.stepFreePlatform,
              lastVerified: new Date(record.lastVerified),
              verificationSource: record.verificationSource,
              status: record.status,
              notes: record.notes,
            },
          },
          { upsert: true },
        )
      }

      console.log(`✅ Seeded ${DEMO_ACCESSIBILITY_DATA.length} synthetic accessibility records into MongoDB.`)
      return DEMO_ACCESSIBILITY_DATA.length
    } catch (err) {
      console.warn("⚠️ Could not seed accessibility data:", err)
      return 0
    }
  },
}

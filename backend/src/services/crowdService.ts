import mongoose from "mongoose"
import { CrowdReport } from "../models/CrowdReport"
import { DEMO_CROWD_DATA, busRouteCrowdLevel, type DemoCrowdRecord } from "../data/crowdData"
import { METRO_STATIONS, BUS_STOPS, BUS_ROUTES } from "../data/transitData"
import { AppError } from "../middleware/errorHandler"
import type { CrowdLevel, CrowdStationEstimate, LegCrowd, RouteCrowdSummary } from "../types/intelligence"
import type { MultimodalRoute, RouteSegment } from "../types/multimodal"

const LEVEL_SCORE: Record<CrowdLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 }
const SCORE_LEVEL: Record<number, CrowdLevel> = { 1: "LOW", 2: "MEDIUM", 3: "HIGH" }

function currentDayType(date = new Date()): "weekday" | "weekend" {
  const day = date.getDay()
  return day === 0 || day === 6 ? "weekend" : "weekday"
}

// Completion-phase 2 fix (B4). The old code mapped the clock onto four fixed
// slots (08:00/14:00/18:00/20:00) and, when the station had no record for that
// exact slot, silently fell back to the station's FIRST record at ANY hour.
// Two consequences, both confirmed live: the 09:00 and 12:00 records could
// never be matched directly, and every station reported its peak-hour reading
// around the clock (MG Road "HIGH" at 9:36 pm because of its 08:00 record) —
// which then hard-blocked wheelchair/senior/pregnant/stroller/luggage routes at
// night. Each station only has one or two spot readings, so the honest rule is:
// use the station's reading nearest in time on the same day type, but only if it
// lies within SLOT_WINDOW_MINUTES of the time being asked about; otherwise there
// is simply no historical crowd data for that time ("UNAVAILABLE"), and an
// unavailable reading never blocks a route.
export const SLOT_WINDOW_MINUTES = 120

const MINUTES_PER_DAY = 24 * 60

function slotMinutes(slot: string): number {
  const [hours, minutes] = slot.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

// Distance between two times of day, wrapping past midnight (23:30 is 1 h from 00:30).
export function circularGapMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b) % MINUTES_PER_DAY
  return Math.min(diff, MINUTES_PER_DAY - diff)
}

// User crowd reports describe conditions in the last 90 minutes, so they only
// say something about a trip that happens around now — not one planned for
// tomorrow morning, where only the historical baseline is meaningful.
const RECENT_REPORT_WINDOW_MS = 90 * 60 * 1000

function reportsApplyTo(when: Date): boolean {
  return Math.abs(when.getTime() - Date.now()) <= RECENT_REPORT_WINDOW_MS
}

// Index of the built-in hourly table by station + day type, so a lookup does not scan
// every record (the table has one record per station, day type and hour).
const DEMO_INDEX = new Map<string, DemoCrowdRecord[]>()
for (const record of DEMO_CROWD_DATA) {
  const key = `${record.stationId}|${record.dayType}`
  const list = DEMO_INDEX.get(key)
  if (list) list.push(record)
  else DEMO_INDEX.set(key, [record])
}

/**
 * The reading for a station at a time: the station's reading nearest in time on the same
 * day type, accepted only within SLOT_WINDOW_MINUTES. With the full hourly table every
 * station in the network always has one; a station with no records at all (or a custom,
 * sparse `records` set — the window rule was written for those) gets undefined.
 */
export function findDemoCrowdRecord(
  stationId: string,
  when = new Date(),
  records: DemoCrowdRecord[] = DEMO_CROWD_DATA,
): DemoCrowdRecord | undefined {
  const dayType = currentDayType(when)
  const nowMinutes = when.getHours() * 60 + when.getMinutes()
  const candidates = records === DEMO_CROWD_DATA ? (DEMO_INDEX.get(`${stationId}|${dayType}`) ?? []) : records
  let best: DemoCrowdRecord | undefined
  let bestGap = Infinity
  for (const record of candidates) {
    if (record.stationId !== stationId || record.dayType !== dayType) continue
    const gap = circularGapMinutes(nowMinutes, slotMinutes(record.timeSlot))
    if (gap < bestGap) {
      best = record
      bestGap = gap
    }
  }
  return bestGap <= SLOT_WINDOW_MINUTES ? best : undefined
}

/**
 * Every metro station and bus stop in the demo transit dataset has a real, stable ID
 * (e.g. "m1-04", "b-05") regardless of whether it also has crowd history — resolving
 * through the full transit dataset instead of just DEMO_CROWD_DATA means a station never
 * falls back to using its display name as an ID just because it lacks crowd records yet.
 */
function resolveStationId(name: string): string | undefined {
  const normalized = name.toLowerCase()
  return (
    METRO_STATIONS.find((s) => s.name.toLowerCase() === normalized)?.id ??
    BUS_STOPS.find((s) => s.name.toLowerCase() === normalized)?.id
  )
}

function maxLevel(levels: Array<CrowdLevel | undefined>): CrowdLevel | undefined {
  let best: CrowdLevel | undefined
  for (const level of levels) {
    if (level && (!best || LEVEL_SCORE[level] > LEVEL_SCORE[best])) best = level
  }
  return best
}

/**
 * Maps the 70/30 blend of recent reports and the historical baseline (a score from 1 to 3) to a
 * level. Plain rounding put the cut-offs at 1.5 and 2.5, which meant reports could never move
 * a station more than one step away from its baseline when the baseline is at an extreme:
 * two HIGH reports over a LOW baseline blend to 2.4 and rounded to MEDIUM. With a full hourly
 * baseline that case is common, so the cut-offs are 1.6 and 2.4: unanimous reports always win,
 * while mixed reports still pull the result only part of the way.
 */
export function blendedLevel(score: number): CrowdLevel {
  const EPS = 1e-9
  if (score <= 1.6 + EPS) return "LOW"
  if (score >= 2.4 - EPS) return "HIGH"
  return "MEDIUM"
}

function estimateLevel(levels: CrowdLevel[]) {
  if (levels.length === 0) return undefined
  const avg = levels.reduce((sum, level) => sum + LEVEL_SCORE[level], 0) / levels.length
  return SCORE_LEVEL[Math.round(avg)]
}

/**
 * Phase 11 (P8) — the actual rule-based fusion logic from stationEstimate(),
 * pulled out so it can be run against ALREADY-FETCHED report data. Pure/no
 * DB access, so routeSummary() below can batch one query for every station
 * on a route and call this per station, instead of stationEstimate() issuing
 * its own CrowdReport.find() for each one (the N+1 pattern named in
 * PROJECT_MASTER_PLAN.md §26 P8).
 */
function buildEstimate(
  stationId: string,
  stationName: string | undefined,
  recentLevels: CrowdLevel[],
  recentStationName: string | undefined,
  when: Date,
): CrowdStationEstimate {
  const demo = findDemoCrowdRecord(stationId, when)

  // A station with historical records, none near this time, still has a known name.
  const resolvedName =
    recentStationName ??
    demo?.stationName ??
    stationName ??
    DEMO_CROWD_DATA.find((r) => r.stationId === stationId)?.stationName ??
    stationId

  if (recentLevels.length > 0 && demo) {
    // Rule-based fusion, not machine learning: recent reports get 70% weight, the demo
    // historical baseline gets 30%, so a handful of live reports can override a stale
    // demo pattern while still smoothing out a single noisy report.
    const RECENT_WEIGHT = 0.7
    const DEMO_WEIGHT = 0.3
    const recentAvgScore = recentLevels.reduce((sum, level) => sum + LEVEL_SCORE[level], 0) / recentLevels.length
    const blendedScore = recentAvgScore * RECENT_WEIGHT + LEVEL_SCORE[demo.crowdLevel] * DEMO_WEIGHT
    const level = blendedLevel(blendedScore)
    return {
      stationId,
      stationName: resolvedName,
      crowdLevel: level,
      source: "RECENT_USER_REPORT",
      confidence: Math.min(0.95, 0.7 + recentLevels.length * 0.05),
      summary: `Rule-based estimate blending ${recentLevels.length} recent user report${recentLevels.length === 1 ? "" : "s"} (70% weight) with historical demonstration data (30% weight).`,
    }
  }

  if (recentLevels.length > 0) {
    const level = estimateLevel(recentLevels)
    return {
      stationId,
      stationName: resolvedName,
      crowdLevel: level,
      source: "RECENT_USER_REPORT",
      confidence: Math.min(0.95, 0.65 + recentLevels.length * 0.06),
      summary: `Based on ${recentLevels.length} recent authenticated user report${recentLevels.length === 1 ? "" : "s"}.`,
    }
  }

  if (demo) {
    return {
      stationId,
      stationName: resolvedName,
      crowdLevel: demo.crowdLevel,
      source: "DEMO_DATA",
      confidence: 0.45,
      summary: "Based on historical demonstration crowd data — no recent user reports for this station.",
    }
  }

  const hasRecordsAtOtherTimes = DEMO_CROWD_DATA.some((r) => r.stationId === stationId)
  return {
    stationId,
    stationName: resolvedName,
    source: "UNAVAILABLE",
    confidence: 0,
    summary: hasRecordsAtOtherTimes
      ? `Crowd information unavailable — no recent reports, and the historical demonstration data for this station does not cover this time of day (nearest reading must be within ${SLOT_WINDOW_MINUTES / 60} hours on the same day type).`
      : "Crowd information unavailable — no recent reports or historical demo data for this station.",
  }
}

export const crowdService = {
  async reportCrowd(
    userId: string,
    input: { stationId: string; stationName: string; transportMode: "metro" | "bus"; crowdLevel: CrowdLevel },
  ) {
    if (mongoose.connection.readyState !== 1) {
      throw new AppError("Database is not connected. Configure MONGODB_URI to submit crowd reports.", 503)
    }
    return CrowdReport.create({
      userId,
      stationId: input.stationId,
      stationName: input.stationName,
      transportMode: input.transportMode,
      crowdLevel: input.crowdLevel,
      reportedAt: new Date(),
      source: "RECENT_USER_REPORT",
      confidence: 0.8,
      status: "accepted",
    })
  },

  // `when` is the time the rider will actually be at the station (a chosen
  // departure time, or now) — the historical demo baseline is matched to it.
  async stationEstimate(stationId: string, stationName?: string, when = new Date()): Promise<CrowdStationEstimate> {
    // Recent authenticated user reports (last 90 minutes), weighted heavily since they
    // reflect current conditions.
    let recentLevels: CrowdLevel[] = []
    let recentStationName: string | undefined
    if (mongoose.connection.readyState === 1 && reportsApplyTo(when)) {
      const since = new Date(Date.now() - RECENT_REPORT_WINDOW_MS)
      const recent = await CrowdReport.find({
        $or: [{ stationId }, { stationName: stationName ?? stationId }],
        reportedAt: { $gte: since },
        status: "accepted",
      }).sort({ reportedAt: -1 }).limit(5)
      recentLevels = recent.map((r) => r.crowdLevel)
      recentStationName = recent[0]?.stationName
    }

    return buildEstimate(stationId, stationName, recentLevels, recentStationName, when)
  },

  async stationHistory(stationId: string) {
    const recent = mongoose.connection.readyState === 1
      ? await CrowdReport.find({ stationId }).sort({ reportedAt: -1 }).limit(30)
      : []
    const demo = DEMO_CROWD_DATA.filter((r) => r.stationId === stationId)
    return { recent, demo }
  },

  /**
   * Crowd for a whole route, worked out leg by leg. Each metro and bus leg is checked where the
   * rider boards and where they get off, at the time they will actually be there (the departure
   * time plus the time spent on the earlier legs), and a bus leg also takes the crowd on board
   * that bus route at that hour. A leg's crowd is its worst point; the route's crowd is its most
   * crowded leg — one packed station is not averaged away by quiet ones. A route with no metro or
   * bus leg (walk/auto only) has no transit crowd at all.
   */
  async routeSummary(route: MultimodalRoute, when = new Date()): Promise<RouteCrowdSummary> {
    interface Visit { name: string; stationId: string; time: Date }
    interface RawLeg { segment: RouteSegment; board: Visit; alight: Visit }

    const rawLegs: RawLeg[] = []
    let elapsedSeconds = 0
    for (const segment of route.segments) {
      const start = new Date(when.getTime() + elapsedSeconds * 1000)
      elapsedSeconds += segment.durationSeconds
      const end = new Date(when.getTime() + elapsedSeconds * 1000)
      if (segment.mode !== "metro" && segment.mode !== "bus") continue
      const idOf = (name: string) =>
        resolveStationId(name) ?? DEMO_CROWD_DATA.find((r) => r.stationName === name)?.stationId ?? name
      rawLegs.push({
        segment,
        board: { name: segment.from.name, stationId: idOf(segment.from.name), time: start },
        alight: { name: segment.to.name, stationId: idOf(segment.to.name), time: end },
      })
    }

    if (rawLegs.length === 0) {
      return {
        level: "LOW",
        source: "NOT_APPLICABLE",
        summary: "No metro or bus leg on this route, so there is no transit crowding to worry about.",
        stations: [],
        legs: [],
      }
    }

    // One CrowdReport query covering every stop on the route (not one per stop), evaluated
    // in memory per stop — and only if some visit is close enough to "now" for reports to matter.
    const visits = rawLegs.flatMap((leg) => [leg.board, leg.alight])
    const reports: Array<{ stationId: string; stationName: string; crowdLevel: CrowdLevel }> = []
    if (mongoose.connection.readyState === 1 && visits.some((v) => reportsApplyTo(v.time))) {
      const since = new Date(Date.now() - RECENT_REPORT_WINDOW_MS)
      const found = await CrowdReport.find({
        $or: [{ stationId: { $in: visits.map((v) => v.stationId) } }, { stationName: { $in: visits.map((v) => v.name) } }],
        reportedAt: { $gte: since },
        status: "accepted",
      }).sort({ reportedAt: -1 })
      for (const r of found) reports.push({ stationId: r.stationId, stationName: r.stationName, crowdLevel: r.crowdLevel })
    }

    const estimateVisit = (visit: Visit): CrowdStationEstimate => {
      const matches = reportsApplyTo(visit.time)
        ? reports.filter((r) => r.stationId === visit.stationId || r.stationName === visit.name).slice(0, 5)
        : []
      return buildEstimate(visit.stationId, visit.name, matches.map((m) => m.crowdLevel), matches[0]?.stationName, visit.time)
    }

    const stations: CrowdStationEstimate[] = []
    const legs: LegCrowd[] = rawLegs.map(({ segment, board, alight }) => {
      const boardEstimate = estimateVisit(board)
      const alightEstimate = estimateVisit(alight)
      for (const estimate of [boardEstimate, alightEstimate]) {
        if (!stations.some((s) => s.stationId === estimate.stationId)) stations.push(estimate)
      }

      let onboardLevel: CrowdLevel | undefined
      let label = segment.transitDetails?.lineName ?? "Metro"
      if (segment.mode === "bus") {
        const number = segment.transitDetails?.routeNumber
        label = number ? `Bus ${number}` : "Bus"
        const busRoute = BUS_ROUTES.find((r) => r.number === number)
        if (busRoute) onboardLevel = busRouteCrowdLevel(busRoute.id, currentDayType(board.time), board.time.getHours())
      }

      const level = maxLevel([boardEstimate.crowdLevel, alightEstimate.crowdLevel, onboardLevel])
      const source: LegCrowd["source"] = [boardEstimate, alightEstimate].some((e) => e.source === "RECENT_USER_REPORT")
        ? "RECENT_USER_REPORT"
        : level ? "DEMO_DATA" : "UNAVAILABLE"
      return {
        segmentId: segment.id,
        mode: segment.mode as "metro" | "bus",
        label,
        from: segment.from.name,
        to: segment.to.name,
        level,
        source,
        boardLevel: boardEstimate.crowdLevel,
        alightLevel: alightEstimate.crowdLevel,
        onboardLevel,
      }
    })

    const level = maxLevel(legs.map((leg) => leg.level))
    const worst = level ? legs.find((leg) => leg.level === level) : undefined
    const source = legs.some((leg) => leg.source === "RECENT_USER_REPORT")
      ? "RECENT_USER_REPORT"
      : legs.some((leg) => leg.source === "DEMO_DATA")
        ? "DEMO_DATA"
        : "UNAVAILABLE"
    return {
      level,
      source,
      summary: level && worst
        ? `${level} crowd on the most crowded leg (${worst.label}: ${worst.from} → ${worst.to}).`
        : "Crowd information unavailable.",
      stations,
      legs,
    }
  },
}

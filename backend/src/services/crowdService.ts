import mongoose from "mongoose"
import { CrowdReport } from "../models/CrowdReport"
import { DEMO_CROWD_DATA } from "../data/crowdData"
import { METRO_STATIONS, BUS_STOPS } from "../data/transitData"
import { AppError } from "../middleware/errorHandler"
import type { CrowdLevel, CrowdStationEstimate, RouteCrowdSummary } from "../types/intelligence"
import type { MultimodalRoute } from "../types/multimodal"

const LEVEL_SCORE: Record<CrowdLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 }
const SCORE_LEVEL: Record<number, CrowdLevel> = { 1: "LOW", 2: "MEDIUM", 3: "HIGH" }

function currentDayType(date = new Date()): "weekday" | "weekend" {
  const day = date.getDay()
  return day === 0 || day === 6 ? "weekend" : "weekday"
}

function nearestSlot(date = new Date()) {
  const hour = date.getHours()
  if (hour < 10) return "08:00"
  if (hour < 16) return "14:00"
  if (hour < 22) return "18:00"
  return "20:00"
}

function routeStationNames(route: MultimodalRoute) {
  const names = new Set<string>()
  for (const segment of route.segments) {
    if (segment.mode === "metro" || segment.mode === "bus") {
      names.add(segment.from.name)
      names.add(segment.to.name)
    }
  }
  return [...names]
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
): CrowdStationEstimate {
  const slot = nearestSlot()
  const demo = DEMO_CROWD_DATA.find(
    (r) => r.stationId === stationId && r.dayType === currentDayType() && r.timeSlot === slot,
  ) ?? DEMO_CROWD_DATA.find((r) => r.stationId === stationId)

  const resolvedName = recentStationName ?? demo?.stationName ?? stationName ?? stationId

  if (recentLevels.length > 0 && demo) {
    // Rule-based fusion, not machine learning: recent reports get 70% weight, the demo
    // historical baseline gets 30%, so a handful of live reports can override a stale
    // demo pattern while still smoothing out a single noisy report.
    const RECENT_WEIGHT = 0.7
    const DEMO_WEIGHT = 0.3
    const recentAvgScore = recentLevels.reduce((sum, level) => sum + LEVEL_SCORE[level], 0) / recentLevels.length
    const blendedScore = recentAvgScore * RECENT_WEIGHT + LEVEL_SCORE[demo.crowdLevel] * DEMO_WEIGHT
    const level = SCORE_LEVEL[Math.round(blendedScore)]
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

  return {
    stationId,
    stationName: resolvedName,
    source: "UNAVAILABLE",
    confidence: 0,
    summary: "Crowd information unavailable — no recent reports or historical demo data for this station.",
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

  async stationEstimate(stationId: string, stationName?: string): Promise<CrowdStationEstimate> {
    // Recent authenticated user reports (last 90 minutes), weighted heavily since they
    // reflect current conditions.
    let recentLevels: CrowdLevel[] = []
    let recentStationName: string | undefined
    if (mongoose.connection.readyState === 1) {
      const since = new Date(Date.now() - 90 * 60 * 1000)
      const recent = await CrowdReport.find({
        $or: [{ stationId }, { stationName: stationName ?? stationId }],
        reportedAt: { $gte: since },
        status: "accepted",
      }).sort({ reportedAt: -1 }).limit(5)
      recentLevels = recent.map((r) => r.crowdLevel)
      recentStationName = recent[0]?.stationName
    }

    return buildEstimate(stationId, stationName, recentLevels, recentStationName)
  },

  async stationHistory(stationId: string) {
    const recent = mongoose.connection.readyState === 1
      ? await CrowdReport.find({ stationId }).sort({ reportedAt: -1 }).limit(30)
      : []
    const demo = DEMO_CROWD_DATA.filter((r) => r.stationId === stationId)
    return { recent, demo }
  },

  async routeSummary(route: MultimodalRoute): Promise<RouteCrowdSummary> {
    const names = routeStationNames(route)
    const resolved = names.map((name) => ({
      name,
      stationId: resolveStationId(name) ?? DEMO_CROWD_DATA.find((r) => r.stationName === name)?.stationId ?? name,
    }))

    // Phase 11 (P8) fix — one CrowdReport query covering every station on
    // this route, instead of stationEstimate() issuing its own query per
    // station (N+1: up to 4 stations x up to 4 candidate routes per request).
    // Same match predicate as stationEstimate()'s single-station query
    // (stationId OR stationName), just evaluated in memory per station
    // against this one batch instead of a separate round trip each.
    const reportsByStationId = new Map<string, Array<{ crowdLevel: CrowdLevel; stationName: string }>>()
    if (mongoose.connection.readyState === 1 && resolved.length > 0) {
      const since = new Date(Date.now() - 90 * 60 * 1000)
      const ids = resolved.map((r) => r.stationId)
      const allRecent = await CrowdReport.find({
        $or: [{ stationId: { $in: ids } }, { stationName: { $in: names } }],
        reportedAt: { $gte: since },
        status: "accepted",
      }).sort({ reportedAt: -1 })

      for (const { name, stationId } of resolved) {
        const matches = allRecent
          .filter((r) => r.stationId === stationId || r.stationName === name)
          .slice(0, 5)
          .map((r) => ({ crowdLevel: r.crowdLevel, stationName: r.stationName }))
        reportsByStationId.set(stationId, matches)
      }
    }

    const estimates = resolved.map(({ name, stationId }) => {
      const matches = reportsByStationId.get(stationId) ?? []
      return buildEstimate(stationId, name, matches.map((m) => m.crowdLevel), matches[0]?.stationName)
    })
    const levels = estimates.map((e) => e.crowdLevel).filter((level): level is CrowdLevel => Boolean(level))
    const level = estimateLevel(levels)
    const source = estimates.some((e) => e.source === "RECENT_USER_REPORT")
      ? "RECENT_USER_REPORT"
      : estimates.some((e) => e.source === "DEMO_DATA")
        ? "DEMO_DATA"
        : "UNAVAILABLE"
    return {
      level,
      source,
      summary: level ? `${level} crowd estimate for key transit points.` : "Crowd information unavailable.",
      stations: estimates,
    }
  },
}

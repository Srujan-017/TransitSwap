#!/usr/bin/env ts-node
// ── Accessibility-focused experiments for the IEEE conference paper ─────────
//
// Every result in docs/paper/ieee/ comes from the JSON this script writes,
// except the worked example (Table II), which print-worked-example.ts prints. It
// calls the real production services and replicates the exact order of
// operations in controllers/multimodalController.ts (station + walking hard
// constraints -> enrichment -> crowd hard constraint -> ranking), so the
// "TransitSwap" policy below is the system as deployed, not a re-implementation.
//
// Reproducibility: no network (deterministic offline road-leg provider, same
// as generate-paper-data.ts), no database (the system's documented demo mode),
// a seeded OD sample, and a pinned clock (crowd demo data is time-of-day
// dependent, see crowdService.nearestSlot()).
//
// Run with: npx ts-node --transpile-only scripts/generate-accessibility-paper-data.ts
// Output:   docs/paper/ieee/data/accessibility-paper-data.json

import fs from "fs"
import path from "path"
import {
  multimodalService,
  setMultimodalRoadLegProviderForTesting,
  type RoadLegProvider,
} from "../src/services/multimodalService"
import { accessibilityService } from "../src/services/accessibilityService"
import { crowdService } from "../src/services/crowdService"
import { calculateWeatherImpact, weatherService } from "../src/services/weatherService"
import { reliabilityService } from "../src/services/reliabilityService"
import { mlPreferenceService } from "../src/services/ml/mlPreferenceService"
import { evaluationService, EVALUATION_SCENARIOS } from "../src/services/evaluationService"
import { METRO_STATIONS, BUS_STOPS, METRO_LINES, BUS_ROUTES } from "../src/data/transitData"
import { DEMO_ACCESSIBILITY_DATA } from "../src/data/accessibilityData"
import { DEMO_CROWD_DATA } from "../src/data/crowdData"
import { createSeededRandom } from "../src/services/ml/seededRandom"
import type { AccessibilityEvaluation, EnrichedRoute } from "../src/types/intelligence"
import type { MultimodalRoute } from "../src/types/multimodal"

// ── Deterministic offline road legs (identical to generate-paper-data.ts) ──
const offlineProvider: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const distanceMeters = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    const speedMps = mode === "walking" ? 1.3 : mode === "cycling" ? 4 : 8
    return [
      {
        distanceMeters,
        durationSeconds: distanceMeters / speedMps,
        geometry: {
          type: "LineString",
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        },
      },
    ]
  },
}
setMultimodalRoadLegProviderForTesting(offlineProvider)

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Same great-circle destination-point construction as evaluationService's
// nearbyAddress(): a reproducible "address near a stop", never the exact stop.
function nearbyAddress(
  entity: { name: string; latitude: number; longitude: number },
  bearingDeg: number,
  distanceM: number,
) {
  const R = 6371000
  const bearing = (bearingDeg * Math.PI) / 180
  const latRad = (entity.latitude * Math.PI) / 180
  const lngRad = (entity.longitude * Math.PI) / 180
  const d = distanceM / R
  const newLat = Math.asin(Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearing))
  const newLng =
    lngRad + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(latRad), Math.cos(d) - Math.sin(latRad) * Math.sin(newLat))
  return {
    name: `Near ${entity.name} (~${Math.round(distanceM)}m away)`,
    latitude: Number(((newLat * 180) / Math.PI).toFixed(6)),
    longitude: Number(((newLng * 180) / Math.PI).toFixed(6)),
  }
}

// ── Pinned clock (crowd demo data depends on weekday/weekend + time slot) ──
const RealDate = Date
function installFixedClock(local: { y: number; m: number; d: number; h: number; min: number }) {
  const fixed = new RealDate(local.y, local.m, local.d, local.h, local.min).getTime()
  class FixedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(fixed)
      else super(...(args as [string]))
    }
    static now() {
      return fixed
    }
  }
  ;(globalThis as unknown as { Date: DateConstructor }).Date = FixedDate as unknown as DateConstructor
  return new RealDate(fixed)
}
function restoreClock() {
  ;(globalThis as unknown as { Date: DateConstructor }).Date = RealDate
}

// Only two conditions are reported: the demo crowd table is sparse (16 records,
// 14 stations) and crowdService.nearestSlot() only ever returns 08:00/14:00/
// 18:00/20:00, so stations without a record for the queried slot fall back to
// their first record. A PM-peak and a weekend clock were measured during
// development and reproduced the AM-peak numbers exactly for that reason.
const CLOCKS = {
  weekdayAmPeak: { y: 2026, m: 9, d: 28, h: 8, min: 30 }, // Wed 28 Oct 2026, 08:30 -> slot 08:00
  weekdayOffPeak: { y: 2026, m: 9, d: 28, h: 14, min: 30 }, // -> slot 14:00
} as const
type ClockName = keyof typeof CLOCKS

const PROFILES = ["standard", "wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility"] as const
type Profile = (typeof PROFILES)[number]

// Mirrors multimodalController.ts exactly.
const CROWD_HARD_BLOCK_PROFILES = new Set<string>(["pregnant", "senior", "stroller", "luggage", "wheelchair"])

// ── OD sets ────────────────────────────────────────────────────────────────
type OD = {
  id: string
  set: "curated" | "random"
  origin: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
}

function buildOdSets(randomCount: number, seed: number): OD[] {
  const curated: OD[] = EVALUATION_SCENARIOS.map((s, i) => ({ id: `E${i + 1}`, set: "curated", origin: s.origin, destination: s.destination }))

  const nodes = [
    ...METRO_STATIONS.map((s) => ({ name: s.name, latitude: s.latitude, longitude: s.longitude })),
    ...BUS_STOPS.map((s) => ({ name: s.name, latitude: s.latitude, longitude: s.longitude })),
  ]
  const pairs: Array<[number, number]> = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      if (haversine(nodes[i].latitude, nodes[i].longitude, nodes[j].latitude, nodes[j].longitude) < 2000) continue
      pairs.push([i, j])
    }
  }
  const rand = createSeededRandom(seed)
  // Partial Fisher-Yates: the first randomCount entries are a uniform sample without replacement.
  for (let k = 0; k < Math.min(randomCount, pairs.length); k++) {
    const r = k + Math.floor(rand() * (pairs.length - k))
    ;[pairs[k], pairs[r]] = [pairs[r], pairs[k]]
  }
  const random: OD[] = pairs.slice(0, randomCount).map(([i, j], k) => {
    const oDist = 150 + Math.floor(rand() * 251) // 150-400 m
    const dDist = 150 + Math.floor(rand() * 251)
    return {
      id: `R${k + 1}`,
      set: "random",
      origin: nearbyAddress(nodes[i], Math.floor(rand() * 360), oDist),
      destination: nearbyAddress(nodes[j], Math.floor(rand() * 360), dDist),
    }
  })
  return [...curated, ...random]
}

// ── Pipeline pieces (exact controller order) ───────────────────────────────
function signature(route: MultimodalRoute): string {
  return route.segments.map((s) => `${s.mode}:${s.from.name}>${s.to.name}`).join("|")
}

function transitEndpointNames(route: MultimodalRoute): Set<string> {
  const names = new Set<string>()
  for (const s of route.segments) {
    if (s.mode === "metro" || s.mode === "bus") {
      names.add(s.from.name)
      names.add(s.to.name)
    }
  }
  return names
}

async function enrich(routes: Array<MultimodalRoute & { accessibility?: AccessibilityEvaluation }>, destination: OD["destination"]) {
  const weather = await weatherService.getCurrent(destination.latitude, destination.longitude)
  const allWalking = routes.map((r) => r.totalWalkingMeters)
  return Promise.all(
    routes.map(async (route, index) => {
      const e: EnrichedRoute = {
        ...route,
        weatherImpact: calculateWeatherImpact(weather, route.totalWalkingMeters, allWalking.filter((_, k) => k !== index)),
        crowd: await crowdService.routeSummary(route),
      }
      e.reliability = reliabilityService.calculateReliability(e)
      e.confidenceInterval = await reliabilityService.calculateConfidenceInterval(e)
      e.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(e)
      return e
    }),
  )
}

function crowdBlocks(route: EnrichedRoute, profile: Profile): boolean {
  if (!CROWD_HARD_BLOCK_PROFILES.has(profile)) return false
  return route.crowd?.level === "HIGH" && route.crowd?.source !== "UNAVAILABLE"
}

interface TsResult {
  feasible: EnrichedRoute[]
  ranked: EnrichedRoute[]
  blockedStation: number
  blockedWalking: number
  blockedCrowd: number
  reasons: Array<{ type: string; reason: string | null }>
  accessibilityEvalMs: number
}

// The deployed policy: hard constraints, then the profile-weighted ranker.
// includeCrowd=false isolates the infrastructure constraints (station rules +
// walking/rolling cap), i.e. the deployed pipeline with the crowd rule off.
async function runTransitSwap(candidates: MultimodalRoute[], profile: Profile, od: OD, includeCrowd: boolean): Promise<TsResult> {
  const t0 = performance.now()
  const evaluations = await Promise.all(candidates.map((r) => accessibilityService.evaluateRoute(r, profile)))
  const accessibilityEvalMs = performance.now() - t0

  const reasons: TsResult["reasons"] = []
  let blockedStation = 0
  let blockedWalking = 0
  const passed: Array<MultimodalRoute & { accessibility: AccessibilityEvaluation }> = []
  candidates.forEach((route, i) => {
    const ev = evaluations[i]
    if (ev.blocked) {
      if (ev.blockedReasonType === "station") blockedStation++
      else blockedWalking++
      reasons.push({ type: ev.blockedReasonType ?? "missing", reason: ev.rejectionReason })
    } else {
      passed.push({ ...route, accessibility: ev })
    }
  })

  const enriched = await enrich(passed, od.destination)
  let blockedCrowd = 0
  const feasible = enriched.filter((r) => {
    if (includeCrowd && crowdBlocks(r, profile)) {
      blockedCrowd++
      reasons.push({ type: "crowd", reason: "Route excluded: passes through a HIGH-crowd station, unsuitable for your selected profile." })
      return false
    }
    return true
  })

  const ranked = feasible.length > 0 ? (await mlPreferenceService.rankRoutes(undefined, feasible, profile, undefined)).rankedRoutes : []
  return { feasible, ranked, blockedStation, blockedWalking, blockedCrowd, reasons, accessibilityEvalMs }
}

// Counterfactual: the same ranker and the same feature values, but accessibility
// only as a soft term (a blocked route keeps accessibilityScore = 0, the most
// pessimistic value the feature can take, yet stays eligible to win).
async function runSoft(candidates: MultimodalRoute[], profile: Profile, od: OD) {
  const evaluations = await Promise.all(candidates.map((r) => accessibilityService.evaluateRoute(r, profile)))
  const withEval = candidates.map((route, i) => ({ ...route, accessibility: evaluations[i] }))
  const enriched = await enrich(withEval, od.destination)
  const ranked = enriched.length > 0 ? (await mlPreferenceService.rankRoutes(undefined, enriched, profile, undefined)).rankedRoutes : []
  return { top: ranked[0] ?? null }
}

function isWalkOnly(route: MultimodalRoute): boolean {
  return route.segments.every((s) => s.mode === "walking")
}

function fastest<T extends MultimodalRoute>(routes: T[]): T | null {
  return routes.reduce<T | null>((best, r) => (!best || r.totalDurationSeconds < best.totalDurationSeconds ? r : best), null)
}

// ── Statistics helpers ─────────────────────────────────────────────────────
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}
function summarize(values: number[]) {
  const s = [...values].sort((a, b) => a - b)
  const mean = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0
  return {
    n: s.length,
    mean: round(mean, 2),
    median: round(quantile(s, 0.5), 2),
    p25: round(quantile(s, 0.25), 2),
    p75: round(quantile(s, 0.75), 2),
    p90: round(quantile(s, 0.9), 2),
    max: round(s.length ? s[s.length - 1] : 0, 2),
  }
}
function round(x: number, d = 1) {
  const f = 10 ** d
  return Math.round(x * f) / f
}
function pct(num: number, den: number) {
  return den === 0 ? 0 : round((100 * num) / den, 1)
}
// Wilson score interval for a binomial proportion (95%).
function wilson(num: number, den: number) {
  if (den === 0) return { low: 0, high: 0 }
  const z = 1.96
  const p = num / den
  const denom = 1 + (z * z) / den
  const centre = (p + (z * z) / (2 * den)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / den + (z * z) / (4 * den * den))) / denom
  return { low: round(100 * Math.max(0, centre - half), 1), high: round(100 * Math.min(1, centre + half), 1) }
}

type Served = { od: OD; candidates: MultimodalRoute[] }

// One (clock, profile, constraint-variant) evaluation over every served OD.
async function evaluateVariant(served: Served[], profile: Profile, includeCrowd: boolean, softTops: Map<string, EnrichedRoute | null>) {
  const n = served.length
  let odNoFeasible = 0
  let odWithFeasible = 0
  let blockedStation = 0
  let blockedWalking = 0
  let blockedCrowd = 0
  let totalCandidates = 0
  let reasonsTotal = 0
  let reasonsWithText = 0
  let reasonsTyped = 0
  let topWithUnverifiedWarning = 0
  let topWalkOnly = 0
  const time = { violations: 0, avoidable: 0, silent: 0 }
  const soft = { violations: 0, avoidable: 0, silent: 0 }
  let tsViolations = 0
  const deltaMin: number[] = []
  const positiveDetours: number[] = []
  const deltaWalkM: number[] = []
  const deltaFare: number[] = []
  const deltaTransfers: number[] = []
  const recommendedWalkM: number[] = []
  const feasibleCounts: number[] = []
  const accEvalMs: number[] = []

  for (const g of served) {
    const ts = await runTransitSwap(g.candidates, profile, g.od, includeCrowd)
    totalCandidates += g.candidates.length
    blockedStation += ts.blockedStation
    blockedWalking += ts.blockedWalking
    blockedCrowd += ts.blockedCrowd
    accEvalMs.push(ts.accessibilityEvalMs)
    feasibleCounts.push(ts.feasible.length)
    for (const r of ts.reasons) {
      reasonsTotal++
      if (r.reason && r.reason.trim().length > 0) reasonsWithText++
      if (r.type === "station" || r.type === "walking_distance" || r.type === "crowd") reasonsTyped++
    }

    const feasibleSigs = new Set(ts.feasible.map(signature))
    const timeTop = fastest(g.candidates)!
    const softTop = softTops.get(g.od.id) ?? null
    const timeViolates = !feasibleSigs.has(signature(timeTop))
    const softViolates = softTop ? !feasibleSigs.has(signature(softTop)) : false
    const tsTop = ts.ranked[0] ?? null
    if (tsTop && !feasibleSigs.has(signature(tsTop))) tsViolations++

    const hasFeasible = ts.feasible.length > 0
    if (timeViolates) {
      time.violations++
      if (hasFeasible) time.avoidable++
      else time.silent++
    }
    if (softViolates) {
      soft.violations++
      if (hasFeasible) soft.avoidable++
      else soft.silent++
    }

    if (!hasFeasible) {
      odNoFeasible++
      continue
    }
    odWithFeasible++
    const ff = fastest(ts.feasible)!
    const dt = (ff.totalDurationSeconds - timeTop.totalDurationSeconds) / 60
    deltaMin.push(dt)
    if (dt > 0.5) positiveDetours.push(round(dt, 2))
    deltaWalkM.push(ff.totalWalkingMeters - timeTop.totalWalkingMeters)
    deltaFare.push(ff.totalFare - timeTop.totalFare)
    deltaTransfers.push(ff.transferCount - timeTop.transferCount)
    if (tsTop) {
      recommendedWalkM.push(tsTop.totalWalkingMeters)
      if (isWalkOnly(tsTop)) topWalkOnly++
      if (tsTop.accessibility?.warnings.some((w) => /unverified|incomplete/i.test(w))) topWithUnverifiedWarning++
    }
  }

  return {
    odPairs: n,
    candidatesEvaluated: totalCandidates,
    blocked: { station: blockedStation, walkingDistance: blockedWalking, crowd: blockedCrowd, total: blockedStation + blockedWalking + blockedCrowd },
    blockedPercentOfCandidates: pct(blockedStation + blockedWalking + blockedCrowd, totalCandidates),
    odWithFeasible,
    odNoFeasible,
    noFeasiblePercent: pct(odNoFeasible, n),
    noFeasibleCi95: wilson(odNoFeasible, n),
    violation: {
      shortestTime: { ...time, percent: pct(time.violations, n), ci95: wilson(time.violations, n), avoidablePercentOfFeasibleOd: pct(time.avoidable, odWithFeasible) },
      softScoring: { ...soft, percent: pct(soft.violations, n), ci95: wilson(soft.violations, n), avoidablePercentOfFeasibleOd: pct(soft.avoidable, odWithFeasible) },
      transitSwap: { violations: tsViolations, percent: pct(tsViolations, n) },
    },
    feasibleCandidatesPerOd: summarize(feasibleCounts),
    priceOfAccessibility: {
      deltaMinutes: summarize(deltaMin),
      odWithPositiveDetourPercent: pct(positiveDetours.length, odWithFeasible),
      positiveDetourMinutes: summarize(positiveDetours),
      positiveDetourValues: positiveDetours.sort((a, b) => a - b),
      deltaWalkingMeters: summarize(deltaWalkM),
      deltaFareRupees: summarize(deltaFare),
      deltaTransfers: summarize(deltaTransfers),
    },
    recommendation: {
      walkingMeters: summarize(recommendedWalkM),
      walkOnlyPercent: pct(topWalkOnly, odWithFeasible),
      unverifiedWarningPercent: pct(topWithUnverifiedWarning, odWithFeasible),
    },
    explanations: { reasonsTotal, reasonsWithText, reasonsTyped, completenessPercent: pct(reasonsWithText, reasonsTotal) },
    accessibilityEvalMs: summarize(accEvalMs),
  }
}

// ── Experiment ─────────────────────────────────────────────────────────────
async function main() {
  const RANDOM_OD_COUNT = 500
  const OD_SEED = 20261028
  const ods = buildOdSets(RANDOM_OD_COUNT, OD_SEED)

  // 1. Candidate generation once per OD (profile-independent: generateRoutes never reads the profile).
  console.log(`Generating candidates for ${ods.length} OD pairs...`)
  const generation: Array<{ od: OD; candidates: MultimodalRoute[]; ms: number; error?: string }> = []
  for (const od of ods) {
    const t0 = performance.now()
    try {
      const candidates = await multimodalService.generateRoutes({ origin: od.origin, destination: od.destination })
      generation.push({ od, candidates, ms: performance.now() - t0 })
    } catch (err) {
      generation.push({ od, candidates: [], ms: performance.now() - t0, error: err instanceof Error ? err.message : String(err) })
    }
  }
  const served: Served[] = generation.filter((g) => g.candidates.length > 0)
  console.log(`  ${served.length}/${ods.length} OD pairs have >=1 candidate`)

  // 2. Per clock x profile x variant: feasibility, violations, price of accessibility.
  const perClock: Record<string, unknown> = {}
  for (const clockName of Object.keys(CLOCKS) as ClockName[]) {
    const clockDate = installFixedClock(CLOCKS[clockName])
    console.log(`Clock ${clockName}: ${clockDate.toString()}`)
    const perProfile: Record<string, unknown> = {}
    for (const profile of PROFILES) {
      // The soft policy's ranking does not depend on the constraint variant.
      const softTops = new Map<string, EnrichedRoute | null>()
      for (const g of served) softTops.set(g.od.id, (await runSoft(g.candidates, profile, g.od)).top)

      const infrastructure = await evaluateVariant(served, profile, false, softTops)
      const deployed = await evaluateVariant(served, profile, true, softTops)
      perProfile[profile] = { infrastructure, deployed }
      console.log(
        `  ${profile.padEnd(16)} infra: noFeas=${infrastructure.noFeasiblePercent}% time=${infrastructure.violation.shortestTime.percent}% soft=${infrastructure.violation.softScoring.percent}%` +
          ` | deployed: noFeas=${deployed.noFeasiblePercent}% time=${deployed.violation.shortestTime.percent}% soft=${deployed.violation.softScoring.percent}% ts=${deployed.violation.transitSwap.percent}%`,
      )
    }
    perClock[clockName] = { clock: clockDate.toString(), profiles: perProfile }
    restoreClock()
  }

  // 3. Lift-outage criticality (off-peak clock; replicates adminService.updateAccessibility's
  //    "hasLift: false" branch: hasLift=false, wheelchairAccessible=false, status=not_accessible).
  console.log("Lift-outage criticality analysis...")
  installFixedClock(CLOCKS.weekdayOffPeak)
  const OUTAGE_PROFILES: Profile[] = ["wheelchair", "reduced_mobility", "stroller", "senior"]
  const VARIANTS = [
    { name: "infrastructure", includeCrowd: false },
    { name: "deployed", includeCrowd: true },
  ] as const
  type BaselineEntry = { feasible: number; topSig: string | null; topMin: number | null }
  const baseline = new Map<string, BaselineEntry>() // key: variant|profile|odId
  const endpointNames = new Map<string, Set<string>>()
  for (const g of served) {
    const names = new Set<string>()
    for (const c of g.candidates) for (const n of transitEndpointNames(c)) names.add(n)
    endpointNames.set(g.od.id, names)
    for (const v of VARIANTS) {
      for (const profile of OUTAGE_PROFILES) {
        const ts = await runTransitSwap(g.candidates, profile, g.od, v.includeCrowd)
        const top = ts.ranked[0] ?? null
        baseline.set(`${v.name}|${profile}|${g.od.id}`, {
          feasible: ts.feasible.length,
          topSig: top ? signature(top) : null,
          topMin: top ? top.totalDurationSeconds / 60 : null,
        })
      }
    }
  }

  const liftStations = DEMO_ACCESSIBILITY_DATA.filter((r) => r.hasLift === true)
  const criticality: Array<Record<string, unknown>> = []
  for (const station of liftStations) {
    const original = { hasLift: station.hasLift, wheelchairAccessible: station.wheelchairAccessible, status: station.status }
    station.hasLift = false
    station.wheelchairAccessible = false
    station.status = "not_accessible"

    const result: Record<string, Record<string, unknown>> = {}
    for (const v of VARIANTS) {
      result[v.name] = {}
      for (const profile of OUTAGE_PROFILES) {
        let baselineFeasibleOd = 0
        let disconnected = 0
        let rerouted = 0
        const extraMinutes: number[] = []
        for (const g of served) {
          const base = baseline.get(`${v.name}|${profile}|${g.od.id}`)!
          if (base.feasible === 0) continue
          baselineFeasibleOd++
          if (!endpointNames.get(g.od.id)!.has(station.stationName)) continue // no candidate boards/alights here: provably unchanged
          const ts = await runTransitSwap(g.candidates, profile, g.od, v.includeCrowd)
          if (ts.feasible.length === 0) disconnected++
          else if (signature(ts.ranked[0]) !== base.topSig) {
            rerouted++
            extraMinutes.push(ts.ranked[0].totalDurationSeconds / 60 - (base.topMin ?? 0))
          }
        }
        result[v.name][profile] = {
          baselineFeasibleOd,
          disconnected,
          disconnectedPercent: pct(disconnected, baselineFeasibleOd),
          rerouted,
          reroutedPercent: pct(rerouted, baselineFeasibleOd),
          reroutedExtraMinutes: summarize(extraMinutes),
        }
      }
    }

    Object.assign(station, original)
    criticality.push({ stationId: station.stationId, stationName: station.stationName, transportMode: station.transportMode, ...result })
  }
  restoreClock()

  // 4. Standard-profile ranking benchmark (the existing 22-scenario harness, current code).
  console.log("Standard-profile ranking benchmark (evaluationService.runEvaluation)...")
  const benchmark = await evaluationService.runEvaluation()

  // 5. Dataset description (computed, not hand-counted).
  const by = <T extends object>(rows: T[], key: keyof T) =>
    rows.reduce<Record<string, number>>((m, r) => {
      const k = String(r[key])
      m[k] = (m[k] ?? 0) + 1
      return m
    }, {})
  const restrictive = (profile: Profile) =>
    DEMO_ACCESSIBILITY_DATA.filter((r) => {
      // Mirrors accessibilityService.getBlockReason() per profile (station rules only).
      const stairs = r.stairCount ?? 0
      switch (profile) {
        case "wheelchair":
          return (
            r.status === "not_accessible" ||
            r.wheelchairAccessible === false ||
            (r.stepFreeEntrance === false && r.hasLift === false && r.hasRamp === false) ||
            (r.hasLift === false && r.hasRamp === false && stairs > 0)
          )
        case "stroller":
          return r.status === "not_accessible" || (r.hasLift === false && r.hasRamp === false && stairs > 20)
        case "senior":
        case "pregnant":
        case "luggage":
          return r.status === "not_accessible" && stairs > 35
        case "reduced_mobility":
          return r.status === "not_accessible" || (r.stepFreeEntrance === false && r.hasLift === false && r.hasRamp === false && stairs > 15)
        default:
          return false
      }
    }).length
  const dataset = {
    metroLines: METRO_LINES.length,
    metroStations: METRO_STATIONS.length,
    busRoutes: BUS_ROUTES.length,
    busStops: BUS_STOPS.length,
    accessibilityRecords: DEMO_ACCESSIBILITY_DATA.length,
    accessibilityStatus: by(DEMO_ACCESSIBILITY_DATA, "status"),
    hasLift: by(DEMO_ACCESSIBILITY_DATA, "hasLift"),
    hasRamp: by(DEMO_ACCESSIBILITY_DATA, "hasRamp"),
    wheelchairAccessible: by(DEMO_ACCESSIBILITY_DATA, "wheelchairAccessible"),
    stepFreeEntrance: by(DEMO_ACCESSIBILITY_DATA, "stepFreeEntrance"),
    stepFreePlatform: by(DEMO_ACCESSIBILITY_DATA, "stepFreePlatform"),
    restrictiveStationsPerProfile: Object.fromEntries(PROFILES.map((p) => [p, restrictive(p)])),
    crowdRecords: DEMO_CROWD_DATA.length,
    crowdStations: new Set(DEMO_CROWD_DATA.map((r) => r.stationId)).size,
    crowdLevels: by(DEMO_CROWD_DATA, "crowdLevel"),
  }

  const genMs = served.map((g) => (generation.find((x) => x.od.id === g.od.id) ?? { ms: 0 }).ms)
  const output = {
    generatedAt: new RealDate().toISOString(),
    method: {
      odSeed: OD_SEED,
      randomOdCount: RANDOM_OD_COUNT,
      curatedOdCount: EVALUATION_SCENARIOS.length,
      randomOdRule: "ordered pairs of distinct stations/stops >= 2 km apart, uniform sample without replacement, each endpoint offset 150-400 m at a random bearing",
      roadLegs: "offline deterministic provider (haversine x 1.2; walking 1.3 m/s)",
      database: "none (demo mode: accessibility, crowd and weather from the seeded demo datasets)",
      crowdHardBlockProfiles: [...CROWD_HARD_BLOCK_PROFILES],
      variants: {
        infrastructure: "station rules + walking/rolling cap (crowd rule off)",
        deployed: "infrastructure + crowd rule, exactly as multimodalController.ts",
      },
      liftOutageTransform: "hasLift=false, wheelchairAccessible=false, status=not_accessible (adminService.updateAccessibility, hasLift:false branch)",
      softPolicy: "same ranker (mlPreferenceService.rankRoutes, profile weights) over ALL candidates; a blocked route keeps accessibilityScore=0 but remains eligible",
      timePolicy: "minimum totalDurationSeconds over all candidates",
    },
    dataset,
    generation: {
      odTotal: ods.length,
      odWithCandidates: served.length,
      odWithoutCandidates: ods.length - served.length,
      errors: generation.filter((g) => g.error).length,
      candidatesPerOd: summarize(served.map((g) => g.candidates.length)),
      generationMs: summarize(genMs),
      curatedWithCandidates: served.filter((g) => g.od.set === "curated").length,
      randomWithCandidates: served.filter((g) => g.od.set === "random").length,
    },
    perClock,
    liftCriticality: criticality,
    standardBenchmark: {
      totalScenarios: benchmark.totalScenariosEvaluated,
      baselineAgreement: {
        shortestTime: benchmark.agreementRateWithShortestTimePercent,
        cheapest: benchmark.agreementRateWithCheapestPercent,
        leastWalking: benchmark.agreementRateWithLeastWalkingPercent,
        fewestTransfers: benchmark.agreementRateWithFewestTransfersPercent,
        random: benchmark.agreementRateWithRandomPercent,
      },
      ablationDecisionChangeRatePercent: benchmark.ablationDecisionChangeRatePercent,
      latencyP50Ms: benchmark.latencyP50Ms,
      latencyP95Ms: benchmark.latencyP95Ms,
    },
  }

  // Written straight into the paper folder, where docs/paper/ieee/scripts/make_figures.py reads it.
  const outPath = path.join(__dirname, "..", "..", "docs", "paper", "ieee", "data", "accessibility-paper-data.json")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${outPath}`)
}

main().catch((err) => {
  restoreClock()
  console.error("generate-accessibility-paper-data.ts failed:", err)
  process.exit(1)
})

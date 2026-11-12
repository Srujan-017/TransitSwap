#!/usr/bin/env ts-node
// Prints the paper's worked example (Table II): the wheelchair query for OD pair
// R144 of the evaluation set, every candidate with the engine's verbatim
// exclusion reason, and the outcome under the deployed crowd rule at peak.
// Same offline road legs, demo-mode data and OD construction (seed) as
// generate-accessibility-paper-data.ts. Read-only; prints to stdout.
//
// Run with: npx ts-node --transpile-only scripts/print-worked-example.ts

import { multimodalService, setMultimodalRoadLegProviderForTesting, type RoadLegProvider } from "../src/services/multimodalService"
import { accessibilityService } from "../src/services/accessibilityService"
import { crowdService } from "../src/services/crowdService"
import { mlPreferenceService } from "../src/services/ml/mlPreferenceService"
import { calculateWeatherImpact, weatherService } from "../src/services/weatherService"
import { reliabilityService } from "../src/services/reliabilityService"
import { METRO_STATIONS, BUS_STOPS } from "../src/data/transitData"
import { createSeededRandom } from "../src/services/ml/seededRandom"
import type { EnrichedRoute } from "../src/types/intelligence"
import type { MultimodalRoute } from "../src/types/multimodal"

const OD_ID = "R144"
const OD_SEED = 20261028
const PROFILE = "wheelchair" as const

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const offlineProvider: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const distanceMeters = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    const speedMps = mode === "walking" ? 1.3 : mode === "cycling" ? 4 : 8
    return [
      {
        distanceMeters,
        durationSeconds: distanceMeters / speedMps,
        geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] },
      },
    ]
  },
}
setMultimodalRoadLegProviderForTesting(offlineProvider)

function nearbyAddress(entity: { name: string; latitude: number; longitude: number }, bearingDeg: number, distanceM: number) {
  const R = 6371000
  const bearing = (bearingDeg * Math.PI) / 180
  const latRad = (entity.latitude * Math.PI) / 180
  const lngRad = (entity.longitude * Math.PI) / 180
  const d = distanceM / R
  const newLat = Math.asin(Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearing))
  const newLng = lngRad + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(latRad), Math.cos(d) - Math.sin(latRad) * Math.sin(newLat))
  return { name: `Near ${entity.name} (~${Math.round(distanceM)}m away)`, latitude: Number(((newLat * 180) / Math.PI).toFixed(6)), longitude: Number(((newLng * 180) / Math.PI).toFixed(6)) }
}

// Identical to buildOdSets() in generate-accessibility-paper-data.ts (random part only).
function randomOd(id: string) {
  const nodes = [...METRO_STATIONS, ...BUS_STOPS].map((s) => ({ name: s.name, latitude: s.latitude, longitude: s.longitude }))
  const pairs: Array<[number, number]> = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i !== j && haversine(nodes[i].latitude, nodes[i].longitude, nodes[j].latitude, nodes[j].longitude) >= 2000) pairs.push([i, j])
    }
  }
  const rand = createSeededRandom(OD_SEED)
  for (let k = 0; k < Math.min(500, pairs.length); k++) {
    const r = k + Math.floor(rand() * (pairs.length - k))
    ;[pairs[k], pairs[r]] = [pairs[r], pairs[k]]
  }
  const ods = pairs.slice(0, 500).map(([i, j], k) => {
    const oDist = 150 + Math.floor(rand() * 251)
    const dDist = 150 + Math.floor(rand() * 251)
    return { id: `R${k + 1}`, origin: nearbyAddress(nodes[i], Math.floor(rand() * 360), oDist), destination: nearbyAddress(nodes[j], Math.floor(rand() * 360), dDist) }
  })
  return ods.find((od) => od.id === id)!
}

const RealDate = Date
function pinClock(h: number, min: number) {
  const fixed = new RealDate(2026, 9, 28, h, min).getTime() // Wednesday 28 Oct 2026
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
}

function legs(route: MultimodalRoute) {
  return route.segments.map((s) => (s.mode === "metro" || s.mode === "bus" ? `${s.mode} ${s.from.name} > ${s.to.name}` : s.mode)).join(" | ")
}

async function main() {
  const od = randomOd(OD_ID)
  console.log(`${OD_ID}: ${od.origin.name} -> ${od.destination.name} (profile: ${PROFILE})`)
  const candidates = await multimodalService.generateRoutes({ origin: od.origin, destination: od.destination })
  const evaluations = await Promise.all(candidates.map((r) => accessibilityService.evaluateRoute(r, PROFILE)))

  for (const [h, min, label] of [
    [14, 30, "off-peak 14:30"],
    [8, 30, "AM peak 08:30"],
  ] as const) {
    pinClock(h, min)
    console.log(`\n--- ${label} ---`)
    const weather = await weatherService.getCurrent(od.destination.latitude, od.destination.longitude)
    const passed = candidates.map((r, k) => ({ ...r, accessibility: evaluations[k] })).filter((r) => !r.accessibility.blocked)
    const walking = passed.map((r) => r.totalWalkingMeters)
    const enriched: EnrichedRoute[] = await Promise.all(
      passed.map(async (r, k) => {
        const e: EnrichedRoute = { ...r, weatherImpact: calculateWeatherImpact(weather, r.totalWalkingMeters, walking.filter((_, j) => j !== k)), crowd: await crowdService.routeSummary(r) }
        e.reliability = reliabilityService.calculateReliability(e)
        e.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(e)
        return e
      }),
    )
    const ranked = enriched.length ? (await mlPreferenceService.rankRoutes(undefined, enriched, PROFILE, undefined)).rankedRoutes : []
    candidates.forEach((r, k) => {
      const ev = evaluations[k]
      const head = `${Math.round(r.totalDurationSeconds / 60)} min, rolling ${Math.round(r.totalWalkingMeters)} m | ${legs(r)}`
      if (ev.blocked) {
        console.log(`  EXCLUDED [${ev.blockedReasonType}] ${head}\n    reason: ${ev.rejectionReason}`)
        return
      }
      const e = enriched.find((x) => x.id === r.id)!
      const crowdExcluded = e.crowd?.level === "HIGH" && e.crowd?.source !== "UNAVAILABLE"
      const rank = ranked.findIndex((x) => x.id === r.id) + 1
      console.log(
        `  ${crowdExcluded ? "EXCLUDED [crowd, deployed variant]" : `FEASIBLE (infrastructure rank ${rank})`} ${head}\n    status: ${e.accessibility?.status}; route crowd: ${e.crowd?.level ?? "n/a"} (${e.crowd?.source})`,
      )
    })
    ;(globalThis as unknown as { Date: DateConstructor }).Date = RealDate
  }
}

main().catch((err) => {
  ;(globalThis as unknown as { Date: DateConstructor }).Date = RealDate
  console.error(err)
  process.exit(1)
})

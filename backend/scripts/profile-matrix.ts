#!/usr/bin/env ts-node
// Profile test matrix: every profile x a set of Bengaluru trips x several times of day, run
// through the real planning pipeline (services/tripPlanner.ts — the same code the API uses),
// with an offline road model so it is fast and repeatable. Each result is checked against the
// travel rules for that profile by a checker written independently of the policy code.
//
// Run:  cd backend && npx ts-node --transpile-only scripts/profile-matrix.ts [out.json] [--weather rain|heavy_rain|heat|clear]
// With a bad-weather option every profile (standard included) must also have no walk over 300 m.
// Exit code 1 if any served route breaks a rule or any trip is left without an answer.

// Offline and repeatable: fixed clear weather, no weather-service call.
process.env.WEATHER_SOURCE = process.env.WEATHER_SOURCE || "clear"

import fs from "fs"
import { setMultimodalRoadLegProviderForTesting, type RoadLegProvider } from "../src/services/multimodalService"
import { planTrip } from "../src/services/tripPlanner"
import { AppError } from "../src/middleware/errorHandler"
import type { MultimodalRoute } from "../src/types/multimodal"

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
const offlineProvider: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const distanceMeters = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    const speedMps = mode === "walking" ? 1.3 : mode === "cycling" ? 4 : 8
    return [{
      distanceMeters, durationSeconds: distanceMeters / speedMps,
      geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] },
    }]
  },
}
setMultimodalRoadLegProviderForTesting(offlineProvider)

const P = (name: string, latitude: number, longitude: number) => ({ name, latitude, longitude })
export const TRIPS: Array<{ id: string; from: ReturnType<typeof P>; to: ReturnType<typeof P> }> = [
  { id: "Hoodi -> MG Road", from: P("Hoodi", 12.987, 77.7089), to: P("MG Road", 12.9763, 77.6079) },
  { id: "Whitefield -> Majestic", from: P("Whitefield", 12.9698, 77.75), to: P("Majestic", 12.9767, 77.5713) },
  { id: "Silk Board -> Majestic", from: P("Silk Board", 12.9172, 77.6232), to: P("Majestic", 12.9767, 77.5713) },
  { id: "Indiranagar -> Cubbon Park", from: P("Indiranagar", 12.9802, 77.6408), to: P("Cubbon Park", 12.9774, 77.5982) },
  { id: "Mysuru Road -> Majestic", from: P("Mysuru Road", 12.9419, 77.509), to: P("Majestic", 12.9767, 77.5713) },
  { id: "Koramangala -> Indiranagar 100ft", from: P("Koramangala", 12.9352, 77.6245), to: P("Indiranagar 100ft Rd", 12.9719, 77.6412) },
  { id: "Jayanagar -> MG Road", from: P("Jayanagar", 12.9308, 77.5838), to: P("MG Road", 12.9757, 77.6079) },
  { id: "Yeshwanthpur -> Electronic City", from: P("Yeshwanthpur", 13.028, 77.554), to: P("Electronic City", 12.8452, 77.6602) },
  { id: "Hebbal -> Shivajinagar", from: P("Hebbal", 13.0355, 77.5971), to: P("Shivajinagar", 12.9868, 77.6047) },
  { id: "Banashankari -> Jayanagar", from: P("Banashankari", 12.9254, 77.5468), to: P("Jayanagar", 12.9293, 77.583) },
  { id: "Marathahalli -> Whitefield", from: P("Marathahalli", 12.9569, 77.7011), to: P("Whitefield", 12.9692, 77.7496) },
  { id: "Malleshwaram -> Rajajinagar", from: P("Malleshwaram", 13.0035, 77.5695), to: P("Rajajinagar", 12.9939, 77.554) },
]
export const TIMES = [
  { id: "weekday 08:30", at: "2026-11-16T08:30" },
  { id: "weekday 14:30", at: "2026-11-16T14:30" },
  { id: "weekday 22:00", at: "2026-11-16T22:00" },
  { id: "weekday 23:30", at: "2026-11-16T23:30" }, // the metro has stopped
  { id: "saturday 11:00", at: "2026-11-14T11:00" },
]
export const PROFILES = ["wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility", "standard"] as const

// ── Independent rule checker (the rules exactly as the rider stated them) ─────
interface Limits { maxWalkTotal: number; maxWalkLeg: number; bus: "never" | "lowCrowd" | "any"; highMetro: boolean }
const RULES: Record<string, Limits> = {
  wheelchair: { maxWalkTotal: 300, maxWalkLeg: 150, bus: "never", highMetro: false },
  senior: { maxWalkTotal: 500, maxWalkLeg: 300, bus: "lowCrowd", highMetro: false },
  pregnant: { maxWalkTotal: 500, maxWalkLeg: 300, bus: "never", highMetro: false },
  stroller: { maxWalkTotal: 500, maxWalkLeg: 300, bus: "never", highMetro: false },
  luggage: { maxWalkTotal: 400, maxWalkLeg: 300, bus: "lowCrowd", highMetro: false },
  reduced_mobility: { maxWalkTotal: 400, maxWalkLeg: 300, bus: "lowCrowd", highMetro: false },
}

const weatherArg = process.argv.indexOf("--weather")
const WEATHER = (weatherArg >= 0 ? process.argv[weatherArg + 1] : undefined) as "clear" | "rain" | "heavy_rain" | "heat" | undefined
const BAD_WEATHER = WEATHER === "rain" || WEATHER === "heavy_rain" || WEATHER === "heat"

// Facts that must hold for EVERY route, whatever the profile: it is one connected journey from the origin to the
// destination, with sensible totals.
export function checkIntegrity(route: MultimodalRoute, from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): string[] {
  const problems: string[] = []
  const near = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => haversine(a.latitude, a.longitude, b.latitude, b.longitude)
  const segs = route.segments
  if (segs.length === 0) return ["no segments"]
  if (near(segs[0].from, from) > 60) problems.push("does not start at the origin")
  if (near(segs[segs.length - 1].to, to) > 60) problems.push("does not end at the destination")
  for (let i = 0; i < segs.length - 1; i++) if (near(segs[i].to, segs[i + 1].from) > 60) problems.push(`gap between leg ${i + 1} and ${i + 2}`)
  if (!(route.totalDurationSeconds > 0) || !(route.totalDistanceMeters > 0) || route.totalFare < 0) problems.push("bad totals")
  if (Math.abs(route.totalDurationSeconds - segs.reduce((n, s) => n + s.durationSeconds, 0)) > 2) problems.push("duration is not the sum of the legs")
  return problems
}

export function checkRoute(route: MultimodalRoute & { crowd?: { legs?: Array<{ segmentId: string; mode: string; level?: string }> } }, profile: string, departureAt?: string): string[] {
  const rule = RULES[profile] ?? (BAD_WEATHER ? { maxWalkTotal: Infinity, maxWalkLeg: Infinity, bus: "any" as const, highMetro: true } : undefined)
  if (!rule) return []
  const problems: string[] = []
  // The metro runs about 05:00-23:00: no accessibility profile is sent onto it outside those hours.
  if (RULES[profile] && departureAt) {
    let elapsed = 0
    for (const seg of route.segments) {
      if (seg.mode === "metro") {
        const boarding = new Date(new Date(departureAt).getTime() + elapsed * 1000)
        const minute = boarding.getHours() * 60 + boarding.getMinutes()
        if (minute < 5 * 60 || minute >= 23 * 60) problems.push(`metro boarded at ${boarding.getHours()}:${String(boarding.getMinutes()).padStart(2, "0")}`)
      }
      elapsed += seg.durationSeconds
    }
  }
  const legs = route.crowd?.legs ?? []
  const walks = route.segments.filter((s) => s.mode === "walking")
  const total = walks.reduce((n, s) => n + s.distanceMeters, 0)
  const longest = walks.reduce((n, s) => Math.max(n, s.distanceMeters), 0)
  const legLimit = BAD_WEATHER ? Math.min(rule.maxWalkLeg, 300) : rule.maxWalkLeg
  if (longest > legLimit) problems.push(`walking leg ${Math.round(longest)} m > ${legLimit} m`)
  if (total > rule.maxWalkTotal) problems.push(`walking ${Math.round(total)} m > ${rule.maxWalkTotal} m`)
  for (const seg of route.segments) {
    if (seg.mode === "bus") {
      if (rule.bus === "never") problems.push("contains a bus")
      else if (rule.bus === "lowCrowd" && legs.find((l) => l.segmentId === seg.id)?.level !== "LOW") problems.push("bus that is not LOW crowd")
    }
    if (!rule.highMetro && seg.mode === "metro" && legs.find((l) => l.segmentId === seg.id)?.level === "HIGH") problems.push("HIGH-crowd metro leg")
  }
  return problems
}

export interface Cell {
  profile: string; trip: string; time: string
  outcome: "served" | "no_route" | "error"
  routes: number; excluded: number
  best?: { summary: string; modes: string[]; walkTotal: number; walkLongest: number; crowd?: string; durationMin: number; fare: number }
  violations: string[]
  message?: string
}

function summarise(route: MultimodalRoute & { crowd?: { level?: string } }) {
  const walks = route.segments.filter((s) => s.mode === "walking")
  return {
    summary: route.summary,
    modes: route.segments.map((s) => s.mode),
    walkTotal: Math.round(walks.reduce((n, s) => n + s.distanceMeters, 0)),
    walkLongest: Math.round(walks.reduce((n, s) => Math.max(n, s.distanceMeters), 0)),
    crowd: route.crowd?.level,
    durationMin: Math.round(route.totalDurationSeconds / 60),
    fare: route.totalFare,
  }
}

async function main() {
  const cells: Cell[] = []
  for (const profile of PROFILES) {
    for (const trip of TRIPS) {
      for (const time of TIMES) {
        const cell: Cell = { profile, trip: trip.id, time: time.id, outcome: "served", routes: 0, excluded: 0, violations: [] }
        try {
          const plan = await planTrip({ origin: trip.from, destination: trip.to, profile, departureTime: time.at, weather: WEATHER })
          cell.routes = plan.rankedRoutes.length
          cell.excluded = plan.excludedRoutes.length
          const best = plan.rankedRoutes[0] as unknown as MultimodalRoute
          cell.best = summarise(best as never)
          // Every route shown (not only the best) must obey the rules and be a sound journey.
          cell.violations = []
          plan.rankedRoutes.forEach((route, index) => {
            const label = index === 0 ? "" : `option ${index + 1}: `
            for (const p of checkRoute(route as never, profile, time.at)) cell.violations.push(label + p)
            for (const p of checkIntegrity(route as unknown as MultimodalRoute, trip.from, trip.to)) cell.violations.push(label + p)
          })
          if (RULES[profile] && plan.rankedRoutes.length > 3) cell.violations.push(`${plan.rankedRoutes.length} routes returned (at most 3 for an accessibility profile)`)
          if (BAD_WEATHER) {
            // The weather rule holds for every route shown, not only the best one.
            for (const other of plan.rankedRoutes.slice(1)) {
              const longest = (other as unknown as MultimodalRoute).segments.filter((x) => x.mode === "walking").reduce((n, x) => Math.max(n, x.distanceMeters), 0)
              if (longest > 300) cell.violations.push(`another option has a ${Math.round(longest)} m walk`)
            }
            if (!plan.weather.bad) cell.violations.push("weather was not recognised as bad")
          }
        } catch (err) {
          if (err instanceof AppError) {
            cell.outcome = "no_route"
            cell.message = err.message
            const data = (err as unknown as { data?: { excludedRoutes?: unknown[] } }).data
            cell.excluded = data?.excludedRoutes?.length ?? 0
          } else {
            cell.outcome = "error"
            cell.message = String(err)
          }
        }
        cells.push(cell)
      }
    }
  }

  console.log("\nprofile            served  no-route  rule-breaking best route")
  let bad = 0
  for (const profile of PROFILES) {
    const rows = cells.filter((c) => c.profile === profile)
    const served = rows.filter((c) => c.outcome === "served").length
    const none = rows.filter((c) => c.outcome !== "served").length
    const broken = rows.filter((c) => c.violations.length > 0).length
    bad += none + broken
    console.log(`${profile.padEnd(18)} ${String(served).padStart(3)}/${rows.length}   ${String(none).padStart(5)}      ${String(broken).padStart(5)}`)
  }
  const out = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : undefined
  if (out) fs.writeFileSync(out, JSON.stringify(cells, null, 2), "utf8")
  console.log(`\n${cells.length} cases; ${bad} problems (trips with no answer + best routes that break a rule).`)
  process.exit(process.argv.includes("--baseline") ? 0 : bad > 0 ? 1 : 0)
}

main().catch((err) => { console.error(err); process.exit(1) })

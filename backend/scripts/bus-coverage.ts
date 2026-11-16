#!/usr/bin/env ts-node
// How often does a standard rider actually get a bus option? Runs the real planner (offline road
// model) over every pair of a set of Bengaluru places at two times and reports the share of trips with
// at least one bus-involving route, plus a few worked examples.
//
// Run: cd backend && npx ts-node --transpile-only scripts/bus-coverage.ts [--examples] [--profile senior]

// Offline and repeatable: fixed clear weather, no weather-service call.
process.env.WEATHER_SOURCE = process.env.WEATHER_SOURCE || "clear"

import { setMultimodalRoadLegProviderForTesting, type RoadLegProvider } from "../src/services/multimodalService"
import { planTrip } from "../src/services/tripPlanner"
import { BUS_STOPS, METRO_STATIONS } from "../src/data/transitData"
import type { MultimodalRoute } from "../src/types/multimodal"

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
const offline: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const d = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    return [{ distanceMeters: d, durationSeconds: d / (mode === "walking" ? 1.3 : 8), geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] } }] as never
  },
}
setMultimodalRoadLegProviderForTesting(offline)

// A spread of places: a bus stop or metro station near each corridor, offset ~150 m so they are not exactly on a stop.
const PLACES = [
  ...["b-03", "b-01", "b-15", "b-16", "b-13", "b-21", "b-20", "b-24", "b-34", "b-47", "b-40", "b-45", "b-42", "b-46", "b-32", "b-14", "b-35", "b-39", "b-49", "b-05"].map((id) => {
    const s = BUS_STOPS.find((x) => x.id === id)!
    return { name: s.name, latitude: s.latitude + 0.0012, longitude: s.longitude + 0.0012 }
  }),
  ...["pl-02", "gl-06", "gl-13", "yl-03"].map((id) => {
    const s = METRO_STATIONS.find((x) => x.id === id)!
    return { name: s.name, latitude: s.latitude + 0.0012, longitude: s.longitude - 0.0012 }
  }),
]

const hasBus = (r: MultimodalRoute) => r.segments.some((s) => s.mode === "bus")

async function main() {
  const examples = process.argv.includes("--examples")
  const profileArg = process.argv.indexOf("--profile")
  const profile = (profileArg >= 0 ? process.argv[profileArg + 1] : "standard") as "standard"
  const times = ["2026-11-16T08:30", "2026-11-16T14:30", "2026-11-16T22:00"]
  let trips = 0, withBus = 0, noRoute = 0, busFirst = 0
  const shown = new Set<string>()
  for (const when of times) {
    for (const from of PLACES) {
      for (const to of PLACES) {
        if (from === to) continue
        if (haversine(from.latitude, from.longitude, to.latitude, to.longitude) < 1500) continue
        trips++
        try {
          const plan = await planTrip({ origin: from, destination: to, profile, departureTime: when })
          if (plan.rankedRoutes.some(hasBus)) withBus++
          if (hasBus(plan.rankedRoutes[0] as never)) busFirst++
          if (examples && plan.rankedRoutes.some(hasBus) && shown.size < 6 && !shown.has(from.name)) {
            shown.add(from.name)
            const r = plan.rankedRoutes.find(hasBus)!
            console.log(`\n${from.name} -> ${to.name} @ ${when.slice(11)}: ${r.summary}`)
            for (const seg of r.segments.filter((s) => s.mode === "bus")) {
              const d = seg.transitDetails!
              console.log(`   Bus ${d.routeNumber} towards ${d.towards}: board ${seg.from.name} ~${d.estimatedBoardingTime} (next ${d.upcomingBoardingTimes?.join(", ")}), ${d.stopCount} stops, get off ${seg.to.name} ~${d.estimatedArrivalTime}, every ${d.headwayMinutes} min`)
            }
          }
        } catch {
          noRoute++
        }
      }
    }
  }
  console.log(`\n${trips} trips (${profile} profile, ${times.length} times): ${withBus} (${Math.round((100 * withBus) / trips)}%) offered at least one bus option; a bus option is first in ${busFirst}; no route at all in ${noRoute}.`)
}
main().catch((e) => { console.error(e); process.exit(1) })

#!/usr/bin/env ts-node
// Pre-computes the 22-scenario route-ranking benchmark (evaluationService.runEvaluation)
// with the deterministic offline road model and writes it to the frontend, so the
// Research page can show it instantly instead of running it live on a small server
// (where it used to time out after a cold start).
//
// Re-run whenever routing, ranking or crowd data change:
//   cd backend && npx ts-node --transpile-only scripts/generate-benchmark-snapshot.ts
// Output: src/data/benchmarkSnapshot.json (repo root)

import fs from "fs"
import path from "path"
import { setMultimodalRoadLegProviderForTesting, type RoadLegProvider } from "../src/services/multimodalService"
import { evaluationService } from "../src/services/evaluationService"

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const offlineProvider: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const distanceMeters = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    const speedMps = mode === "walking" ? 1.3 : mode === "cycling" ? 4 : 8
    return [{
      distanceMeters,
      durationSeconds: distanceMeters / speedMps,
      geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] },
    }]
  },
}

async function main() {
  setMultimodalRoadLegProviderForTesting(offlineProvider)
  const result = await evaluationService.runEvaluation()
  const out = path.resolve(__dirname, "../../src/data/benchmarkSnapshot.json")
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", "utf8")
  console.log("Wrote", out)
  console.log("scenarios:", result.totalScenariosEvaluated, "| agreement with fastest:", result.agreementRateWithShortestTimePercent + "%")
}

main().catch((err) => { console.error(err); process.exit(1) })

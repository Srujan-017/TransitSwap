import type { CrowdLevel } from "../types/intelligence"
import { METRO_STATIONS, BUS_STOPS, BUS_ROUTES } from "./transitData"

export interface DemoCrowdRecord {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  dayType: "weekday" | "weekend"
  timeSlot: string
  crowdLevel: CrowdLevel
}

// ── What this data is ────────────────────────────────────────────────────────
// SYNTHETIC. No station was counted. Real crowd signal comes from authenticated
// user reports (CrowdReport), which are blended in on top of this baseline.
//
// Before the feature-upgrade (phase 2) the table held just 16 spot readings for
// 14 of the 65 stations, one or two hours each, so almost every search ended in
// "crowd unavailable". It is now a complete hourly profile: every metro station
// and bus stop, weekday and weekend, all 24 hours.
//
// How a reading is produced (deterministic — the same input always gives the
// same level, so tests and demos are repeatable):
//   1. each station/stop has a TYPE (interchange, city centre, IT corridor,
//      residential) — assigned explicitly below so it can be audited;
//   2. each type has a typical load curve (0..1) per hour for weekdays and weekends:
//      commuter peaks around 08-10 and 17-20, quieter midday, near-empty at night;
//      city-centre and interchange stations stay busy on weekend afternoons, IT
//      corridors empty out at weekends;
//   3. a small stable per-station/hour offset (+-0.04) stops every station of a
//      type from showing identical levels;
//   4. the original spot readings are kept as fixed anchors at their hour.
// Load -> level: below 0.40 LOW, below 0.74 MEDIUM, otherwise HIGH.

export const LOW_BELOW = 0.4
export const HIGH_FROM = 0.74

export type StationType = "interchange" | "cbd" | "it" | "residential"
type DayType = "weekday" | "weekend"

// Original spot readings (Phase 5 Bengaluru migration). Kept verbatim: they are
// the anchors the generated profile must agree with, and the sparse table the
// crowd time-slot matching rule (nearest reading within 2 h) was written for.
export const LEGACY_CROWD_DATA: DemoCrowdRecord[] = [
  { stationId: "pl-08", stationName: "MG Road Metro", transportMode: "metro", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "pl-08", stationName: "MG Road Metro", transportMode: "metro", dayType: "weekday", timeSlot: "14:00", crowdLevel: "MEDIUM" },
  { stationId: "pl-14", stationName: "Magadi Road Metro", transportMode: "metro", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "pl-14", stationName: "Magadi Road Metro", transportMode: "metro", dayType: "weekday", timeSlot: "20:00", crowdLevel: "MEDIUM" },
  { stationId: "pl-12", stationName: "Majestic Metro", transportMode: "metro", dayType: "weekday", timeSlot: "09:00", crowdLevel: "HIGH" },
  { stationId: "pl-11", stationName: "Sir M Visvesvaraya Station Metro", transportMode: "metro", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
  { stationId: "gl-04", stationName: "Jalahalli Metro", transportMode: "metro", dayType: "weekday", timeSlot: "09:00", crowdLevel: "MEDIUM" },
  { stationId: "gl-14", stationName: "RV Road Metro", transportMode: "metro", dayType: "weekday", timeSlot: "09:00", crowdLevel: "MEDIUM" },
  { stationId: "yl-02", stationName: "Silk Board Metro", transportMode: "metro", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
  { stationId: "yl-08", stationName: "Electronic City Metro", transportMode: "metro", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
  { stationId: "b-01", stationName: "Shivajinagar Bus Stand", transportMode: "bus", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "b-03", stationName: "Kempegowda Bus Station", transportMode: "bus", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
  { stationId: "b-05", stationName: "Koramangala Bus Stop", transportMode: "bus", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "b-06", stationName: "Domlur Bus Stop", transportMode: "bus", dayType: "weekday", timeSlot: "14:00", crowdLevel: "MEDIUM" },
  { stationId: "b-10", stationName: "Malleshwaram Bus Stop", transportMode: "bus", dayType: "weekend", timeSlot: "12:00", crowdLevel: "LOW" },
  { stationId: "b-21", stationName: "Silk Board Bus Stop", transportMode: "bus", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
]

// Station types. Anything not listed is residential.
const TYPE_BY_ID: Record<string, StationType> = {
  // interchanges and the two big bus terminals
  "pl-12": "interchange", "gl-14": "interchange", "b-03": "interchange", "b-01": "interchange",
  // city centre / commercial core
  "pl-05": "cbd", "pl-06": "cbd", "pl-07": "cbd", "pl-08": "cbd", "pl-09": "cbd", "pl-10": "cbd", "pl-11": "cbd", "pl-13": "cbd",
  "gl-10": "cbd", "gl-11": "cbd", "b-02": "cbd", "b-04": "cbd", "b-14": "cbd",
  // IT / office corridors (Whitefield, Outer Ring Road, Hosur Road, Electronic City)
  "pl-01": "it", "pl-02": "it", "pl-03": "it", "yl-02": "it", "yl-03": "it", "yl-04": "it", "yl-05": "it", "yl-06": "it",
  "yl-07": "it", "yl-08": "it", "yl-09": "it", "yl-10": "it",
  "b-05": "it", "b-06": "it", "b-13": "it", "b-16": "it", "b-19": "it", "b-20": "it", "b-21": "it", "b-24": "it",
}

export function stationTypeOf(stationId: string): StationType {
  return TYPE_BY_ID[stationId] ?? "residential"
}

// Load curves, index = hour of day 0..23.
const CURVES: Record<StationType, Record<DayType, number[]>> = {
  cbd: {
    weekday: [0.05, 0.05, 0.05, 0.05, 0.05, 0.15, 0.3, 0.55, 0.85, 0.9, 0.65, 0.5, 0.5, 0.5, 0.45, 0.5, 0.6, 0.8, 0.92, 0.85, 0.6, 0.4, 0.25, 0.1],
    weekend: [0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.1, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.65, 0.62, 0.65, 0.72, 0.78, 0.82, 0.8, 0.68, 0.5, 0.3, 0.12],
  },
  interchange: {
    weekday: [0.06, 0.06, 0.06, 0.06, 0.06, 0.25, 0.45, 0.7, 0.93, 0.97, 0.78, 0.62, 0.62, 0.6, 0.55, 0.6, 0.72, 0.9, 0.97, 0.9, 0.72, 0.5, 0.3, 0.12],
    weekend: [0.06, 0.06, 0.06, 0.06, 0.06, 0.15, 0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.68, 0.66, 0.62, 0.64, 0.7, 0.74, 0.76, 0.72, 0.6, 0.45, 0.28, 0.1],
  },
  it: {
    weekday: [0.04, 0.04, 0.04, 0.04, 0.04, 0.1, 0.25, 0.5, 0.8, 0.85, 0.6, 0.35, 0.35, 0.35, 0.3, 0.35, 0.5, 0.78, 0.92, 0.88, 0.6, 0.35, 0.2, 0.08],
    weekend: [0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.12, 0.15, 0.2, 0.25, 0.3, 0.32, 0.32, 0.3, 0.3, 0.32, 0.35, 0.35, 0.3, 0.22, 0.15, 0.08, 0.04],
  },
  residential: {
    weekday: [0.03, 0.03, 0.03, 0.03, 0.03, 0.1, 0.3, 0.55, 0.68, 0.66, 0.45, 0.3, 0.3, 0.3, 0.28, 0.32, 0.45, 0.62, 0.68, 0.65, 0.45, 0.3, 0.15, 0.06],
    weekend: [0.03, 0.03, 0.03, 0.03, 0.03, 0.06, 0.12, 0.2, 0.3, 0.38, 0.42, 0.45, 0.45, 0.42, 0.4, 0.4, 0.42, 0.45, 0.45, 0.4, 0.3, 0.2, 0.1, 0.05],
  },
}

// 32-bit FNV-1a, mapped to [-1, 1].
function stableUnit(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1
}

export function levelFromLoad(load: number): CrowdLevel {
  if (load < LOW_BELOW) return "LOW"
  if (load < HIGH_FROM) return "MEDIUM"
  return "HIGH"
}

/** Load (0..1) of one station/stop at an hour of day, before the fixed anchors are applied. */
export function stationLoad(stationId: string, dayType: DayType, hour: number): number {
  const base = CURVES[stationTypeOf(stationId)][dayType][hour]
  return Math.max(0, Math.min(1, base + stableUnit(`${stationId}|${dayType}|${hour}`) * 0.04))
}

function legacyAnchor(stationId: string, dayType: DayType, hour: number): CrowdLevel | undefined {
  const slot = `${String(hour).padStart(2, "0")}:00`
  return LEGACY_CROWD_DATA.find((r) => r.stationId === stationId && r.dayType === dayType && r.timeSlot === slot)?.crowdLevel
}

function buildDemoCrowdData(): DemoCrowdRecord[] {
  const records: DemoCrowdRecord[] = []
  const places = [
    ...METRO_STATIONS.map((s) => ({ id: s.id, name: s.name, mode: "metro" as const })),
    ...BUS_STOPS.map((s) => ({ id: s.id, name: s.name, mode: "bus" as const })),
  ]
  for (const place of places) {
    for (const dayType of ["weekday", "weekend"] as const) {
      for (let hour = 0; hour < 24; hour++) {
        records.push({
          stationId: place.id,
          stationName: place.name,
          transportMode: place.mode,
          dayType,
          timeSlot: `${String(hour).padStart(2, "0")}:00`,
          crowdLevel: legacyAnchor(place.id, dayType, hour) ?? levelFromLoad(stationLoad(place.id, dayType, hour)),
        })
      }
    }
  }
  return records
}

export const DEMO_CROWD_DATA: DemoCrowdRecord[] = buildDemoCrowdData()

/**
 * Crowd on board a bus route at an hour, modelled per ROUTE (bus number) and hour, not
 * just per stop: the mean load of the stops it serves, +0.05 because buses carry
 * standing passengers and run slower in traffic at peak, plus a stable +-0.05 offset
 * per route so routes on the same corridor are not identical.
 */
export function busRouteLoad(routeId: string, dayType: DayType, hour: number): number {
  const route = BUS_ROUTES.find((r) => r.id === routeId)
  if (!route || route.stops.length === 0) return 0
  const mean = route.stops.reduce((sum, stopId) => sum + stationLoad(stopId, dayType, hour), 0) / route.stops.length
  return Math.max(0, Math.min(1, mean + 0.05 + stableUnit(`route|${routeId}|${dayType}|${hour}`) * 0.05))
}

export function busRouteCrowdLevel(routeId: string, dayType: DayType, hour: number): CrowdLevel | undefined {
  if (!BUS_ROUTES.some((r) => r.id === routeId)) return undefined
  return levelFromLoad(busRouteLoad(routeId, dayType, hour))
}

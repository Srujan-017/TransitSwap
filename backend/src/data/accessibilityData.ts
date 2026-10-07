import { METRO_STATIONS, BUS_STOPS } from "./transitData"
import type { AccessibilityRecord, AccessibilityStatus } from "../types/intelligence"

/**
 * Synthetic Demo Accessibility Dataset — TransitSwap Problem 4 / Phase 5
 *
 * IMPORTANT: This is a SYNTHETIC PROTOTYPE DATASET for demonstration purposes.
 * No station was physically surveyed. The schema and service architecture are
 * designed so that real field-surveyed or authoritative accessibility data can
 * replace this synthetic dataset without changing the core routing engine.
 *
 * Each record uses verificationSource = "synthetic_demo" to clearly indicate
 * that this data is not from a real-world survey or transit authority.
 *
 * Phase 5 — migrated from the original Mumbai seed to Bengaluru and expanded
 * to cover EVERY metro station and bus stop in transitData.ts (41 + 24 = 65
 * records, was 19 + 6 of 12 bus stops = 25). This closes the data gap at the
 * source that Phase 4's B5 fix only handled at runtime (an unmatched station
 * is now impossible by construction, not just safely handled when it
 * happens) — see accessibilityService.ts's unrecordedStationPlaceholder()
 * for the runtime fallback this dataset should never need to trigger.
 */

function metroRecord(
  stationId: string,
  overrides: Partial<AccessibilityRecord> = {},
): AccessibilityRecord {
  const station = METRO_STATIONS.find((s) => s.id === stationId)
  if (!station) throw new Error(`Missing metro station ${stationId}`)
  const status: AccessibilityStatus = overrides.status ?? "accessible"
  return {
    stationId: station.id,
    stationName: station.name,
    transportMode: "metro",
    latitude: station.latitude,
    longitude: station.longitude,
    hasLift: true,
    hasRamp: true,
    hasEscalator: true,
    stairCount: 0,
    tactilePaving: true,
    accessibleToilet: false,
    wheelchairAccessible: status === "accessible",
    stepFreeEntrance: true,
    stepFreePlatform: true,
    lastVerified: "2026-07-15",
    verificationSource: "synthetic_demo",
    status,
    notes: "Synthetic prototype accessibility record.",
    ...overrides,
  }
}

function busRecord(
  stationId: string,
  overrides: Partial<AccessibilityRecord> = {},
): AccessibilityRecord {
  const stop = BUS_STOPS.find((s) => s.id === stationId)
  if (!stop) throw new Error(`Missing bus stop ${stationId}`)
  const status: AccessibilityStatus = overrides.status ?? "partially_accessible"
  return {
    stationId: stop.id,
    stationName: stop.name,
    transportMode: "bus",
    latitude: stop.latitude,
    longitude: stop.longitude,
    hasLift: null,
    hasRamp: true,
    hasEscalator: null,
    stairCount: 0,
    tactilePaving: false,
    accessibleToilet: false,
    wheelchairAccessible: status !== "not_accessible",
    stepFreeEntrance: true,
    stepFreePlatform: null,
    lastVerified: "2026-07-15",
    verificationSource: "synthetic_demo",
    status,
    notes: "Synthetic prototype accessibility record for bus stop.",
    ...overrides,
  }
}

/**
 * DEMO_ACCESSIBILITY_DATA — 65 synthetic station/stop records (41 metro + 24
 * bus), every one of transitData.ts's stations/stops, with deliberate
 * variety:
 *
 * - Fully accessible stations (lift + ramp + step-free + tactile paving)
 * - Partially accessible stations (missing lift OR ramp OR escalator)
 * - Not accessible stations (high stair count, no lift, no ramp, no step-free)
 * - Unknown status stations (data genuinely unavailable — still a record,
 *   distinct from a station having NO record at all)
 */
export const DEMO_ACCESSIBILITY_DATA: AccessibilityRecord[] = [
  // ── Purple Line ─────────────────────────────────────────────────────────

  metroRecord("pl-01", { accessibleToilet: true, notes: "Whitefield Metro — eastern terminus, fully accessible with accessible toilet." }),
  metroRecord("pl-02", { notes: "Hoodi Metro — fully accessible." }),
  metroRecord("pl-03", { accessibleToilet: true, notes: "Baiyappanahalli Metro — fully accessible with accessible toilet." }),

  // Partially accessible — lift status unknown
  metroRecord("pl-04", {
    status: "partially_accessible",
    hasLift: null,
    wheelchairAccessible: null,
    stepFreeEntrance: true,
    stepFreePlatform: null,
    notes: "Swami Vivekananda Road Metro — lift availability unverified in demo dataset.",
  }),

  metroRecord("pl-05", {
    status: "partially_accessible",
    accessibleToilet: null,
    notes: "Indiranagar Metro — accessible toilet status unverified.",
  }),

  metroRecord("pl-06", { notes: "Halasuru Metro — fully accessible." }),

  // NOT accessible — high stair count, no lift, no ramp, no step-free
  metroRecord("pl-07", {
    status: "not_accessible",
    hasLift: false,
    hasRamp: false,
    stairCount: 38,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    stepFreePlatform: false,
    tactilePaving: false,
    notes: "Trinity Metro — 38 stairs, no lift, no ramp. Not accessible for wheelchair/stroller users.",
  }),

  metroRecord("pl-08", { accessibleToilet: true, notes: "MG Road Metro — fully accessible with accessible toilet." }),
  metroRecord("pl-09", { notes: "Cubbon Park Metro — fully accessible." }),

  // Partially accessible — ramp status unknown
  metroRecord("pl-10", {
    status: "partially_accessible",
    hasRamp: null,
    wheelchairAccessible: null,
    stepFreePlatform: null,
    notes: "Vidhana Soudha Metro — ramp availability unverified.",
  }),

  metroRecord("pl-11", { accessibleToilet: true, notes: "Sir M Visvesvaraya Station Metro — fully accessible with accessible toilet." }),
  metroRecord("pl-12", { accessibleToilet: true, notes: "Majestic Metro — interchange with Green Line, fully accessible." }),

  // NOT accessible — high stair count, no lift
  metroRecord("pl-13", {
    status: "not_accessible",
    hasLift: false,
    hasRamp: false,
    stairCount: 44,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    stepFreePlatform: false,
    notes: "City Railway Station Metro — 44 stairs, no lift, no ramp. Not wheelchair accessible.",
  }),

  metroRecord("pl-14", { accessibleToilet: true, notes: "Magadi Road Metro — fully accessible with accessible toilet." }),
  metroRecord("pl-15", { notes: "Vijayanagar Metro — fully accessible." }),
  metroRecord("pl-16", {
    status: "partially_accessible",
    hasEscalator: null,
    notes: "Nayandahalli Metro — escalator availability unverified.",
  }),
  metroRecord("pl-17", { accessibleToilet: true, notes: "Mysuru Road Metro — western terminus of this seed, fully accessible with accessible toilet." }),

  // ── Green Line ──────────────────────────────────────────────────────────

  metroRecord("gl-01", { notes: "Madavara Metro — northern terminus of this seed, fully accessible." }),
  metroRecord("gl-02", { accessibleToilet: true, notes: "Nagasandra Metro — fully accessible with accessible toilet." }),
  metroRecord("gl-03", { notes: "Dasarahalli Metro — fully accessible." }),
  metroRecord("gl-04", { accessibleToilet: true, notes: "Jalahalli Metro — fully accessible with accessible toilet." }),

  // Unknown status — no demo data available
  metroRecord("gl-05", {
    status: "unknown",
    hasLift: null,
    hasRamp: null,
    hasEscalator: null,
    stairCount: null,
    wheelchairAccessible: null,
    stepFreeEntrance: null,
    stepFreePlatform: null,
    tactilePaving: null,
    notes: "Peenya Metro — accessibility data unavailable in demo dataset.",
  }),

  metroRecord("gl-06", { notes: "Yeshwanthpur Metro — fully accessible." }),

  // Partially accessible — tactile paving unavailable
  metroRecord("gl-07", {
    status: "partially_accessible",
    tactilePaving: null,
    notes: "Mahalakshmi Metro — tactile paving status unverified.",
  }),

  metroRecord("gl-08", { notes: "Rajajinagar Metro — fully accessible." }),
  metroRecord("gl-09", { accessibleToilet: true, notes: "Srirampura Metro — fully accessible with accessible toilet." }),
  metroRecord("gl-10", { notes: "Chickpete Metro — fully accessible." }),
  metroRecord("gl-11", {
    status: "partially_accessible",
    hasLift: null,
    notes: "KR Market Metro — lift availability unverified.",
  }),
  metroRecord("gl-12", { notes: "Lalbagh Metro — fully accessible." }),
  metroRecord("gl-13", { accessibleToilet: true, notes: "Jayanagar Metro — fully accessible with accessible toilet." }),
  metroRecord("gl-14", { accessibleToilet: true, notes: "RV Road Metro — interchange with Yellow Line, fully accessible." }),

  // ── Yellow Line ─────────────────────────────────────────────────────────

  metroRecord("yl-01", { notes: "Jayadeva Hospital Metro — fully accessible." }),
  metroRecord("yl-02", { accessibleToilet: true, notes: "Silk Board Metro — fully accessible with accessible toilet." }),
  metroRecord("yl-03", {
    status: "partially_accessible",
    hasRamp: null,
    notes: "Bommanahalli Metro — ramp availability unverified.",
  }),
  metroRecord("yl-04", { notes: "Hongasandra Metro — fully accessible." }),
  metroRecord("yl-05", { notes: "Kudlu Gate Metro — fully accessible." }),

  // NOT accessible — high stair count, no lift
  metroRecord("yl-06", {
    status: "not_accessible",
    hasLift: false,
    hasRamp: false,
    stairCount: 30,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    stepFreePlatform: false,
    notes: "Singasandra Metro — 30 stairs, no lift, no ramp. Not wheelchair accessible.",
  }),

  metroRecord("yl-07", { notes: "Hosa Road Metro — fully accessible." }),
  metroRecord("yl-08", { accessibleToilet: true, notes: "Electronic City Metro — fully accessible with accessible toilet." }),
  metroRecord("yl-09", {
    status: "partially_accessible",
    accessibleToilet: null,
    notes: "Huskur Road Metro — accessible toilet status unverified.",
  }),
  metroRecord("yl-10", { accessibleToilet: true, notes: "Bommasandra Metro — southern terminus, fully accessible with accessible toilet." }),

  // ── Bus Stops ───────────────────────────────────────────────────────────

  busRecord("b-01", { notes: "Shivajinagar Bus Stand — ramp available, partially accessible." }),
  busRecord("b-02", { notes: "Cubbon Park Bus Stop — ramp available, partially accessible." }),

  // NOT accessible bus stop — no ramp, stairs
  busRecord("b-03", {
    status: "not_accessible",
    hasRamp: false,
    stairCount: 12,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    notes: "Kempegowda Bus Station — 12 stairs, no ramp. Not wheelchair accessible.",
  }),

  busRecord("b-04", { notes: "Shantinagar Bus Stop — ramp available, partially accessible." }),
  busRecord("b-05", { notes: "Koramangala Bus Stop — ramp available, partially accessible." }),

  // Unknown status bus stop
  busRecord("b-06", {
    status: "unknown",
    hasRamp: null,
    stairCount: null,
    wheelchairAccessible: null,
    stepFreeEntrance: null,
    notes: "Domlur Bus Stop — accessibility data unavailable in demo dataset.",
  }),

  busRecord("b-07", { notes: "Yeshwanthpur Bus Stand — ramp available, partially accessible." }),

  // NOT accessible bus stop
  busRecord("b-08", {
    status: "not_accessible",
    hasRamp: false,
    stairCount: 8,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    notes: "Peenya Bus Stop — 8 stairs, no ramp. Not wheelchair accessible.",
  }),

  busRecord("b-09", { notes: "Rajajinagar Bus Stop — ramp available, partially accessible." }),
  busRecord("b-10", { notes: "Malleshwaram Bus Stop — ramp available, partially accessible." }),
  busRecord("b-11", { notes: "Jayanagar Bus Stop — ramp available, partially accessible." }),
  busRecord("b-12", { notes: "Jayanagar 4th Block Bus Stop — ramp available, partially accessible." }),
  busRecord("b-13", { notes: "Marathahalli Bus Stop — ramp available, partially accessible." }),

  // Unknown status bus stop
  busRecord("b-14", {
    status: "unknown",
    hasRamp: null,
    stairCount: null,
    wheelchairAccessible: null,
    stepFreeEntrance: null,
    notes: "Indiranagar 100ft Rd Bus Stop — accessibility data unavailable in demo dataset.",
  }),

  busRecord("b-15", { notes: "Hebbal Bus Stop — ramp available, partially accessible." }),

  // NOT accessible bus stop
  busRecord("b-16", {
    status: "not_accessible",
    hasRamp: false,
    stairCount: 6,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    notes: "KR Puram Bus Stop — 6 stairs, no ramp. Not wheelchair accessible.",
  }),

  busRecord("b-17", { notes: "Banashankari Bus Stand — ramp available, partially accessible." }),
  busRecord("b-18", { notes: "Basavanagudi Bus Stop — ramp available, partially accessible." }),
  busRecord("b-19", { notes: "HSR Layout Bus Stop — ramp available, partially accessible." }),
  busRecord("b-20", { notes: "Electronic City Bus Stop — ramp available, partially accessible." }),
  busRecord("b-21", { notes: "Silk Board Bus Stop — ramp available, partially accessible." }),
  busRecord("b-22", { notes: "Vijayanagar Bus Stop — ramp available, partially accessible." }),
  busRecord("b-23", { notes: "Mysuru Road Bus Stop — ramp available, partially accessible." }),
  busRecord("b-24", { notes: "Whitefield Bus Stop — ramp available, partially accessible." }),
]

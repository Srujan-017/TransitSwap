import { METRO_STATIONS, BUS_STOPS } from "./transitData"
import type { AccessibilityRecord, AccessibilityStatus } from "../types/intelligence"

/**
 * Synthetic Demo Accessibility Dataset — TransitSwap Problem 4
 *
 * IMPORTANT: This is a SYNTHETIC PROTOTYPE DATASET for demonstration purposes.
 * No stations were physically surveyed. The schema and service architecture are
 * designed so that real field-surveyed or authoritative accessibility data can
 * replace this synthetic dataset without changing the core routing engine.
 *
 * Each record uses verificationSource = "synthetic_demo" to clearly indicate
 * that this data is not from a real-world survey or transit authority.
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
 * DEMO_ACCESSIBILITY_DATA — 25 synthetic station/stop records with deliberate variety:
 *
 * - Fully accessible stations (lift + ramp + step-free + tactile paving)
 * - Partially accessible stations (missing lift OR ramp OR escalator)
 * - Not accessible stations (high stair count, no lift, no ramp, no step-free)
 * - Unknown status stations (data unavailable)
 *
 * This allows the demo to visibly demonstrate:
 * - Wheelchair hard-constraint filtering
 * - Stroller/senior/pregnancy/luggage soft-preference ranking
 * - Accessibility score calculation
 * - Accessibility warnings and rejection explanations
 */
export const DEMO_ACCESSIBILITY_DATA: AccessibilityRecord[] = [
  // ── Metro Line 1 (Versova–Ghatkopar) ──────────────────────────────────────

  // Fully accessible metro stations
  metroRecord("m1-01", {
    accessibleToilet: true,
    notes: "Versova Metro — fully accessible with lift, ramp, escalator, accessible toilet.",
  }),
  metroRecord("m1-02", {
    accessibleToilet: true,
    notes: "D.N. Nagar Metro — interchange station, fully accessible.",
  }),

  // Partially accessible — lift status unknown
  metroRecord("m1-03", {
    status: "partially_accessible",
    hasLift: null,
    wheelchairAccessible: null,
    stepFreeEntrance: true,
    stepFreePlatform: null,
    notes: "Azad Nagar Metro — lift availability unverified in demo dataset.",
  }),

  metroRecord("m1-04", {
    accessibleToilet: true,
    notes: "Andheri Metro — fully accessible with accessible toilet.",
  }),

  // NOT accessible — high stair count, no lift, no ramp, no step-free
  metroRecord("m1-05", {
    status: "not_accessible",
    hasLift: false,
    hasRamp: false,
    stairCount: 38,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    stepFreePlatform: false,
    tactilePaving: false,
    notes: "WEH Metro — 38 stairs, no lift, no ramp. Not accessible for wheelchair/stroller users.",
  }),

  metroRecord("m1-06", {
    notes: "Chakala Metro — fully accessible.",
  }),

  // Partially accessible — ramp status unknown
  metroRecord("m1-07", {
    status: "partially_accessible",
    hasRamp: null,
    wheelchairAccessible: null,
    stepFreePlatform: null,
    notes: "Airport Road Metro — ramp availability unverified.",
  }),

  metroRecord("m1-08", {
    accessibleToilet: true,
    notes: "Marol Naka Metro — fully accessible with accessible toilet.",
  }),

  // NOT accessible — high stair count, no lift
  metroRecord("m1-09", {
    status: "not_accessible",
    hasLift: false,
    hasRamp: false,
    stairCount: 44,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    stepFreePlatform: false,
    notes: "Saki Naka Metro — 44 stairs, no lift, no ramp. Not wheelchair accessible.",
  }),

  metroRecord("m1-10", {
    notes: "Asalpha Metro — fully accessible.",
  }),

  // Partially accessible — toilet status unknown
  metroRecord("m1-11", {
    status: "partially_accessible",
    accessibleToilet: null,
    notes: "Jagruti Nagar Metro — accessible toilet status unverified.",
  }),

  metroRecord("m1-12", {
    accessibleToilet: true,
    notes: "Ghatkopar Metro — fully accessible with accessible toilet.",
  }),

  // ── Metro Line 2A (Dahisar–D.N.Nagar) ──────────────────────────────────────

  metroRecord("m2a-01", {
    accessibleToilet: true,
    notes: "Dahisar East Metro — fully accessible with accessible toilet.",
  }),

  metroRecord("m2a-02", {
    notes: "Anand Nagar Metro — fully accessible.",
  }),

  metroRecord("m2a-03", {
    accessibleToilet: true,
    notes: "Kandivali East Metro — fully accessible with accessible toilet.",
  }),

  // Unknown status — no demo data available
  metroRecord("m2a-04", {
    status: "unknown",
    hasLift: null,
    hasRamp: null,
    hasEscalator: null,
    stairCount: null,
    wheelchairAccessible: null,
    stepFreeEntrance: null,
    stepFreePlatform: null,
    tactilePaving: null,
    notes: "Pahadi Goregaon Metro — accessibility data unavailable in demo dataset.",
  }),

  metroRecord("m2a-05", {
    notes: "Goregaon East Metro — fully accessible.",
  }),

  // Partially accessible — tactile paving unavailable
  metroRecord("m2a-06", {
    status: "partially_accessible",
    tactilePaving: null,
    notes: "Aarey Colony Metro — tactile paving status unverified.",
  }),

  metroRecord("m2a-07", {
    notes: "SEEPZ Metro — fully accessible.",
  }),

  // ── Bus Stops ──────────────────────────────────────────────────────────────

  busRecord("b-01", {
    notes: "Andheri Station (W) bus stop — ramp available, partially accessible.",
  }),

  // NOT accessible bus stop — no ramp, stairs
  busRecord("b-03", {
    status: "not_accessible",
    hasRamp: false,
    stairCount: 12,
    wheelchairAccessible: false,
    stepFreeEntrance: false,
    notes: "Bandra Station (W) bus stop — 12 stairs, no ramp. Not wheelchair accessible.",
  }),

  busRecord("b-05", {
    notes: "Ghatkopar Station bus stop — ramp available, partially accessible.",
  }),

  // Unknown status bus stop
  busRecord("b-06", {
    status: "unknown",
    hasRamp: null,
    stairCount: null,
    wheelchairAccessible: null,
    stepFreeEntrance: null,
    notes: "Kurla Station bus stop — accessibility data unavailable in demo dataset.",
  }),

  busRecord("b-10", {
    notes: "Goregaon Station bus stop — ramp available, partially accessible.",
  }),

  busRecord("b-12", {
    notes: "Chakala Junction bus stop — ramp available, partially accessible.",
  }),
]

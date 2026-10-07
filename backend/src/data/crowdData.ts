import type { CrowdLevel } from "../types/intelligence"

export interface DemoCrowdRecord {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  dayType: "weekday" | "weekend"
  timeSlot: string
  crowdLevel: CrowdLevel
}

// Phase 5 — migrated from the original Mumbai seed to Bengaluru's Namma
// Metro / BMTC network (see transitData.ts). Synthetic demo baseline only;
// real crowd signal comes from authenticated user reports (CrowdReport).
export const DEMO_CROWD_DATA: DemoCrowdRecord[] = [
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

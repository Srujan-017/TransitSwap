import type { CrowdLevel } from "../types/intelligence"

export interface DemoCrowdRecord {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  dayType: "weekday" | "weekend"
  timeSlot: string
  crowdLevel: CrowdLevel
}

export const DEMO_CROWD_DATA: DemoCrowdRecord[] = [
  { stationId: "m1-04", stationName: "Andheri Metro", transportMode: "metro", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "m1-04", stationName: "Andheri Metro", transportMode: "metro", dayType: "weekday", timeSlot: "14:00", crowdLevel: "MEDIUM" },
  { stationId: "m1-12", stationName: "Ghatkopar Metro", transportMode: "metro", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "m1-12", stationName: "Ghatkopar Metro", transportMode: "metro", dayType: "weekday", timeSlot: "20:00", crowdLevel: "MEDIUM" },
  { stationId: "m1-02", stationName: "D.N. Nagar Metro", transportMode: "metro", dayType: "weekday", timeSlot: "09:00", crowdLevel: "MEDIUM" },
  { stationId: "m1-08", stationName: "Marol Naka Metro", transportMode: "metro", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
  { stationId: "m2a-03", stationName: "Kandivali East Metro", transportMode: "metro", dayType: "weekday", timeSlot: "09:00", crowdLevel: "MEDIUM" },
  { stationId: "b-01", stationName: "Andheri Station (W)", transportMode: "bus", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "b-03", stationName: "Bandra Station (W)", transportMode: "bus", dayType: "weekday", timeSlot: "18:00", crowdLevel: "HIGH" },
  { stationId: "b-05", stationName: "Ghatkopar Station", transportMode: "bus", dayType: "weekday", timeSlot: "08:00", crowdLevel: "HIGH" },
  { stationId: "b-06", stationName: "Kurla Station", transportMode: "bus", dayType: "weekday", timeSlot: "14:00", crowdLevel: "MEDIUM" },
  { stationId: "b-10", stationName: "Goregaon Station", transportMode: "bus", dayType: "weekend", timeSlot: "12:00", crowdLevel: "LOW" },
]

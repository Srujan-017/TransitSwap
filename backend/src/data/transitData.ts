// ── Demo Transit Dataset — TransitSwap Phase 3 ─────────────────────────────
// Source: Based on Mumbai Metro network and BEST bus network (approximate).
// Clearly labelled as DEMO / SEEDED data.
// Architecture is designed so this can be replaced by GTFS or a live transit API.

export interface MetroStation {
  id: string
  name: string
  latitude: number
  longitude: number
  line: string
  hasAutoHub: boolean
}

export interface MetroLine {
  id: string
  name: string
  color: string
  stations: string[] // ordered IDs
}

export interface BusStop {
  id: string
  name: string
  latitude: number
  longitude: number
  routes: string[]
}

export interface BusRoute {
  id: string
  name: string
  stops: string[] // ordered IDs
  frequencyMinutes: number
}

export interface FareConfig {
  metro: { basefare: number; perStation: number }
  bus: { basefare: number; perKm: number }
  auto: { basefare: number; perKm: number }
  walking: number
}

// ── Metro stations ────────────────────────────────────────────────────────────

export const METRO_STATIONS: MetroStation[] = [
  // Line 1 (Blue) — Versova ↔ Ghatkopar
  { id: "m1-01", name: "Versova Metro",       latitude: 19.1300, longitude: 72.8161, line: "L1", hasAutoHub: true  },
  { id: "m1-02", name: "D.N. Nagar Metro",    latitude: 19.1247, longitude: 72.8256, line: "L1", hasAutoHub: false },
  { id: "m1-03", name: "Azad Nagar Metro",    latitude: 19.1209, longitude: 72.8340, line: "L1", hasAutoHub: false },
  { id: "m1-04", name: "Andheri Metro",       latitude: 19.1197, longitude: 72.8461, line: "L1", hasAutoHub: true  },
  { id: "m1-05", name: "WEH Metro",           latitude: 19.1147, longitude: 72.8562, line: "L1", hasAutoHub: false },
  { id: "m1-06", name: "Chakala Metro",       latitude: 19.1019, longitude: 72.8672, line: "L1", hasAutoHub: true  },
  { id: "m1-07", name: "Airport Road Metro",  latitude: 19.0988, longitude: 72.8762, line: "L1", hasAutoHub: false },
  { id: "m1-08", name: "Marol Naka Metro",    latitude: 19.1083, longitude: 72.8812, line: "L1", hasAutoHub: true  },
  { id: "m1-09", name: "Saki Naka Metro",     latitude: 19.0961, longitude: 72.8882, line: "L1", hasAutoHub: false },
  { id: "m1-10", name: "Asalpha Metro",       latitude: 19.0903, longitude: 72.8961, line: "L1", hasAutoHub: false },
  { id: "m1-11", name: "Jagruti Nagar Metro", latitude: 19.0838, longitude: 72.9030, line: "L1", hasAutoHub: false },
  { id: "m1-12", name: "Ghatkopar Metro",     latitude: 19.0863, longitude: 72.9082, line: "L1", hasAutoHub: true  },

  // Line 2A (Yellow) — Dahisar East ↔ D.N. Nagar (interchange at D.N. Nagar)
  { id: "m2a-01", name: "Dahisar East Metro",    latitude: 19.2355, longitude: 72.8597, line: "L2A", hasAutoHub: true  },
  { id: "m2a-02", name: "Anand Nagar Metro",     latitude: 19.2275, longitude: 72.8562, line: "L2A", hasAutoHub: false },
  { id: "m2a-03", name: "Kandivali East Metro",  latitude: 19.2062, longitude: 72.8592, line: "L2A", hasAutoHub: true  },
  { id: "m2a-04", name: "Pahadi Goregaon Metro", latitude: 19.1841, longitude: 72.8481, line: "L2A", hasAutoHub: false },
  { id: "m2a-05", name: "Goregaon East Metro",   latitude: 19.1677, longitude: 72.8569, line: "L2A", hasAutoHub: true  },
  { id: "m2a-06", name: "Aarey Colony Metro",    latitude: 19.1522, longitude: 72.8647, line: "L2A", hasAutoHub: false },
  { id: "m2a-07", name: "SEEPZ Metro",           latitude: 19.1344, longitude: 72.8681, line: "L2A", hasAutoHub: false },
  // D.N. Nagar is the interchange between L1 and L2A
]

// ── Metro lines ───────────────────────────────────────────────────────────────

export const METRO_LINES: MetroLine[] = [
  {
    id: "L1",
    name: "Line 1 — Versova–Ghatkopar",
    color: "#2563eb",
    stations: ["m1-01","m1-02","m1-03","m1-04","m1-05","m1-06","m1-07","m1-08","m1-09","m1-10","m1-11","m1-12"],
  },
  {
    id: "L2A",
    name: "Line 2A — Dahisar–D.N.Nagar",
    color: "#ca8a04",
    stations: ["m2a-01","m2a-02","m2a-03","m2a-04","m2a-05","m2a-06","m2a-07","m1-02"],
    // m1-02 is D.N. Nagar, shared interchange station
  },
]

// ── Bus stops ─────────────────────────────────────────────────────────────────

export const BUS_STOPS: BusStop[] = [
  { id: "b-01", name: "Andheri Station (W)",      latitude: 19.1197, longitude: 72.8349, routes: ["R174","R220"] },
  { id: "b-02", name: "Juhu Beach",               latitude: 19.1073, longitude: 72.8259, routes: ["R174"]       },
  { id: "b-03", name: "Bandra Station (W)",        latitude: 19.0547, longitude: 72.8394, routes: ["R174","R351"] },
  { id: "b-04", name: "Santacruz Station",         latitude: 19.0809, longitude: 72.8477, routes: ["R174","R220"] },
  { id: "b-05", name: "Ghatkopar Station",         latitude: 19.0863, longitude: 72.9063, routes: ["R220","R351"] },
  { id: "b-06", name: "Kurla Station",             latitude: 19.0693, longitude: 72.8797, routes: ["R220","R351"] },
  { id: "b-07", name: "Borivali Station",          latitude: 19.2285, longitude: 72.8537, routes: ["R455"]       },
  { id: "b-08", name: "Kandivali Station",         latitude: 19.2044, longitude: 72.8552, routes: ["R455"]       },
  { id: "b-09", name: "Malad Station",             latitude: 19.1866, longitude: 72.8490, routes: ["R455","R174"] },
  { id: "b-10", name: "Goregaon Station",          latitude: 19.1624, longitude: 72.8516, routes: ["R455"]       },
  { id: "b-11", name: "Versova Junction",          latitude: 19.1307, longitude: 72.8150, routes: ["R174"]       },
  { id: "b-12", name: "Chakala Junction",          latitude: 19.1010, longitude: 72.8660, routes: ["R220"]       },
]

// ── Bus routes ────────────────────────────────────────────────────────────────

export const BUS_ROUTES: BusRoute[] = [
  {
    id: "R174",
    name: "174 — Bandra ↔ Andheri",
    stops: ["b-03","b-04","b-01","b-11","b-02"],
    frequencyMinutes: 12,
  },
  {
    id: "R220",
    name: "220 — Andheri ↔ Ghatkopar",
    stops: ["b-01","b-04","b-12","b-06","b-05"],
    frequencyMinutes: 10,
  },
  {
    id: "R351",
    name: "351 — Bandra ↔ Kurla",
    stops: ["b-03","b-06","b-05"],
    frequencyMinutes: 15,
  },
  {
    id: "R455",
    name: "455 — Borivali ↔ Goregaon",
    stops: ["b-07","b-08","b-09","b-10"],
    frequencyMinutes: 8,
  },
]

// ── Fare configuration ────────────────────────────────────────────────────────

export const FARE_CONFIG: FareConfig = {
  metro:   { basefare: 10, perStation: 3   }, // ₹10 + ₹3 per station
  bus:     { basefare: 5,  perKm: 1.5      }, // ₹5  + ₹1.50/km
  auto:    { basefare: 25, perKm: 13       }, // ₹25 + ₹13/km
  walking: 0,
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

const stationById = new Map(METRO_STATIONS.map((s) => [s.id, s]))
const stopById    = new Map(BUS_STOPS.map((s) => [s.id, s]))

export function getStation(id: string): MetroStation | undefined { return stationById.get(id) }
export function getStop(id: string):    BusStop     | undefined { return stopById.get(id) }

export function getLine(id: string): MetroLine | undefined {
  return METRO_LINES.find((l) => l.id === id)
}

export function stationsOnPath(fromId: string, toId: string): string[] | null {
  for (const line of METRO_LINES) {
    const fi = line.stations.indexOf(fromId)
    const ti = line.stations.indexOf(toId)
    if (fi !== -1 && ti !== -1) {
      return fi <= ti
        ? line.stations.slice(fi, ti + 1)
        : line.stations.slice(ti, fi + 1).reverse()
    }
  }
  // Try interchange via D.N. Nagar (m1-02)
  const INTERCHANGE = "m1-02"
  for (const lineA of METRO_LINES) {
    const fi = lineA.stations.indexOf(fromId)
    const ii = lineA.stations.indexOf(INTERCHANGE)
    if (fi === -1 || ii === -1) continue
    for (const lineB of METRO_LINES) {
      if (lineB.id === lineA.id) continue
      const ti = lineB.stations.indexOf(toId)
      const ii2 = lineB.stations.indexOf(INTERCHANGE)
      if (ti === -1 || ii2 === -1) continue
      const segA = fi <= ii  ? lineA.stations.slice(fi, ii + 1)  : lineA.stations.slice(ii, fi + 1).reverse()
      const segB = ii2 <= ti ? lineB.stations.slice(ii2, ti + 1) : lineB.stations.slice(ti, ii2 + 1).reverse()
      // Merge, avoiding duplicate interchange
      return [...segA, ...segB.slice(1)]
    }
  }
  return null
}

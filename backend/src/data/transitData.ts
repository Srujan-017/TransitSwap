// ── Demo Transit Dataset — TransitSwap Phase 5 ─────────────────────────────
// Source: Based on Bengaluru's Namma Metro network (Purple, Green, Yellow
// lines — real line names and real station names) and the BMTC bus network
// (real corridor names; route numbers are illustrative, not sourced from an
// official feed). Coordinates are APPROXIMATE — placed from general
// geographic knowledge of each named locality's real relative position, not
// a surveyed or geocoded source. Clearly labelled as DEMO / SEEDED data.
// Architecture is designed so this can be replaced by GTFS or a live transit
// API without changing multimodalService.ts.
//
// Phase 5 — migrated from the original Mumbai Metro / BEST seed (Phase 0-4)
// to Bengaluru, and substantially expanded: 19 -> 41 metro stations across
// 3 real operational lines (was 2), 12 -> 24 bus stops, 4 -> 10 bus routes.
// See PHASE_5_VERIFICATION.md for the measured coverage improvement and for
// why a full GTFS import was not available/used (no official Namma Metro or
// BMTC GTFS feed was found to be reliably downloadable in this session).

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
  frequencyMinutes: number
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
  number: string // the route number riders look for on the bus itself (separate from the descriptive `name`)
  stops: string[] // ordered IDs
  // Minutes between buses off-peak (and the figure used for the boarding wait in route totals).
  frequencyMinutes: number
  // Minutes between buses on weekday mornings and evenings (07:00-10:00, 17:00-20:00). Default 60% of frequencyMinutes.
  peakFrequencyMinutes?: number
  // First and last departure from the route's first stop, "HH:MM" (the other direction mirrors them
  // from the last stop). Default 05:30 and 22:30. Synthetic timetable — not drawn from BMTC.
  firstBus?: string
  lastBus?: string
}

export interface FareConfig {
  metro: { basefare: number; perStation: number }
  bus: { basefare: number; perKm: number }
  auto: { basefare: number; perKm: number }
  walking: number
}

// ── Metro stations ────────────────────────────────────────────────────────────
// Each station appears once; an interchange station (Majestic, RV Road) is a
// single object whose id is listed in more than one METRO_LINES[].stations
// array below — not a separate record per line.

export const METRO_STATIONS: MetroStation[] = [
  // Purple Line — Whitefield <-> Mysuru Road (real corridor; this seed covers
  // the Whitefield-to-Mysuru Road core, not the full Whitefield<->Challaghatta
  // route)
  { id: "pl-01", name: "Whitefield Metro",                latitude: 12.9698, longitude: 77.7500, line: "PURPLE", hasAutoHub: true  },
  { id: "pl-02", name: "Hoodi Metro",                     latitude: 12.9897, longitude: 77.7126, line: "PURPLE", hasAutoHub: false },
  { id: "pl-03", name: "Baiyappanahalli Metro",           latitude: 12.9906, longitude: 77.6530, line: "PURPLE", hasAutoHub: true  },
  { id: "pl-04", name: "Swami Vivekananda Road Metro",    latitude: 12.9816, longitude: 77.6447, line: "PURPLE", hasAutoHub: false },
  { id: "pl-05", name: "Indiranagar Metro",                latitude: 12.9784, longitude: 77.6408, line: "PURPLE", hasAutoHub: true  },
  { id: "pl-06", name: "Halasuru Metro",                  latitude: 12.9815, longitude: 77.6301, line: "PURPLE", hasAutoHub: false },
  { id: "pl-07", name: "Trinity Metro",                   latitude: 12.9719, longitude: 77.6190, line: "PURPLE", hasAutoHub: false },
  { id: "pl-08", name: "MG Road Metro",                   latitude: 12.9757, longitude: 77.6079, line: "PURPLE", hasAutoHub: true  },
  { id: "pl-09", name: "Cubbon Park Metro",               latitude: 12.9774, longitude: 77.5967, line: "PURPLE", hasAutoHub: false },
  { id: "pl-10", name: "Vidhana Soudha Metro",            latitude: 12.9793, longitude: 77.5920, line: "PURPLE", hasAutoHub: false },
  { id: "pl-11", name: "Sir M Visvesvaraya Station Metro", latitude: 12.9779, longitude: 77.5890, line: "PURPLE", hasAutoHub: false },
  { id: "pl-12", name: "Majestic Metro",                  latitude: 12.9767, longitude: 77.5713, line: "PURPLE", hasAutoHub: true  },
  { id: "pl-13", name: "City Railway Station Metro",      latitude: 12.9757, longitude: 77.5675, line: "PURPLE", hasAutoHub: false },
  { id: "pl-14", name: "Magadi Road Metro",               latitude: 12.9770, longitude: 77.5590, line: "PURPLE", hasAutoHub: false },
  { id: "pl-15", name: "Vijayanagar Metro",               latitude: 12.9719, longitude: 77.5370, line: "PURPLE", hasAutoHub: false },
  { id: "pl-16", name: "Nayandahalli Metro",               latitude: 12.9496, longitude: 77.5190, line: "PURPLE", hasAutoHub: false },
  { id: "pl-17", name: "Mysuru Road Metro",               latitude: 12.9419, longitude: 77.5090, line: "PURPLE", hasAutoHub: true  },

  // Green Line — Madavara <-> RV Road (real corridor; this seed covers the
  // Madavara-to-RV Road core, not the full Madavara<->Silk Institute route).
  // Majestic is the shared interchange with Purple (listed above, not
  // repeated here); RV Road is the shared interchange with Yellow.
  { id: "gl-01", name: "Madavara Metro",                  latitude: 13.0505, longitude: 77.4908, line: "GREEN", hasAutoHub: false },
  { id: "gl-02", name: "Nagasandra Metro",                latitude: 13.0458, longitude: 77.5090, line: "GREEN", hasAutoHub: true  },
  { id: "gl-03", name: "Dasarahalli Metro",               latitude: 13.0398, longitude: 77.5191, line: "GREEN", hasAutoHub: false },
  { id: "gl-04", name: "Jalahalli Metro",                 latitude: 13.0447, longitude: 77.5469, line: "GREEN", hasAutoHub: false },
  { id: "gl-05", name: "Peenya Metro",                    latitude: 13.0291, longitude: 77.5203, line: "GREEN", hasAutoHub: true  },
  { id: "gl-06", name: "Yeshwanthpur Metro",              latitude: 13.0280, longitude: 77.5540, line: "GREEN", hasAutoHub: true  },
  { id: "gl-07", name: "Mahalakshmi Metro",               latitude: 13.0145, longitude: 77.5529, line: "GREEN", hasAutoHub: false },
  { id: "gl-08", name: "Rajajinagar Metro",               latitude: 12.9939, longitude: 77.5540, line: "GREEN", hasAutoHub: false },
  { id: "gl-09", name: "Srirampura Metro",                latitude: 12.9908, longitude: 77.5651, line: "GREEN", hasAutoHub: false },
  { id: "gl-10", name: "Chickpete Metro",                 latitude: 12.9664, longitude: 77.5755, line: "GREEN", hasAutoHub: false },
  { id: "gl-11", name: "KR Market Metro",                 latitude: 12.9634, longitude: 77.5768, line: "GREEN", hasAutoHub: false },
  { id: "gl-12", name: "Lalbagh Metro",                   latitude: 12.9507, longitude: 77.5848, line: "GREEN", hasAutoHub: false },
  { id: "gl-13", name: "Jayanagar Metro",                 latitude: 12.9308, longitude: 77.5838, line: "GREEN", hasAutoHub: true  },
  { id: "gl-14", name: "RV Road Metro",                   latitude: 12.9254, longitude: 77.5737, line: "GREEN", hasAutoHub: true  },

  // Yellow Line — RV Road <-> Bommasandra (real corridor, opened Aug 2025).
  // RV Road is the shared interchange with Green (listed above).
  { id: "yl-01", name: "Jayadeva Hospital Metro",         latitude: 12.9123, longitude: 77.5964, line: "YELLOW", hasAutoHub: false },
  { id: "yl-02", name: "Silk Board Metro",                latitude: 12.9166, longitude: 77.6228, line: "YELLOW", hasAutoHub: true  },
  { id: "yl-03", name: "Bommanahalli Metro",              latitude: 12.8994, longitude: 77.6220, line: "YELLOW", hasAutoHub: false },
  { id: "yl-04", name: "Hongasandra Metro",               latitude: 12.8906, longitude: 77.6291, line: "YELLOW", hasAutoHub: false },
  { id: "yl-05", name: "Kudlu Gate Metro",                latitude: 12.8829, longitude: 77.6359, line: "YELLOW", hasAutoHub: false },
  { id: "yl-06", name: "Singasandra Metro",               latitude: 12.8743, longitude: 77.6428, line: "YELLOW", hasAutoHub: false },
  { id: "yl-07", name: "Hosa Road Metro",                 latitude: 12.8580, longitude: 77.6460, line: "YELLOW", hasAutoHub: false },
  { id: "yl-08", name: "Electronic City Metro",           latitude: 12.8452, longitude: 77.6602, line: "YELLOW", hasAutoHub: true  },
  { id: "yl-09", name: "Huskur Road Metro",               latitude: 12.8314, longitude: 77.6731, line: "YELLOW", hasAutoHub: false },
  { id: "yl-10", name: "Bommasandra Metro",               latitude: 12.8135, longitude: 77.6950, line: "YELLOW", hasAutoHub: true  },
]

// ── Metro lines ───────────────────────────────────────────────────────────────

export const METRO_LINES: MetroLine[] = [
  {
    id: "PURPLE",
    name: "Purple Line — Whitefield–Mysuru Road",
    color: "#7c3aed",
    stations: [
      "pl-01","pl-02","pl-03","pl-04","pl-05","pl-06","pl-07","pl-08","pl-09",
      "pl-10","pl-11","pl-12","pl-13","pl-14","pl-15","pl-16","pl-17",
    ],
    frequencyMinutes: 5,
  },
  {
    id: "GREEN",
    name: "Green Line — Madavara–RV Road",
    color: "#16a34a",
    // pl-12 is Majestic, the real shared interchange between Purple and Green
    stations: [
      "gl-01","gl-02","gl-03","gl-04","gl-05","gl-06","gl-07","gl-08","gl-09",
      "pl-12","gl-10","gl-11","gl-12","gl-13","gl-14",
    ],
    frequencyMinutes: 6,
  },
  {
    id: "YELLOW",
    name: "Yellow Line — RV Road–Bommasandra",
    color: "#ca8a04",
    // gl-14 is RV Road, the real shared interchange between Green and Yellow
    stations: ["gl-14","yl-01","yl-02","yl-03","yl-04","yl-05","yl-06","yl-07","yl-08","yl-09","yl-10"],
    frequencyMinutes: 8,
  },
]

// ── Bus stops ─────────────────────────────────────────────────────────────────
// Real BMTC-served localities; exact stop coordinates are approximate.

export const BUS_STOPS: BusStop[] = [
  { id: "b-01", name: "Shivajinagar Bus Stand",      latitude: 12.9868, longitude: 77.6047, routes: ["R1","R4"]       },
  { id: "b-02", name: "Cubbon Park Bus Stop",        latitude: 12.9766, longitude: 77.5930, routes: ["R1"]            },
  { id: "b-03", name: "Kempegowda Bus Station",      latitude: 12.9770, longitude: 77.5705, routes: ["R1","R2","R8"]  },
  { id: "b-04", name: "Shantinagar Bus Stop",        latitude: 12.9586, longitude: 77.5995, routes: ["R2","R3"]       },
  { id: "b-05", name: "Koramangala Bus Stop",        latitude: 12.9352, longitude: 77.6245, routes: ["R2","R5"]       },
  { id: "b-06", name: "Domlur Bus Stop",             latitude: 12.9610, longitude: 77.6387, routes: ["R3","R5"]       },
  { id: "b-07", name: "Yeshwanthpur Bus Stand",      latitude: 13.0265, longitude: 77.5520, routes: ["R6"]            },
  { id: "b-08", name: "Peenya Bus Stop",             latitude: 13.0289, longitude: 77.5195, routes: ["R6"]            },
  { id: "b-09", name: "Rajajinagar Bus Stop",        latitude: 12.9918, longitude: 77.5551, routes: ["R6","R1"]       },
  { id: "b-10", name: "Malleshwaram Bus Stop",       latitude: 13.0035, longitude: 77.5695, routes: ["R6"]            },
  { id: "b-11", name: "Jayanagar Bus Stop",          latitude: 12.9293, longitude: 77.5830, routes: ["R2"]            },
  { id: "b-12", name: "Jayanagar 4th Block Bus Stop", latitude: 12.9256, longitude: 77.5833, routes: ["R2","R9"]      },
  { id: "b-13", name: "Marathahalli Bus Stop",       latitude: 12.9569, longitude: 77.7011, routes: ["R5"]            },
  { id: "b-14", name: "Indiranagar 100ft Rd Bus Stop", latitude: 12.9719, longitude: 77.6412, routes: ["R3"]          },
  { id: "b-15", name: "Hebbal Bus Stop",             latitude: 13.0355, longitude: 77.5971, routes: ["R4","R7"]       },
  { id: "b-16", name: "KR Puram Bus Stop",           latitude: 13.0028, longitude: 77.6960, routes: ["R7"]           },
  { id: "b-17", name: "Banashankari Bus Stand",      latitude: 12.9254, longitude: 77.5468, routes: ["R9"]           },
  { id: "b-18", name: "Basavanagudi Bus Stop",       latitude: 12.9422, longitude: 77.5738, routes: ["R9","R2"]       },
  { id: "b-19", name: "HSR Layout Bus Stop",         latitude: 12.9116, longitude: 77.6446, routes: ["R5","R8"]       },
  { id: "b-20", name: "Electronic City Bus Stop",    latitude: 12.8456, longitude: 77.6610, routes: ["R8"]           },
  { id: "b-21", name: "Silk Board Bus Stop",         latitude: 12.9172, longitude: 77.6232, routes: ["R8","R5"]       },
  { id: "b-22", name: "Vijayanagar Bus Stop",        latitude: 12.9715, longitude: 77.5365, routes: ["R10"]          },
  { id: "b-23", name: "Mysuru Road Bus Stop",        latitude: 12.9424, longitude: 77.5085, routes: ["R10"]          },
  { id: "b-24", name: "Whitefield Bus Stop",         latitude: 12.9692, longitude: 77.7496, routes: ["R10","R7"]      },
  // ── Added in feature-upgrade phase 4: the main corridors (ORR, Old Madras Road, Bellary Road,
  //    Hosur Road, Mysuru Road, Kanakapura Road, Bannerghatta Road, Tumkur Road, the airport road).
  //    Names are real localities; coordinates are approximate and the stops themselves are synthetic.
  { id: "b-25", name: "Nagawara Bus Stop",           latitude: 13.0450, longitude: 77.6160, routes: [] },
  { id: "b-26", name: "Kalyan Nagar Bus Stop",       latitude: 13.0230, longitude: 77.6410, routes: [] },
  { id: "b-27", name: "Bellandur Bus Stop",          latitude: 12.9260, longitude: 77.6760, routes: [] },
  { id: "b-28", name: "HAL Airport Road Bus Stop",   latitude: 12.9590, longitude: 77.6680, routes: [] },
  { id: "b-29", name: "Hoodi Circle Bus Stop",       latitude: 12.9920, longitude: 77.7150, routes: [] },
  { id: "b-30", name: "Baiyappanahalli Bus Stop",    latitude: 12.9910, longitude: 77.6540, routes: [] },
  { id: "b-31", name: "Ulsoor Bus Stop",             latitude: 12.9830, longitude: 77.6230, routes: [] },
  { id: "b-32", name: "MG Road Bus Stop",            latitude: 12.9755, longitude: 77.6080, routes: [] },
  { id: "b-33", name: "Mekhri Circle Bus Stop",      latitude: 13.0140, longitude: 77.5820, routes: [] },
  { id: "b-34", name: "Yelahanka Bus Stand",         latitude: 13.1007, longitude: 77.5963, routes: [] },
  { id: "b-35", name: "Madiwala Bus Stop",           latitude: 12.9230, longitude: 77.6180, routes: [] },
  { id: "b-36", name: "Bommanahalli Bus Stop",       latitude: 12.9010, longitude: 77.6240, routes: [] },
  { id: "b-37", name: "Lalbagh Main Gate Bus Stop",  latitude: 12.9500, longitude: 77.5840, routes: [] },
  { id: "b-38", name: "Dairy Circle Bus Stop",       latitude: 12.9440, longitude: 77.6010, routes: [] },
  { id: "b-39", name: "City Market Bus Stop",        latitude: 12.9630, longitude: 77.5760, routes: [] },
  { id: "b-40", name: "Kengeri Bus Stand",           latitude: 12.9170, longitude: 77.4830, routes: [] },
  { id: "b-41", name: "JP Nagar Bus Stop",           latitude: 12.9080, longitude: 77.5850, routes: [] },
  { id: "b-42", name: "Konanakunte Bus Stop",        latitude: 12.8860, longitude: 77.5710, routes: [] },
  { id: "b-43", name: "Jayadeva Hospital Bus Stop",  latitude: 12.9170, longitude: 77.5990, routes: [] },
  { id: "b-44", name: "Arekere Bus Stop",            latitude: 12.8890, longitude: 77.5990, routes: [] },
  { id: "b-45", name: "Gottigere Bus Stop",          latitude: 12.8570, longitude: 77.5780, routes: [] },
  { id: "b-46", name: "Jalahalli Cross Bus Stop",    latitude: 13.0490, longitude: 77.5200, routes: [] },
  { id: "b-47", name: "Kempegowda Airport Bus Station", latitude: 13.1989, longitude: 77.7068, routes: [] },
  { id: "b-48", name: "BTM Layout Bus Stop",         latitude: 12.9170, longitude: 77.6100, routes: [] },
  { id: "b-49", name: "Kadugodi Bus Stand",          latitude: 12.9960, longitude: 77.7600, routes: [] },
  { id: "b-50", name: "Bettahalasur Cross Bus Stop", latitude: 13.1480, longitude: 77.6210, routes: [] },
]

// ── Bus routes ────────────────────────────────────────────────────────────────
// Route numbers are illustrative (BMTC-style), not drawn from an official
// feed. Named after the real road corridors they approximate — see the
// historic BMTC "Big10" corridor names (HAL Airport Road, Hosur Road,
// Sarjapur Road, Bannerghatta Road, Kanakapura Road) this dataset draws on.

export const BUS_ROUTES: BusRoute[] = [
  { id: "R1", name: "201 — Kempegowda Bus Station ↔ Shivajinagar (via MG Road)", number: "201", stops: ["b-03","b-02","b-01"], frequencyMinutes: 10 },
  { id: "R2", name: "210A — Kempegowda Bus Station ↔ Jayanagar 4th Block",        number: "210A", stops: ["b-03","b-04","b-05","b-11","b-12"], frequencyMinutes: 8 },
  { id: "R3", name: "314 — Shantinagar ↔ Domlur (via Indiranagar)",              number: "314", stops: ["b-04","b-14","b-06"], frequencyMinutes: 12 },
  { id: "R4", name: "273 — Shivajinagar ↔ Hebbal",                              number: "273", stops: ["b-01","b-15"], frequencyMinutes: 15 },
  { id: "R5", name: "500K — Koramangala ↔ Marathahalli (Sarjapur Road corridor)", number: "500K", stops: ["b-05","b-19","b-21","b-13"], frequencyMinutes: 10 },
  { id: "R6", name: "260 — Yeshwanthpur ↔ Malleshwaram (via Peenya, Rajajinagar)", number: "260", stops: ["b-07","b-08","b-09","b-10"], frequencyMinutes: 9 },
  { id: "R7", name: "301 — Hebbal ↔ Whitefield (Old Madras Road corridor)",      number: "301", stops: ["b-15","b-16","b-24"], frequencyMinutes: 14 },
  { id: "R8", name: "342 — Silk Board ↔ Electronic City (Hosur Road corridor, Big10)", number: "342", stops: ["b-21","b-19","b-20"], frequencyMinutes: 7 },
  { id: "R9", name: "G-9 — Banashankari ↔ Jayanagar 4th Block (Kanakapura Road corridor, Big10)", number: "G-9", stops: ["b-17","b-18","b-12"], frequencyMinutes: 11 },
  { id: "R10", name: "235 — Mysuru Road ↔ Whitefield (limited stop, via Vijayanagar, Majestic, MG Road, KR Puram)",        number: "235", stops: ["b-23","b-22","b-39","b-03","b-32","b-30","b-16","b-24"], frequencyMinutes: 16 },
  // ── Added in feature-upgrade phase 4. Route numbers are BMTC-style but invented; stops, timings
  //    and frequencies are synthetic.
  { id: "R11", name: "500D — Hebbal ↔ Silk Board (Outer Ring Road)", number: "500D", stops: ["b-15","b-25","b-26","b-16","b-13","b-27","b-21"], frequencyMinutes: 10, peakFrequencyMinutes: 6 },
  { id: "R12", name: "335E — Kadugodi ↔ Kempegowda Bus Station (Old Madras Road)", number: "335E", stops: ["b-49","b-24","b-29","b-16","b-30","b-31","b-32","b-02","b-03"], frequencyMinutes: 12, peakFrequencyMinutes: 7 },
  { id: "R13", name: "290 — Yelahanka ↔ Shivajinagar (Bellary Road)", number: "290", stops: ["b-34","b-15","b-33","b-01"], frequencyMinutes: 15, peakFrequencyMinutes: 9 },
  { id: "R14", name: "356 — Kempegowda Bus Station ↔ Electronic City (Hosur Road)", number: "356", stops: ["b-03","b-39","b-37","b-38","b-48","b-35","b-21","b-36","b-20"], frequencyMinutes: 8, peakFrequencyMinutes: 5 },
  { id: "R15", name: "225 — Kempegowda Bus Station ↔ Kengeri (Mysuru Road)", number: "225", stops: ["b-03","b-39","b-22","b-23","b-40"], frequencyMinutes: 12, peakFrequencyMinutes: 8 },
  { id: "R16", name: "KIA-5 — Kempegowda Bus Station ↔ Airport (via Hebbal)", number: "KIA-5", stops: ["b-03","b-01","b-15","b-34","b-50","b-47"], frequencyMinutes: 30, peakFrequencyMinutes: 20, firstBus: "04:30", lastBus: "23:30" },
  { id: "R17", name: "G-17 — Kempegowda Bus Station ↔ Konanakunte (Kanakapura Road)", number: "G-17", stops: ["b-03","b-39","b-18","b-12","b-41","b-42"], frequencyMinutes: 10, peakFrequencyMinutes: 6 },
  { id: "R18", name: "365 — Jayanagar 4th Block ↔ Gottigere (Bannerghatta Road)", number: "365", stops: ["b-12","b-43","b-44","b-45"], frequencyMinutes: 12, peakFrequencyMinutes: 8 },
  { id: "R19", name: "258 — Kempegowda Bus Station ↔ Jalahalli Cross (Tumkur Road)", number: "258", stops: ["b-03","b-07","b-08","b-46"], frequencyMinutes: 9, peakFrequencyMinutes: 6 },
  { id: "R20", name: "500P — Shivajinagar ↔ Marathahalli (Old Airport Road)", number: "500P", stops: ["b-01","b-32","b-14","b-06","b-28","b-13"], frequencyMinutes: 10, peakFrequencyMinutes: 6 },
]

// Every stop lists the routes that serve it, derived from the routes themselves so the two cannot drift apart.
for (const stop of BUS_STOPS) {
  stop.routes = BUS_ROUTES.filter((route) => route.stops.includes(stop.id)).map((route) => route.id)
}

// ── Fare configuration ────────────────────────────────────────────────────────
// Metro fare approximates Namma Metro's real distance-slab structure
// (0-2km Rs11, 2-4km Rs21, ... effective ~Rs5/station for a typical 2-3
// station hop) as a flat basefare+perStation model, consistent with how
// this dataset models bus/auto fares — not the real slab table itself.
// Bus and auto fares are illustrative BMTC/auto-rickshaw-tariff-shaped
// estimates, not an official fare card.

export const FARE_CONFIG: FareConfig = {
  metro:   { basefare: 11, perStation: 5    }, // approximates Namma Metro's 2026 distance-slab fares
  bus:     { basefare: 6,  perKm: 1.5       }, // BMTC-shaped estimate
  auto:    { basefare: 30, perKm: 15        }, // Bengaluru auto-rickshaw-shaped estimate
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

/**
 * Phase 5 — generalized from a single hard-coded interchange constant (the
 * previous Mumbai dataset had exactly one, "m1-02") to finding whichever
 * station id is shared between two different lines' `stations` arrays. This
 * dataset now has two real interchanges (Majestic between Purple/Green, RV
 * Road between Green/Yellow), and this still only resolves a single-hop
 * transfer (origin line -> shared station -> destination line), same as
 * before — it is not a general multi-hop graph search (that is Phase 6).
 */
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
  for (const lineA of METRO_LINES) {
    const fi = lineA.stations.indexOf(fromId)
    if (fi === -1) continue
    for (const lineB of METRO_LINES) {
      if (lineB.id === lineA.id) continue
      const ti = lineB.stations.indexOf(toId)
      if (ti === -1) continue
      const interchangeId = lineA.stations.find((id) => lineB.stations.includes(id))
      if (!interchangeId) continue
      const ii = lineA.stations.indexOf(interchangeId)
      const ii2 = lineB.stations.indexOf(interchangeId)
      const segA = fi <= ii  ? lineA.stations.slice(fi, ii + 1)  : lineA.stations.slice(ii, fi + 1).reverse()
      const segB = ii2 <= ti ? lineB.stations.slice(ii2, ti + 1) : lineB.stations.slice(ti, ii2 + 1).reverse()
      // Merge, avoiding duplicate interchange
      return [...segA, ...segB.slice(1)]
    }
  }
  return null
}

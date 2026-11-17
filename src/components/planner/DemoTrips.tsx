import { Sparkles } from "lucide-react"
import type { GeoLocation } from "../../types/map"

/**
 * Ready-made trips on the demo network, so a demonstration (or a first look) works with one tap and does not depend on the
 * place-search service being fast. The coordinates are the demo stations' own, the same ones the planner's tests use.
 */
export interface DemoTrip {
  id: string
  label: string
  detail: string
  origin: GeoLocation
  destination: GeoLocation
}

const place = (name: string, address: string, latitude: number, longitude: number): GeoLocation => ({ name, address, latitude, longitude })

export const DEMO_TRIPS: DemoTrip[] = [
  {
    id: "whitefield-baiyappanahalli",
    label: "Whitefield → Baiyappanahalli",
    detail: "Metro, Purple Line",
    origin: place("Whitefield Metro Station", "Whitefield, Bengaluru, Karnataka, India", 12.9698, 77.75),
    destination: place("Baiyappanahalli Metro Station", "Baiyappanahalli, Bengaluru, Karnataka, India", 12.9906, 77.653),
  },
  {
    id: "silk-board-majestic",
    label: "Silk Board → Majestic",
    detail: "Bus and metro",
    origin: place("Silk Board Junction", "Silk Board, Bengaluru, Karnataka, India", 12.9172, 77.6232),
    destination: place("Majestic Kempegowda Bus Station", "Majestic, Bengaluru, Karnataka, India", 12.9767, 77.5713),
  },
  {
    id: "mg-road-majestic",
    label: "MG Road → Majestic",
    detail: "Metro through the city centre",
    origin: place("MG Road Metro Station", "MG Road, Bengaluru, Karnataka, India", 12.9757, 77.6079),
    destination: place("Majestic Metro Station", "Majestic, Bengaluru, Karnataka, India", 12.9767, 77.5713),
  },
]

interface DemoTripsProps {
  onPick: (trip: DemoTrip) => void
}

export default function DemoTrips({ onPick }: DemoTripsProps) {
  return (
    <div role="group" aria-label="Demo trips" className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Try a demo trip
      </p>
      <div className="flex flex-wrap gap-2">
        {DEMO_TRIPS.map((trip) => (
          <button
            key={trip.id}
            type="button"
            onClick={() => onPick(trip)}
            className="min-h-11 rounded-full bg-white px-3.5 py-1.5 text-left text-sm font-medium text-navy-800 ring-1 ring-inset ring-navy-200 transition-colors hover:bg-brand-50 hover:ring-brand-300"
          >
            {trip.label}
            <span className="sr-only">: {trip.detail}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

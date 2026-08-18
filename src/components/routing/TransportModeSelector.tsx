import { Car, Footprints, Bike } from "lucide-react"
import type { TransportMode } from "../../types/map"

interface Props {
  value: TransportMode
  onChange: (mode: TransportMode) => void
}

const MODES: { id: TransportMode; label: string; icon: React.ReactNode }[] = [
  { id: "driving", label: "Drive", icon: <Car className="w-4 h-4" /> },
  { id: "walking", label: "Walk", icon: <Footprints className="w-4 h-4" /> },
  { id: "cycling", label: "Cycle", icon: <Bike className="w-4 h-4" /> },
]

export default function TransportModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
        Transport Mode
      </label>
      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              value === m.id
                ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                : "border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50"
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

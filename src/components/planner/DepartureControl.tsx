import { useState } from "react"
import { Clock } from "lucide-react"
import SegmentedControl from "../ui/SegmentedControl"

interface DepartureControlProps {
  /** "YYYY-MM-DD", or "" when no day is chosen. */
  date: string
  /** "HH:MM", or "" when no time is chosen. */
  time: string
  onChange: (next: { date: string; time: string }) => void
}

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * When to leave. "Leave now" means no date or time is set, which is what the planner has always meant by an empty date and
 * time (it then plans for the present moment). "Depart at" shows the two fields, starting from today and the current
 * time. Going back to "Leave now" clears them, so a forgotten date can never silently change a search.
 */
export default function DepartureControl({ date, time, onChange }: DepartureControlProps) {
  const [mode, setMode] = useState<"now" | "later">(date || time ? "later" : "now")

  const choose = (next: "now" | "later") => {
    setMode(next)
    if (next === "now") {
      onChange({ date: "", time: "" })
    } else if (!date && !time) {
      const d = new Date()
      onChange({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` })
    }
  }

  const field =
    "w-full min-h-11 rounded-control border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"

  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="Departure"
        value={mode}
        onChange={choose}
        className="w-full [&>button]:flex-1"
        options={[
          { value: "now", label: "Leave now", icon: <Clock className="h-4 w-4" aria-hidden="true" /> },
          { value: "later", label: "Depart at" },
        ]}
      />
      {mode === "later" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="trip-date" className="text-xs font-semibold uppercase tracking-wider text-navy-500">Date</label>
            <input id="trip-date" type="date" value={date} onChange={(e) => onChange({ date: e.target.value, time })} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="trip-time" className="text-xs font-semibold uppercase tracking-wider text-navy-500">Time</label>
            <input id="trip-time" type="time" value={time} onChange={(e) => onChange({ date, time: e.target.value })} className={field} />
          </div>
        </div>
      )}
    </div>
  )
}

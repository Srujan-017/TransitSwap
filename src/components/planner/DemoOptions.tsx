import { useId, useState } from "react"
import { ChevronDown, FlaskConical } from "lucide-react"

export interface WeatherChoice<T extends string> {
  id: T
  label: string
}

interface DemoOptionsProps<T extends string> {
  options: Array<WeatherChoice<T>>
  value: T
  onChange: (id: T) => void
}

/**
 * The weather switch, tucked behind a "Demo options" line so it does not crowd the search. It exists so the rules can be shown
 * on a sunny day (in rain or heat, walks over 300 m become autos), which is why it is labelled as a demo. The closed line
 * always says which weather is chosen. The group inside is exactly the one the planner has always had.
 */
export default function DemoOptions<T extends string>({ options, value, onChange }: DemoOptionsProps<T>) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const current = options.find((o) => o.id === value)?.label ?? value

  return (
    <div className="rounded-panel border border-navy-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center gap-2.5 rounded-panel px-3.5 py-2 text-left text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50"
      >
        <FlaskConical className="h-4 w-4 flex-shrink-0 text-amber-700" aria-hidden="true" />
        Demo options
        <span className="ml-auto text-xs font-medium text-navy-500">Weather: {current}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-navy-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="space-y-2 border-t border-navy-100 px-3.5 pb-3.5 pt-3" role="group" aria-labelledby="weather-label">
          <p id="weather-label" className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Weather <span className="ml-1 normal-case tracking-normal font-medium text-navy-500">(demo options for showing the rules)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={value === option.id}
                onClick={() => onChange(option.id)}
                className={`min-h-9 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  value === option.id ? "bg-brand-600 text-white" : "bg-navy-100 text-navy-700 hover:bg-navy-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-navy-500">
            {value === "live"
              ? "Uses the real weather — the forecast for your departure hour if you pick a time."
              : "Demo weather: in rain or heat, walks over 300 m become autos."}
          </p>
        </div>
      )}
    </div>
  )
}

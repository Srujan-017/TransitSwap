import type { ReactNode } from "react"

interface Option<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: Array<Option<T>>
  value: T
  onChange: (value: T) => void
  /** Names the group for screen readers, e.g. "Routing mode". */
  ariaLabel: string
  className?: string
}

/** A row of mutually exclusive choices that looks like one control (Multimodal | Road Routing, Leave now | Depart at). */
export default function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, className = "" }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={`inline-flex gap-1 rounded-control bg-navy-100 p-1 ${className}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[0.5rem] px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150 ${
              on ? "bg-white text-navy-900 shadow-card" : "text-navy-600 hover:text-navy-900"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

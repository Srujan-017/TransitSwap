import type { ReactNode } from "react"

interface StatTileProps {
  label: string
  value: ReactNode
  /** A short line under the number: a unit, a comparison, a caveat. */
  hint?: ReactNode
  icon?: ReactNode
  tone?: "default" | "brand" | "go" | "warn"
  className?: string
}

const ICON_LOOK = {
  default: "bg-navy-100 text-navy-600",
  brand: "bg-brand-50 text-brand-700",
  go: "bg-go-50 text-go-700",
  warn: "bg-amber-50 text-amber-800",
}

/** One big number with its label: dashboard statistics, sustainability, admin counts. Numbers use tabular figures. */
export default function StatTile({ label, value, hint, icon, tone = "default", className = "" }: StatTileProps) {
  return (
    <div className={`rounded-panel border border-navy-100 bg-white p-4 shadow-card ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && <span className={`flex h-8 w-8 items-center justify-center rounded-control ${ICON_LOOK[tone]}`} aria-hidden="true">{icon}</span>}
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-navy-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-navy-500">{hint}</p>}
    </div>
  )
}

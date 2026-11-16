import type { ReactNode } from "react"
import ModeIcon from "./ModeIcon"

type LineMode = "metro" | "bus" | "auto" | "walking"

interface LineBadgeProps {
  mode: LineMode
  /** What is printed: "Purple Line", "356", "Auto". */
  label: ReactNode
  /** The metro line's own colour (a CSS colour from the data). Shown as a dot, never as text colour. */
  color?: string
  /** Text for screen readers when it should say more than the label, e.g. "Bus number 356". */
  srLabel?: string
  className?: string
}

/**
 * The little chip that names a leg of a journey, in the style of the big transit apps: a bus shows its NUMBER, a metro
 * line shows its colour dot and name, an auto and a walk show their icon. Text is always dark (or white on the solid bus
 * chip), never the line colour itself, so every line, including the yellow one, stays readable.
 */
export default function LineBadge({ mode, label, color, srLabel, className = "" }: LineBadgeProps) {
  const base = "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold tabular-nums leading-none"
  const look: Record<LineMode, string> = {
    bus: "bg-bus-600 text-white",
    metro: "bg-white text-navy-900 border border-navy-200",
    auto: "bg-auto-400 text-navy-900",
    walking: "bg-navy-100 text-navy-700",
  }
  return (
    <span className={`${base} ${look[mode]} ${className}`}>
      {mode === "metro" && color ? (
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />
      ) : (
        <ModeIcon mode={mode} className="h-3.5 w-3.5" />
      )}
      {srLabel ? (
        <>
          <span className="sr-only">{srLabel}</span>
          <span aria-hidden="true">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  )
}

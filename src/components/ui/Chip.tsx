import type { ButtonHTMLAttributes, ReactNode } from "react"

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> {
  /** Whether the chip is switched on. Announced as a toggle button (aria-pressed). */
  selected?: boolean
  icon?: ReactNode
}

/** A selectable pill: filters, profile choices, "saved place" shortcuts. Selected = filled brand blue. */
export default function Chip({ selected = false, icon, children, className = "", type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150
        disabled:cursor-not-allowed disabled:opacity-50
        ${selected ? "bg-brand-500 text-white" : "bg-white text-navy-700 ring-1 ring-inset ring-navy-200 hover:bg-navy-50"}
        ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

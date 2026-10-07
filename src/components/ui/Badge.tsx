import type { ReactNode } from "react"

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "navy" | "brand" | "outline"

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: "sm" | "md"
  dot?: boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-navy-100 text-navy-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-danger",
  info: "bg-brand-50 text-brand-700",
  navy: "bg-navy-800 text-white",
  brand: "bg-brand-500 text-white",
  outline: "bg-transparent text-navy-600 border border-navy-300",
}

const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-navy-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-danger",
  info: "bg-brand-500",
  navy: "bg-white",
  brand: "bg-white/70",
  outline: "bg-navy-400",
}

export default function Badge({ children, variant = "default", size = "sm", dot = false, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  )
}


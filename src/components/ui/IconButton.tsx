import type { ButtonHTMLAttributes, ReactNode } from "react"

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** What the button does. Required: an icon alone has no accessible name. Also shown as the tooltip. */
  label: string
  children: ReactNode
  size?: "sm" | "md" | "lg"
  variant?: "ghost" | "solid" | "outline"
}

const SIZE = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-12 w-12" } // md and lg meet the 44 px touch-target guideline
const LOOK = {
  ghost: "text-navy-600 hover:bg-navy-100 active:bg-navy-200",
  solid: "bg-navy-900 text-white hover:bg-navy-800",
  outline: "bg-white text-navy-700 ring-1 ring-inset ring-navy-200 hover:bg-navy-50",
}

/** A round icon-only button with a mandatory accessible name. */
export default function IconButton({ label, children, size = "md", variant = "ghost", className = "", type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${SIZE[size]} ${LOOK[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

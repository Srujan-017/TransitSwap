import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "go"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconPosition?: "left" | "right"
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-card",
  secondary: "bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-700 shadow-card",
  // "Go Green": the one action that starts something (Start Journey).
  go: "bg-go-600 text-white hover:bg-go-700 active:bg-go-800 shadow-card",
  outline: "border border-navy-200 text-navy-700 bg-white hover:bg-navy-50 active:bg-navy-100",
  ghost: "text-navy-600 hover:bg-navy-100 active:bg-navy-200",
  danger: "bg-danger text-white hover:bg-red-800 active:bg-red-900 shadow-card",
}

const sizeClasses: Record<Size, string> = {
  sm: "min-h-9 px-4 py-1.5 text-sm gap-1.5",
  md: "min-h-11 px-5 py-2.5 text-sm gap-2", // 44 px: the touch-target guideline
  lg: "min-h-12 px-7 py-3 text-base gap-2.5",
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-semibold rounded-control
        transition-all duration-150 font-display active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading…</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && icon}
          {children}
          {icon && iconPosition === "right" && icon}
        </>
      )}
    </button>
  )
}

import type { InputHTMLAttributes, ReactNode } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-")

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-navy-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-navy-900 placeholder-navy-400
            transition-colors
            border-navy-200 hover:border-navy-300
            focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
            disabled:bg-navy-50 disabled:cursor-not-allowed
            ${error ? "border-danger focus:border-danger focus:ring-danger/20" : ""}
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">{rightIcon}</div>
        )}
      </div>
      {error && <p className="text-xs text-danger font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-navy-500">{hint}</p>}
    </div>
  )
}

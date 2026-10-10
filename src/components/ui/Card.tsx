import type { HTMLAttributes, ReactNode } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: "none" | "sm" | "md" | "lg"
  hover?: boolean
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
}

export default function Card({ children, padding = "md", hover = false, className = "", ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-3xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]
        ${paddingClasses[padding]}
        ${hover ? "hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

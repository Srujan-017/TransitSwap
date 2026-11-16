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
        bg-white rounded-panel border border-navy-100 shadow-card
        ${paddingClasses[padding]}
        ${hover ? "hover:shadow-float hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

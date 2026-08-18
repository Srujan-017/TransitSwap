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
        bg-white rounded-2xl border border-navy-200 shadow-sm
        ${paddingClasses[padding]}
        ${hover ? "hover:shadow-md hover:border-navy-300 transition-all cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

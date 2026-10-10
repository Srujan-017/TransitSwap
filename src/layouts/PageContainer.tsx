import type { HTMLAttributes, ReactNode } from "react"

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Matches the one real width variation pages legitimately need — a map/dashboard
   *  page wants more room than a form page. Defaults to the most common case. */
  width?: "normal" | "wide" | "narrow"
}

const widthClasses: Record<NonNullable<PageContainerProps["width"]>, string> = {
  normal: "max-w-6xl",
  wide: "max-w-7xl",
  narrow: "max-w-4xl",
}

/**
 * The single page-shell wrapper every route under MainLayout should use,
 * instead of each page hand-rolling its own max-width/padding combination.
 */
export default function PageContainer({ children, width = "normal", className = "", ...props }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full ${widthClasses[width]} px-4 sm:px-6 lg:px-8 py-8 ${className}`} {...props}>
      {children}
    </div>
  )
}

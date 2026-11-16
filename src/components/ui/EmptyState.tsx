import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  /** A button or link offering the obvious next step. */
  action?: ReactNode
  className?: string
}

/** What a list or panel shows when it has nothing yet: say what is missing and what to do about it. */
export default function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-panel bg-navy-100 text-navy-500">{icon}</div>}
      <h3 className="font-display text-base font-semibold text-navy-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-navy-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

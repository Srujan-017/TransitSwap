import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** A small label above the title, e.g. the section name. */
  eyebrow?: ReactNode
  /** Buttons or links on the right (stacked under the title on a phone). */
  actions?: ReactNode
  className?: string
}

/** The same heading block on every page: optional eyebrow, one h1, a sentence under it, and actions on the right. */
export default function PageHeader({ title, subtitle, eyebrow, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

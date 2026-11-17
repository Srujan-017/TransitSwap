import { useId, useRef, type KeyboardEvent, type ReactNode } from "react"

interface TabItem {
  id: string
  label: ReactNode
  content: ReactNode
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  ariaLabel: string
  className?: string
}

/** Underlined tabs following the WAI-ARIA pattern: arrow keys, Home and End move between tabs; only the active panel renders. */
export default function Tabs({ items, value, onChange, ariaLabel, className = "" }: TabsProps) {
  const base = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const move = (e: KeyboardEvent, index: number) => {
    let next = index
    if (e.key === "ArrowRight") next = (index + 1) % items.length
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = items.length - 1
    else return
    e.preventDefault()
    onChange(items[next].id)
    refs.current[items[next].id]?.focus()
  }

  const active = items.find((i) => i.id === value) ?? items[0]
  return (
    <div className={className}>
      <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-navy-200">
        {items.map((item, i) => {
          const on = item.id === active.id
          return (
            <button
              key={item.id}
              ref={(el) => { refs.current[item.id] = el }}
              role="tab"
              type="button"
              id={`${base}-tab-${item.id}`}
              aria-selected={on}
              aria-controls={`${base}-panel-${item.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => move(e, i)}
              className={`-mb-px min-h-11 border-b-2 px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                on ? "border-brand-500 text-brand-700" : "border-transparent text-navy-600 hover:text-navy-900"
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel-${active.id}`} aria-labelledby={`${base}-tab-${active.id}`} tabIndex={0} className="pt-4">
        {active.content}
      </div>
    </div>
  )
}

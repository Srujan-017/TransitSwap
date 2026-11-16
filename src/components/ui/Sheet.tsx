import { useEffect, useId, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import IconButton from "./IconButton"

interface SheetProps {
  open: boolean
  onClose: () => void
  /** Names the dialog; shown as its heading. */
  title: string
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A modal sheet: slides up from the bottom on a phone and sits centred on a larger screen. Closes with Escape, the close
 * button or a tap on the dim background; keeps keyboard focus inside while open and puts it back where it was on close.
 * (The three-height sheet that lives over the map on the planner is built from this in a later phase.)
 */
export default function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center md:items-center">
      <div aria-hidden="true" className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet-up relative flex max-h-[85vh] w-full flex-col rounded-t-sheet bg-white shadow-pop outline-none md:max-w-lg md:rounded-sheet"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 id={titleId} className="font-display text-lg font-bold text-navy-900">{title}</h2>
          <IconButton label="Close" onClick={onClose} size="sm"><X className="h-5 w-5" aria-hidden="true" /></IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-navy-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

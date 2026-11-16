import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react"

export type SheetSnap = "peek" | "half" | "full"

const ORDER: SheetSnap[] = ["peek", "half", "full"]
export const raiseSnap = (s: SheetSnap): SheetSnap => ORDER[Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1)]
export const lowerSnap = (s: SheetSnap): SheetSnap => ORDER[Math.max(ORDER.indexOf(s) - 1, 0)]
/** Raise to at least `min`, never lower. */
export const atLeast = (s: SheetSnap, min: SheetSnap): SheetSnap => (ORDER.indexOf(s) >= ORDER.indexOf(min) ? s : min)

// Heights of the sheet. They apply only below `lg` (1024 px), where the panel floats over the map.
const PHONE_HEIGHT: Record<SheetSnap, string> = {
  peek: "max-lg:h-[13.5rem]",
  half: "max-lg:h-[58%]",
  full: "max-lg:h-[94%]",
}

interface PlannerSheetProps {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  children: ReactNode
  /** The scrolling area, so the page can scroll results into view. */
  scrollRef?: RefObject<HTMLDivElement | null>
}

/**
 * The journey panel. On a desktop (1024 px and up) it is a plain column at the left of the map. Below that it is a sheet
 * over the map with three heights (a peek, half, and nearly full) that can be changed three ways: tap the handle to step
 * through them, drag the handle, or press the arrow keys on it. It is ONE element restyled by screen width, so the planner's
 * labels and controls exist once and are never duplicated for a phone.
 */
export default function PlannerSheet({ snap, onSnapChange, children, scrollRef }: PlannerSheetProps) {
  const start = useRef<number | null>(null)
  const dragged = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    start.current = e.clientY
    dragged.current = false
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (start.current === null) return
    const dy = e.clientY - start.current
    start.current = null
    if (Math.abs(dy) >= 24) {
      dragged.current = true
      onSnapChange(dy < 0 ? raiseSnap(snap) : lowerSnap(snap))
    }
  }
  const onClick = () => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    onSnapChange(snap === "full" ? "peek" : raiseSnap(snap))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp") { e.preventDefault(); onSnapChange(raiseSnap(snap)) }
    else if (e.key === "ArrowDown") { e.preventDefault(); onSnapChange(lowerSnap(snap)) }
  }

  return (
    <aside
      aria-label="Journey planner"
      data-snap={snap}
      className={`${PHONE_HEIGHT[snap]} absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-sheet bg-white shadow-pop transition-[height] duration-300 ease-out motion-reduce:transition-none lg:static lg:z-auto lg:h-full lg:rounded-none lg:border-r lg:border-navy-100 lg:shadow-none`}
    >
      <div className="flex justify-center lg:hidden">
        <button
          type="button"
          aria-label={snap === "full" ? "Collapse the journey panel" : "Expand the journey panel"}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { start.current = null }}
          style={{ touchAction: "none" }}
          className="group flex h-8 w-24 items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-navy-300 transition-colors group-hover:bg-navy-400" />
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </aside>
  )
}

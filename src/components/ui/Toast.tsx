import { useEffect, type ReactNode } from "react"
import { CircleAlert, CircleCheck, Info, X } from "lucide-react"
import IconButton from "./IconButton"

interface ToastProps {
  children: ReactNode
  tone?: "info" | "success" | "error"
  onClose: () => void
  /** Milliseconds before it closes itself; 0 keeps it until dismissed. Errors never close themselves. */
  duration?: number
}

const LOOK = {
  info: { box: "bg-navy-900 text-white", icon: Info },
  success: { box: "bg-go-800 text-white", icon: CircleCheck },
  error: { box: "bg-red-800 text-white", icon: CircleAlert },
}

/** A short message at the bottom of the screen. Announced politely (errors assertively) without moving focus. */
export default function Toast({ children, tone = "info", onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (tone === "error" || duration <= 0) return
    const id = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(id)
  }, [tone, duration, onClose])

  const { box, icon: Icon } = LOOK[tone]
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1200] flex justify-center px-4">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`animate-sheet-up pointer-events-auto flex max-w-md items-center gap-3 rounded-control py-2 pl-4 pr-2 text-sm font-medium shadow-pop ${box}`}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{children}</span>
        <IconButton label="Dismiss" size="sm" onClick={onClose} className="text-white hover:bg-white/15 active:bg-white/25">
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}

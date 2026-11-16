import { Users } from "lucide-react"

export type CrowdLevel = "LOW" | "MEDIUM" | "HIGH"

interface CrowdPillProps {
  level: CrowdLevel
  /** Override the words, e.g. "Crowd: HIGH". Defaults to "Low crowd" / "Medium crowd" / "High crowd". */
  label?: string
  className?: string
}

const LOOK: Record<CrowdLevel, string> = {
  LOW: "bg-go-50 text-go-800 ring-go-200",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200",
  HIGH: "bg-red-50 text-red-800 ring-red-200",
}

/** Crowd level as an icon, a word AND a colour: never colour alone. */
export default function CrowdPill({ level, label, className = "" }: CrowdPillProps) {
  const text = label ?? `${level.charAt(0)}${level.slice(1).toLowerCase()} crowd`
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${LOOK[level]} ${className}`}>
      <Users className="h-3 w-3" aria-hidden="true" />
      {text}
    </span>
  )
}

import { ArrowRight } from "lucide-react"

/**
 * "Origin → Destination": the two names stay whole (a phone is too narrow to cut station names to "Whitefiel…"), so they
 * wrap onto a second line when they must; the arrow stays with the origin.
 */
export default function RouteEnds({ origin, destination, className = "", size = "sm" }: { origin: string; destination: string; className?: string; size?: "sm" | "md" }) {
  const text = size === "md" ? "text-base" : "text-sm"
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium text-navy-800 ${text} ${className}`}>
      <span className="min-w-0 break-words">{origin}</span>
      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-navy-400" aria-hidden="true" />
      <span className="min-w-0 break-words">{destination}</span>
    </p>
  )
}

import { useState } from "react"
import { ChevronDown, ChevronUp, Navigation2 } from "lucide-react"
import type { RouteResult } from "../../types/map"
import { formatDistance, formatDuration } from "../../utils/formatters"

interface RouteInstructionsProps {
  route: RouteResult
}

export default function RouteInstructions({ route }: RouteInstructionsProps) {
  const [expanded, setExpanded] = useState(false)

  const allSteps = route.legs.flatMap((leg) => leg.steps)
  if (allSteps.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-navy-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-navy-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Navigation2 className="w-4 h-4 text-brand-500" />
          <span className="font-display font-semibold text-navy-800 text-sm">
            Step-by-step directions
          </span>
          <span className="text-xs text-navy-400 bg-navy-100 px-2 py-0.5 rounded-full">
            {allSteps.length} steps
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-navy-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-navy-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-navy-100 divide-y divide-navy-50 max-h-80 overflow-y-auto">
          {allSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand-600">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy-800">{step.instruction}</p>
                <p className="text-xs text-navy-400 mt-0.5">
                  {formatDistance(step.distanceMeters)}
                  {step.durationSeconds > 0 && ` · ${formatDuration(Math.ceil(step.durationSeconds / 60))}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import Skeleton from "../ui/Skeleton"

const STEPS = {
  multimodal: ["Locating nearby metro stations…", "Checking bus connections…", "Calculating transit segments…"],
  road: ["Validating coordinates…", "Querying routing service…", "Processing route data…"],
}

/**
 * What the results area shows while a search runs: the same three steps the old overlay listed, over grey cards in the
 * shape the real route cards will take, so nothing jumps when they arrive. Announced once, politely.
 */
export default function ResultsSkeleton({ mode }: { mode: "multimodal" | "road" }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4" data-testid="results-skeleton">
      <div>
        <p className="font-display text-sm font-semibold text-navy-800">
          {mode === "multimodal" ? "Finding the best available routes…" : "Calculating route…"}
        </p>
        <ul className="mt-2 space-y-1.5">
          {STEPS[mode].map((msg, i) => (
            <li key={msg} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent motion-reduce:animate-none"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
              <span className="text-xs text-navy-500">{msg}</span>
            </li>
          ))}
        </ul>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3 rounded-panel border border-navy-100 bg-white p-4 shadow-card" aria-hidden="true">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface SkeletonProps {
  className?: string
  /** Render this many text-like lines instead of one block. */
  lines?: number
}

/**
 * A grey placeholder shown while content loads (instead of a lone spinner). Purely visual: wrap a group of them in an
 * element with role="status" and a visually hidden "Loading…" so screen readers hear one message, not nothing.
 */
export default function Skeleton({ className = "h-4 w-full", lines }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={`skeleton rounded-md ${className}`} style={{ width: i === lines - 1 ? "60%" : undefined }} />
        ))}
      </div>
    )
  }
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />
}

// Hand-authored decorative SVGs for the Dashboard, in the app's own
// navy/sky-blue palette — not photographic/stock imagery, so there is
// nothing here that could be mistaken for real data. Purely visual.

/** A small isometric cluster of city blocks, echoing a transit-map motif. */
export function IsometricSkyline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* ground */}
      <ellipse cx="110" cy="118" rx="100" ry="14" fill="white" fillOpacity="0.06" />
      {/* building 1 */}
      <g opacity="0.9">
        <path d="M40 100 L40 60 L65 46 L90 60 L90 100 L65 114 Z" fill="white" fillOpacity="0.12" />
        <path d="M40 60 L65 46 L90 60 L65 74 Z" fill="white" fillOpacity="0.22" />
        <path d="M65 74 L90 60 L90 100 L65 114 Z" fill="white" fillOpacity="0.08" />
      </g>
      {/* building 2 (taller) */}
      <g opacity="0.95">
        <path d="M90 108 L90 48 L118 32 L146 48 L146 108 L118 124 Z" fill="white" fillOpacity="0.16" />
        <path d="M90 48 L118 32 L146 48 L118 64 Z" fill="white" fillOpacity="0.28" />
        <path d="M118 64 L146 48 L146 108 L118 124 Z" fill="white" fillOpacity="0.1" />
      </g>
      {/* building 3 */}
      <g opacity="0.85">
        <path d="M146 100 L146 68 L168 56 L190 68 L190 100 L168 112 Z" fill="white" fillOpacity="0.14" />
        <path d="M146 68 L168 56 L190 68 L168 80 Z" fill="white" fillOpacity="0.25" />
        <path d="M168 80 L190 68 L190 100 L168 112 Z" fill="white" fillOpacity="0.09" />
      </g>
    </svg>
  )
}

/** A wavy dotted route line with origin/destination pin markers. */
export function RouteLinePins({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M10 30 C 35 8, 55 42, 80 20 S 125 6, 150 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      <circle cx="10" cy="30" r="5" fill="currentColor" />
      <circle cx="10" cy="30" r="2" fill="white" />
      <path d="M150 14 L144 9 L144 19 Z" fill="currentColor" transform="rotate(20 150 14)" />
    </svg>
  )
}

/** A circular "cruising speed"-style gauge for a 0-100 score. */
export function RadialGauge({
  value,
  size = 84,
  strokeWidth = 8,
  trackColor = "#e2e8f0",
  fillColor = "#10b981",
  label,
}: {
  value: number
  size?: number
  strokeWidth?: number
  trackColor?: string
  fillColor?: string
  label?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-navy-900" style={{ fontSize: size * 0.26 }}>{clamped}</span>
        {label && <span className="text-[9px] text-navy-400 font-medium -mt-0.5">{label}</span>}
      </div>
    </div>
  )
}

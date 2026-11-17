/** One preference weight (0 to 1) as a labelled bar. The percentage is always written out; the bar only helps the eye. */
export default function WeightBar({ label, value, barClass = "bg-brand-500" }: { label: string; value: number; barClass?: string }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-600">{label}</p>
        <p className="font-display text-base font-bold tabular-nums text-navy-900">{pct}%</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-100" aria-hidden="true">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  )
}

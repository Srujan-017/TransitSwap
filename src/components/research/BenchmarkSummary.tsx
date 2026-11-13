import type { EvaluationMetrics } from "../../services/intelligenceService"

/**
 * Completion-phase 3 — shows the parts of the route-ranking benchmark that the
 * backend has computed since Phase 9 but no screen displayed: agreement with each of
 * the 5 baseline planners, the ablation study (how often removing one feature changes
 * the chosen route) and the latency percentiles. Purely presentational so it can be
 * tested without the 20-second benchmark run.
 */

const BASELINES: Array<{ key: keyof EvaluationMetrics; label: string; note: string }> = [
  { key: "agreementRateWithShortestTimePercent", label: "Shortest time", note: "fastest route" },
  { key: "agreementRateWithCheapestPercent", label: "Lowest cost", note: "cheapest fare" },
  { key: "agreementRateWithLeastWalkingPercent", label: "Least walking", note: "shortest walk" },
  { key: "agreementRateWithFewestTransfersPercent", label: "Fewest transfers", note: "simplest journey" },
  { key: "agreementRateWithRandomPercent", label: "Random pick", note: "chance level" },
]

const FEATURE_LABELS: Record<string, string> = {
  reliability: "Reliability",
  accessibility: "Accessibility",
  crowd: "Crowding",
  weather: "Weather",
  connectionRisk: "Missed-connection risk",
  transfers: "Transfers",
}

function Bar({ label, note, percent }: { label: string; note?: string; percent: number }) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <li className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-3 text-xs">
      <span className="text-navy-700 font-medium">
        {label}
        {note && <span className="block text-[10px] font-normal text-navy-400">{note}</span>}
      </span>
      <span className="h-2 rounded-full bg-navy-100" aria-hidden="true">
        <span className="block h-2 rounded-full bg-brand-500" style={{ width: `${width}%` }} />
      </span>
      <span className="text-right font-semibold text-navy-900">{percent}%</span>
    </li>
  )
}

export default function BenchmarkSummary({ data }: { data: EvaluationMetrics }) {
  const ablation = Object.entries(data.ablationDecisionChangeRatePercent ?? {})

  return (
    <div className="space-y-5">
      <p className="text-xs text-navy-500">
        {data.totalScenariosEvaluated} scenarios. Each bar is how often TransitSwap's top-ranked route is the{" "}
        <em>same</em> route a simpler planner would pick — lower means the multi-criteria ranking behaves differently
        from that planner.
      </p>

      <section aria-label="Agreement with baseline planners">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">Agreement with baselines</h3>
        <ul className="space-y-2">
          {BASELINES.map(({ key, label, note }) => (
            <Bar key={key} label={label} note={note} percent={Number(data[key])} />
          ))}
        </ul>
      </section>

      <section aria-label="Ablation study">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-500">Ablation: decisions changed</h3>
        <p className="mb-2 text-[11px] text-navy-400">
          Share of scenarios where removing this one feature from the ranking weights changes the chosen route.
        </p>
        {ablation.length === 0 ? (
          <p className="text-xs text-navy-500">No ablation data returned.</p>
        ) : (
          <ul className="space-y-2">
            {ablation.map(([feature, percent]) => (
              <Bar key={feature} label={FEATURE_LABELS[feature] ?? feature} percent={percent} />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Speed" className="grid grid-cols-3 gap-3">
        {[
          { label: "Median latency (p50)", value: `${data.latencyP50Ms} ms` },
          { label: "95th percentile (p95)", value: `${data.latencyP95Ms} ms` },
          { label: "Mean latency", value: `${data.averageComputationLatencyMs} ms` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-navy-100 bg-navy-50 p-3">
            <p className="text-lg font-bold text-navy-900">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-navy-500">{s.label}</p>
          </div>
        ))}
      </section>

      {data.scenarioDatasetNote && <p className="text-[11px] text-navy-500">{data.scenarioDatasetNote}</p>}
      {data.benchmarkDisclaimer && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <strong>Disclaimer:</strong> {data.benchmarkDisclaimer}
        </p>
      )}
    </div>
  )
}

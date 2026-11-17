import { useEffect, useState } from "react"
import { Brain, Activity, BarChart3, AlertTriangle } from "lucide-react"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import PageHeader from "../components/ui/PageHeader"
import StatTile from "../components/ui/StatTile"
import Skeleton from "../components/ui/Skeleton"
import benchmarkSnapshot from "../data/benchmarkSnapshot.json"
import BenchmarkSummary from "../components/research/BenchmarkSummary"
import {
  intelligenceService,
  type EvaluationMetrics,
  type MLEvaluationReport,
  type MLStatusResponse,
  type CoverageEvaluationReport,
  type HistoricalErrorStats,
} from "../services/intelligenceService"

/**
 * Phase 12 — a research/diagnostic page surfacing the 4 ML/reliability
 * endpoints that existed since Phase 8/9 but had no UI
 * (PROJECT_MASTER_PLAN.md §32 "research endpoints... no UI"; §12 P2-10
 * "Surface the research endpoints in the UI"). All 4 now require auth
 * (Phase 11, S4) but are cheap — unlike GET /api/evaluation's 22-scenario
 * benchmark, so they're loaded on mount rather than behind a button.
 */
export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Under the hood"
        title="Research & Diagnostics"
        subtitle="Raw status of TransitSwap's ML and reliability subsystems — every figure here is labelled with its real data source, never a fabricated number."
      />

      <MLStatusCard />
      <RouteBenchmarkCard />
      <MLBenchmarkCard />
      <ReliabilityCoverageCard />
      <HistoricalStatsCard />
    </div>
  )
}

/** The grey placeholder shown while a card's numbers load; one spoken message for screen readers. */
function CardLoading({ text }: { text: string }) {
  return (
    <div role="status" className="space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <span className="sr-only">{text}</span>
    </div>
  )
}

function SectionError({ message }: { message: string }) {
  return (
    <Card>
      <div role="alert" className="flex items-center gap-2 text-sm text-danger">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> {message}
      </div>
    </Card>
  )
}

function MLStatusCard() {
  const [data, setData] = useState<MLStatusResponse | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    intelligenceService
      .getMLStatus()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load ML model status."))
  }, [])

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Brain className="h-5 w-5 text-brand-600" aria-hidden="true" /> Your Learning-to-Rank Model Status
        </h2>
        {data && <Badge variant={data.isPersonalized ? "success" : "outline"}>{data.isPersonalized ? "Personalized" : "Not yet personalized"}</Badge>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!data && !error && <CardLoading text="Loading model status…" />}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-navy-700">{data.statusMessage}</p>
          <p className="text-sm text-navy-600">Pairwise choice samples recorded: <span className="font-semibold text-navy-800">{data.sampleCount}</span></p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(data.weights).map(([feature, weight]) => (
              <div key={feature} className="rounded-control bg-navy-50 px-2.5 py-2 text-center">
                <p className="truncate text-xs font-semibold uppercase tracking-wide text-navy-600">{feature.replace(/([a-z])([A-Z])/g, "$1 $2")}</p>
                <p className="font-display text-base font-bold tabular-nums text-navy-900">{(weight * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
          {data.modelMetrics && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-navy-100 pt-2 text-sm text-navy-600">
              <span>Train accuracy: <strong className="text-navy-800">{data.modelMetrics.trainAccuracy}%</strong></span>
              {data.modelMetrics.testAccuracy !== undefined && (
                <span>Held-out test accuracy: <strong className="text-navy-800">{data.modelMetrics.testAccuracy}%</strong></span>
              )}
              {data.modelMetrics.logLoss !== undefined && <span>Log loss: <strong className="text-navy-800">{data.modelMetrics.logLoss.toFixed(3)}</strong></span>}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// The route-ranking benchmark (22 scenarios) is computed offline with a fixed road model by
// backend/scripts/generate-benchmark-snapshot.ts and shipped with the app, so this card shows
// instantly and cannot time out on a cold server. Re-generate the snapshot after any change to
// routing, ranking or crowd data.
function RouteBenchmarkCard() {
  const data = benchmarkSnapshot as unknown as EvaluationMetrics
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" aria-hidden="true" /> Route Ranking Benchmark — vs 5 Baselines
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Pre-computed</Badge>
          <Badge variant="info">Simulated Benchmark</Badge>
        </div>
      </div>
      <p className="mb-4 text-sm text-navy-600">
        Computed offline on {data.totalScenariosEvaluated} scenarios with a deterministic road model, so the numbers are
        reproducible. Live road routing gives slightly different timings.
      </p>
      <BenchmarkSummary data={data} />
    </Card>
  )
}

function MLBenchmarkCard() {
  const [data, setData] = useState<MLEvaluationReport | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    intelligenceService
      .getMLEvaluation()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load ML benchmark."))
  }, [])

  if (error) return <SectionError message={error} />

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" aria-hidden="true" /> Pairwise Logistic Regression — Synthetic Benchmark
        </h2>
        <Badge variant="info">Simulated Benchmark</Badge>
      </div>
      {!data ? (
        <CardLoading text="Loading benchmark…" />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="ML Accuracy" value={`${data.mlPairwiseAccuracyPercent}%`} />
            <Stat label="Rule Baseline" value={`${data.baselineRuleAccuracyPercent}%`} />
            <Stat label="Improvement" value={`${data.accuracyImprovementPercent > 0 ? "+" : ""}${data.accuracyImprovementPercent}%`} />
            <Stat label="Log Loss" value={data.logLoss.toFixed(3)} />
          </div>
          <p className="text-sm text-navy-600">
            {data.trainingSamplesCount} training / {data.testSamplesCount} held-out test samples (of {data.totalSamplesCount} total).
          </p>
          <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{data.disclaimer}</p>
        </div>
      )}
    </Card>
  )
}

function ReliabilityCoverageCard() {
  const [data, setData] = useState<CoverageEvaluationReport | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    intelligenceService
      .getReliabilityCoverageEvaluation()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load coverage evaluation."))
  }, [])

  if (error) return <SectionError message={error} />

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-600" aria-hidden="true" /> Prediction Interval Empirical Coverage
        </h2>
        {data && <Badge variant={data.dataSource === "real" ? "success" : "warning"}>{data.dataSource === "real" ? "Real user data" : "Synthetic demo data"}</Badge>}
      </div>
      {!data ? (
        <CardLoading text="Loading coverage evaluation…" />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="90% Coverage" value={`${data.empiricalCoverage90Percent}%`} />
            <Stat label="95% Coverage" value={`${data.empiricalCoverage95Percent}%`} />
            <Stat label="Test Journeys" value={String(data.totalTestJourneys)} />
            <Stat label="Mean Error" value={`${data.meanObservedError >= 0 ? "+" : ""}${data.meanObservedError}m`} />
          </div>
          <p className="rounded-control border border-navy-100 bg-navy-50 px-3 py-2 text-sm text-navy-700">{data.disclaimer}</p>
        </div>
      )}
    </Card>
  )
}

function HistoricalStatsCard() {
  const [data, setData] = useState<HistoricalErrorStats | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    intelligenceService
      .getHistoricalReliabilityStats()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load historical statistics."))
  }, [])

  if (error) return <SectionError message={error} />

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-go-700" aria-hidden="true" /> Historical Prediction Error Statistics
        </h2>
        {data && (
          <Badge variant={data.isSufficientData ? "success" : "outline"}>
            {data.isSufficientData ? data.groupingLevel.replace(/_/g, " ") : "Insufficient data"}
          </Badge>
        )}
      </div>
      {!data ? (
        <CardLoading text="Loading historical statistics…" />
      ) : !data.isSufficientData ? (
        <p className="text-sm text-navy-600">
          Fewer than 5 journey observations exist overall — not enough to compute a genuine mean/standard
          deviation yet. This is an honest "insufficient data" state, not a fake statistic.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Sample Size" value={String(data.sampleSize)} />
          <Stat label="Mean Error" value={`${data.meanErrorMinutes >= 0 ? "+" : ""}${data.meanErrorMinutes}m`} />
          <Stat label="Std Dev (σ)" value={`${data.standardDeviationMinutes}m`} />
          <Stat label="Data Source" value={data.isSyntheticDemoData ? "Synthetic" : "Real"} />
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <StatTile label={label} value={value} className="shadow-none" />
}

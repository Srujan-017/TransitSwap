import { useEffect, useState } from "react"
import { FlaskConical, Brain, Activity, BarChart3, AlertTriangle } from "lucide-react"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import {
  intelligenceService,
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-brand-600" />
          <h1 className="font-display text-2xl font-bold text-navy-900">Research & Diagnostics</h1>
        </div>
        <p className="text-navy-500 text-sm mt-1">
          Raw status of TransitSwap's ML and reliability subsystems — every figure here is labelled with its
          real data source, never a fabricated number.
        </p>
      </div>

      <MLStatusCard />
      <MLBenchmarkCard />
      <ReliabilityCoverageCard />
      <HistoricalStatsCard />
    </div>
  )
}

function SectionError({ message }: { message: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-sm text-danger">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {message}
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Brain className="w-4.5 h-4.5 text-brand-500" /> Your Learning-to-Rank Model Status
        </h2>
        {data && <Badge variant={data.isPersonalized ? "success" : "outline"}>{data.isPersonalized ? "Personalized" : "Not yet personalized"}</Badge>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {!data && !error && <LoadingSpinner text="Loading model status…" />}
      {data && (
        <div className="space-y-3">
          <p className="text-sm text-navy-600">{data.statusMessage}</p>
          <p className="text-xs text-navy-500">Pairwise choice samples recorded: <span className="font-semibold text-navy-800">{data.sampleCount}</span></p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(data.weights).map(([feature, weight]) => (
              <div key={feature} className="bg-navy-50 rounded-lg px-2.5 py-2 text-center">
                <p className="text-[10px] text-navy-500 uppercase tracking-wide truncate">{feature}</p>
                <p className="text-sm font-bold text-navy-900">{(weight * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
          {data.modelMetrics && (
            <div className="text-xs text-navy-500 pt-2 border-t border-navy-100 flex flex-wrap gap-4">
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-indigo-600" /> Pairwise Logistic Regression — Synthetic Benchmark
        </h2>
        <Badge variant="info">Simulated Benchmark</Badge>
      </div>
      {!data ? (
        <LoadingSpinner text="Loading benchmark…" />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="ML Accuracy" value={`${data.mlPairwiseAccuracyPercent}%`} />
            <Stat label="Rule Baseline" value={`${data.baselineRuleAccuracyPercent}%`} />
            <Stat label="Improvement" value={`${data.accuracyImprovementPercent > 0 ? "+" : ""}${data.accuracyImprovementPercent}%`} />
            <Stat label="Log Loss" value={data.logLoss.toFixed(3)} />
          </div>
          <p className="text-xs text-navy-500">
            {data.trainingSamplesCount} training / {data.testSamplesCount} held-out test samples (of {data.totalSamplesCount} total).
          </p>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{data.disclaimer}</p>
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-sky-600" /> Prediction Interval Empirical Coverage
        </h2>
        {data && <Badge variant={data.dataSource === "real" ? "success" : "warning"}>{data.dataSource === "real" ? "Real user data" : "Synthetic demo data"}</Badge>}
      </div>
      {!data ? (
        <LoadingSpinner text="Loading coverage evaluation…" />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="90% Coverage" value={`${data.empiricalCoverage90Percent}%`} />
            <Stat label="95% Coverage" value={`${data.empiricalCoverage95Percent}%`} />
            <Stat label="Test Journeys" value={String(data.totalTestJourneys)} />
            <Stat label="Mean Error" value={`${data.meanObservedError >= 0 ? "+" : ""}${data.meanObservedError}m`} />
          </div>
          <p className="text-[11px] text-navy-600 bg-navy-50 border border-navy-150 rounded-lg px-3 py-2">{data.disclaimer}</p>
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-emerald-600" /> Historical Prediction Error Statistics
        </h2>
        {data && (
          <Badge variant={data.isSufficientData ? "success" : "outline"}>
            {data.isSufficientData ? data.groupingLevel.replace(/_/g, " ") : "Insufficient data"}
          </Badge>
        )}
      </div>
      {!data ? (
        <LoadingSpinner text="Loading historical statistics…" />
      ) : !data.isSufficientData ? (
        <p className="text-sm text-navy-500">
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
  return (
    <div className="bg-navy-50 rounded-xl p-3 border border-navy-100">
      <p className="text-lg font-bold text-navy-900">{value}</p>
      <p className="text-[11px] text-navy-500 mt-0.5 font-medium">{label}</p>
    </div>
  )
}

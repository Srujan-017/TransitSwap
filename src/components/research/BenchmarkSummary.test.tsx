import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import BenchmarkSummary from "./BenchmarkSummary"
import type { EvaluationMetrics } from "../../services/intelligenceService"

/** Completion-phase 3 — the benchmark fields computed since Phase 9 must reach the screen. */

const DATA = {
  totalScenariosEvaluated: 22,
  agreementRateWithShortestTimePercent: 95,
  agreementRateWithCheapestPercent: 27,
  agreementRateWithLeastWalkingPercent: 45,
  agreementRateWithFewestTransfersPercent: 73,
  agreementRateWithRandomPercent: 41,
  ablationDecisionChangeRatePercent: { reliability: 27, accessibility: 18, crowd: 14, weather: 18, connectionRisk: 27, transfers: 9 },
  latencyP50Ms: 6,
  latencyP95Ms: 8,
  averageComputationLatencyMs: 6.4,
  scenarioDatasetNote: "22 hand-built scenarios.",
  benchmarkDisclaimer: "SIMULATED PROTOTYPE BENCHMARK.",
} as unknown as EvaluationMetrics

describe("BenchmarkSummary", () => {
  it("shows agreement with all 5 baselines", () => {
    render(<BenchmarkSummary data={DATA} />)
    const section = screen.getByRole("region", { name: "Agreement with baseline planners" })
    for (const [label, pct] of [["Shortest time", "95%"], ["Lowest cost", "27%"], ["Least walking", "45%"], ["Fewest transfers", "73%"], ["Random pick", "41%"]]) {
      const row = within(section).getByText(label).closest("li")!
      expect(within(row).getByText(pct)).toBeInTheDocument()
    }
    expect(within(section).getAllByRole("listitem")).toHaveLength(5)
  })

  it("shows all 6 ablation features with readable names", () => {
    render(<BenchmarkSummary data={DATA} />)
    const section = screen.getByRole("region", { name: "Ablation study" })
    expect(within(section).getAllByRole("listitem")).toHaveLength(6)
    expect(within(section).getByText("Missed-connection risk")).toBeInTheDocument()
    expect(within(section).getByText("Crowding")).toBeInTheDocument()
    expect(within(section).getByText("9%")).toBeInTheDocument()
  })

  it("shows p50, p95 and mean latency", () => {
    render(<BenchmarkSummary data={DATA} />)
    expect(screen.getByText("6 ms")).toBeInTheDocument()
    expect(screen.getByText("8 ms")).toBeInTheDocument()
    expect(screen.getByText("6.4 ms")).toBeInTheDocument()
  })

  it("always shows the simulated-benchmark disclaimer", () => {
    render(<BenchmarkSummary data={DATA} />)
    expect(screen.getByText(/SIMULATED PROTOTYPE BENCHMARK/)).toBeInTheDocument()
  })

  it("does not crash when the ablation data is missing", () => {
    render(<BenchmarkSummary data={{ ...DATA, ablationDecisionChangeRatePercent: undefined as never }} />)
    expect(screen.getByText("No ablation data returned.")).toBeInTheDocument()
  })
})

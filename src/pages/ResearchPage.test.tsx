import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import ResearchPage from "./ResearchPage"
import { intelligenceService } from "../services/intelligenceService"
import benchmarkSnapshot from "../data/benchmarkSnapshot.json"

/**
 * Feature-upgrade phase 1 — the route-ranking benchmark used to run live behind a
 * button and time out on a cold server. It is now a pre-computed snapshot shown
 * immediately, with no request at all.
 */

vi.mock("../services/intelligenceService", () => ({
  intelligenceService: {
    getMLStatus: vi.fn(() => new Promise(() => {})),
    getMLEvaluation: vi.fn(() => new Promise(() => {})),
    getReliabilityCoverageEvaluation: vi.fn(() => new Promise(() => {})),
    getHistoricalReliabilityStats: vi.fn(() => new Promise(() => {})),
    getEvaluationMetrics: vi.fn(),
  },
}))

describe("ResearchPage route-ranking benchmark", () => {
  it("shows the pre-computed benchmark immediately, with no run button and no request", () => {
    render(<ResearchPage />)
    expect(screen.getByText(/Route Ranking Benchmark/)).toBeInTheDocument()
    expect(screen.getByText("Pre-computed")).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Agreement with baseline planners" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /run benchmark/i })).toBeNull()
    expect(vi.mocked(intelligenceService.getEvaluationMetrics)).not.toHaveBeenCalled()
  })

  it("the shipped snapshot covers all 22 scenarios and the five baselines", () => {
    const snap = benchmarkSnapshot as Record<string, unknown>
    expect(snap.totalScenariosEvaluated).toBe(22)
    for (const key of [
      "agreementRateWithShortestTimePercent", "agreementRateWithCheapestPercent", "agreementRateWithLeastWalkingPercent",
      "agreementRateWithFewestTransfersPercent", "agreementRateWithRandomPercent", "latencyP50Ms", "latencyP95Ms",
    ]) {
      expect(typeof snap[key]).toBe("number")
    }
    expect(Object.keys(snap.ablationDecisionChangeRatePercent as object)).toHaveLength(6)
  })
})

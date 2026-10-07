#!/usr/bin/env ts-node
// ── Phase 9 — sensitivity analysis over the routing cost model's magic constants ──
//
// PROJECT_MASTER_PLAN.md §39 Phase 9: "Add a sensitivity sweep over the ~11
// magic constants [...] Sweep the magic constants in Section 13
// (MAX_WALK_TO_METRO_M, METRO_WAIT_SEC, BUS_WAIT_SEC, mode speeds, distance
// factors) and report how often the top-ranked route changes. This directly
// addresses 'your constants are arbitrary', which an examiner will ask."
//
// §13's original list was audited against the Mumbai-era codebase before
// Phase 5 replaced METRO_WAIT_SEC/BUS_WAIT_SEC (flat per-mode wait times)
// with each metro line's / bus route's own `frequencyMinutes` field — a
// deliberate, documented design improvement (real transit lines don't all
// have the same frequency), not an oversight. Those 2 named constants no
// longer exist as standalone values to sweep. The 9 that remain — all of
// multimodalService.ts's ROUTING_CONSTANTS (named and exported specifically
// so this script can perturb them; see that file's Phase 9 comment) — are
// swept here instead, honestly documented as 9 rather than claiming 11.
//
// For each constant: perturb it +/-20%, re-run every evaluation scenario's
// FULL candidate generation + enrichment + full-model ranking (via
// evaluationService.enrichScenarioRoutes(), the exact same pipeline
// runEvaluation() itself uses — not a reimplementation), and measure how
// often the top-ranked route's id differs from the unperturbed baseline.
// This is a real behavioral sensitivity measurement against the live
// routing code, not a theoretical estimate.
//
// Run with: npm run sweep:sensitivity (from backend/)

import { ROUTING_CONSTANTS, type RoutingConstants } from "../src/services/multimodalService"
import { EVALUATION_SCENARIOS, enrichScenarioRoutes } from "../src/services/evaluationService"
import { transitDnaService } from "../src/services/transitDnaService"
import type { EnrichedRoute } from "../src/types/intelligence"

/**
 * Every route's `id` is a fresh crypto.randomUUID() assigned at generation
 * time (see multimodalService.ts's segment builders) — it is NOT a stable
 * identity for "the same real-world path" across two separate
 * generateRoutes() calls, even with identical ROUTING_CONSTANTS. Comparing
 * raw `.id`s across the baseline and a perturbed run would make EVERY
 * comparison register as "changed" regardless of whether the constant
 * perturbation did anything at all. Identify a route instead by its
 * structural path — the sequence of (mode, from-name, to-name) hops — which
 * is stable across regeneration and only changes when a genuinely different
 * real-world path wins.
 */
function structuralSignature(route: EnrichedRoute): string {
  return route.segments.map((s) => `${s.mode}:${s.from.name}>${s.to.name}`).join("|")
}

const PERTURBATION_PERCENT = 20

interface SweepResult {
  constant: keyof RoutingConstants
  baselineValue: number
  direction: "+20%" | "-20%"
  perturbedValue: number
  decisionChangeCount: number
  totalScenarios: number
  decisionChangeRatePercent: number
}

async function topRouteSignatureForEachScenario(): Promise<Map<number, string | null>> {
  const results = new Map<number, string | null>()
  for (let i = 0; i < EVALUATION_SCENARIOS.length; i++) {
    const enriched = await enrichScenarioRoutes(EVALUATION_SCENARIOS[i])
    if (enriched.length === 0) {
      results.set(i, null)
      continue
    }
    const top = [...enriched].sort((a, b) => transitDnaService.scoreRoute(b) - transitDnaService.scoreRoute(a))[0]
    results.set(i, structuralSignature(top))
  }
  return results
}

async function main() {
  console.log(`Computing baseline (unperturbed) top-ranked route for all ${EVALUATION_SCENARIOS.length} scenarios...`)
  const baseline = await topRouteSignatureForEachScenario()

  const constantNames = Object.keys(ROUTING_CONSTANTS) as Array<keyof RoutingConstants>
  const results: SweepResult[] = []

  for (const constant of constantNames) {
    const originalValue = ROUTING_CONSTANTS[constant]

    for (const direction of ["+20%", "-20%"] as const) {
      const multiplier = direction === "+20%" ? 1 + PERTURBATION_PERCENT / 100 : 1 - PERTURBATION_PERCENT / 100
      const perturbedValue = Number((originalValue * multiplier).toFixed(4))

      ROUTING_CONSTANTS[constant] = perturbedValue
      console.log(`\nSweeping ${constant}: ${originalValue} -> ${perturbedValue} (${direction})`)

      let changed = 0
      const perturbed = await topRouteSignatureForEachScenario()
      for (const [i, baselineTopId] of baseline) {
        if (perturbed.get(i) !== baselineTopId) changed++
      }

      // Restore immediately — never leave a perturbed value in place for any
      // other scenario's evaluation, including the next direction's sweep.
      ROUTING_CONSTANTS[constant] = originalValue

      results.push({
        constant,
        baselineValue: originalValue,
        direction,
        perturbedValue,
        decisionChangeCount: changed,
        totalScenarios: EVALUATION_SCENARIOS.length,
        decisionChangeRatePercent: Math.round((changed / EVALUATION_SCENARIOS.length) * 100),
      })
    }
  }

  console.log("\n" + "═".repeat(78))
  console.log("SENSITIVITY SWEEP RESULTS — top-ranked-route decision-change rate")
  console.log("═".repeat(78))
  console.log(
    constantNames
      .map((name) => {
        const rows = results.filter((r) => r.constant === name)
        return (
          `${name} (baseline ${rows[0].baselineValue}):\n` +
          rows.map((r) => `  ${r.direction} -> ${r.perturbedValue}: ${r.decisionChangeRatePercent}% (${r.decisionChangeCount}/${r.totalScenarios} scenarios changed)`).join("\n")
        )
      })
      .join("\n"),
  )

  const maxChange = results.reduce((max, r) => (r.decisionChangeRatePercent > max.decisionChangeRatePercent ? r : max), results[0])
  console.log("\n" + "═".repeat(78))
  console.log(`Most sensitive: ${maxChange.constant} ${maxChange.direction} — ${maxChange.decisionChangeRatePercent}% of scenarios changed their top-ranked route.`)
  console.log(`Swept ${constantNames.length} constants (2 directions each = ${results.length} runs) across ${EVALUATION_SCENARIOS.length} scenarios.`)
  console.log("═".repeat(78))
}

main().catch((err) => {
  console.error("❌ Sensitivity sweep failed:", err)
  process.exit(1)
})

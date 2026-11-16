// Runs the screenshot + accessibility audit (playwright.screens.config.ts) once per viewport, each against a fresh
// backend and database, so a problem in one viewport run cannot spill into the next. (The audit backend also has the
// API rate limit lifted; see backend/scripts/ui-screens-launch.js.)
//
//   node ui-audit/run.mjs                 → docs/ui-redesign/before/
//   UI_SHOTS=phase-4 node ui-audit/run.mjs → docs/ui-redesign/phase-4/
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const label = process.env.UI_SHOTS || "before"
fs.rmSync(path.join("docs", "ui-redesign", label), { recursive: true, force: true })

let failed = false
for (const viewport of (process.env.UI_VIEWPORTS || "375,768,1280").split(",")) {
  console.log(`\n── viewport ${viewport} px ──`)
  const r = spawnSync("npx", ["playwright", "test", "-c", "playwright.screens.config.ts"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, UI_VIEWPORTS: viewport, UI_SHOTS: label },
  })
  if (r.status !== 0) failed = true
}

const file = path.join("docs", "ui-redesign", label, "results.json")
if (fs.existsSync(file)) {
  const { results } = JSON.parse(fs.readFileSync(file, "utf8"))
  const bad = results.filter((r) => r.violations.length || r.overflowX)
  console.log(`\n${results.length} screens in ${file}; ${bad.length} with findings`)
}
process.exit(failed ? 1 : 0)

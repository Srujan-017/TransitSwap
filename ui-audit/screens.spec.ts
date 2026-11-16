import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { UI_AUDIT_ADMIN, UI_AUDIT_USER_PASSWORD } from "./accounts"

/**
 * Screenshot + accessibility audit of every screen (UI redesign, Phase 0 onwards).
 *
 * For each of 3 viewports it visits the public screens, then signs in (test accounts in a throwaway in-memory
 * database), plans and saves a trip, runs the simulated journey, and visits every signed-in screen. For each screen
 * it saves a screenshot, runs axe-core (WCAG 2.1 A + AA) and checks the page does not scroll sideways.
 *
 * Output: docs/ui-redesign/<UI_SHOTS or "before">/<viewport>-<screen>.png and results.json.
 * The test only fails if a screen cannot be reached; accessibility findings are recorded, not enforced here —
 * the phase gate in UI_REDESIGN_PLAN.md section 5.4 reads results.json and requires 0 violations on changed screens.
 */

const API = "http://localhost:5000/api"
const AXE_URL = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js"
const LABEL = process.env.UI_SHOTS || "before"
// Run from the repository root (as the npx command in docs/ui-redesign/UI_CONTRACT.md does).
const OUT = path.resolve(process.cwd(), "docs", "ui-redesign", LABEL)

// Each viewport is best run as its own invocation against a fresh backend (ui-audit/run.mjs does this);
// UI_VIEWPORTS=375 runs just one.
const ALL_VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
]
const WANTED = (process.env.UI_VIEWPORTS || "375,768,1280").split(",").map((v) => v.trim())
const VIEWPORTS = ALL_VIEWPORTS.filter((v) => WANTED.includes(v.name))

const STATIONS = {
  whitefield: { name: "Whitefield Metro Station", address: "Whitefield, Bengaluru, Karnataka, India", latitude: 12.9698, longitude: 77.75 },
  baiyappanahalli: { name: "Baiyappanahalli Metro Station", address: "Baiyappanahalli, Bengaluru, Karnataka, India", latitude: 12.9906, longitude: 77.653 },
}

type Finding = { screen: string; viewport: string; violations: Array<{ id: string; impact: string | null; nodes: number; targets?: string[]; detail?: string }>; overflowX: boolean; error?: string }
const results: Finding[] = []

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(400)
}

// `reveal`: scroll down the whole page first, so sections that fade in only once scrolled into view (the Landing page)
// are visible in the screenshot and in the accessibility scan, not just the part above the fold.
async function capture(page: Page, vp: string, screen: string, reveal = false) {
  if (reveal) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= height; y += 400) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(150)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(900) // let the last fade-in finish
  }
  await settle(page)
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: path.join(OUT, `${vp}-${screen}.png`), fullPage: true })
  const finding: Finding = { screen, viewport: vp, violations: [], overflowX: false }
  try {
    if (!(await page.evaluate(() => Boolean((window as unknown as { axe?: unknown }).axe)))) await page.addScriptTag({ url: AXE_URL })
    const axe = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return r.violations.map((v: any) => ({
        id: v.id, impact: v.impact, nodes: v.nodes.length,
        // Which elements, so a finding can be located without re-running by hand.
        targets: v.nodes.slice(0, 4).map((n: any) => n.target.join(" ")),
        detail: String((v.nodes[0].any[0] && v.nodes[0].any[0].message) || "").slice(0, 160),
      }))
    })
    finding.violations = axe
  } catch (e) {
    finding.error = `axe failed: ${(e as Error).message}`
  }
  finding.overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  results.push(finding)
}

async function api(page: Page, pathname: string, body: unknown, token?: string) {
  const res = await page.request.post(API + pathname, { data: body, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  return (await res.json()) as { data?: { token?: string } }
}

async function signInWith(page: Page, token: string) {
  await page.goto("/")
  await page.evaluate((t) => localStorage.setItem("ts_token", t), token)
}

async function pickPlace(page: Page, placeholder: string, text: string) {
  await page.getByPlaceholder(placeholder).fill(text)
  const dropdown = page.locator("div.absolute.top-full")
  await expect(dropdown).toBeVisible({ timeout: 10_000 })
  await dropdown.locator("button").first().click()
}

test("screenshots and accessibility of every screen", async ({ page }) => {
  // Place search is answered locally (the same single mocked boundary as e2e/happy-path.spec.ts).
  await page.route("**/api/geocoding/search**", async (route) => {
    const q = (new URL(route.request().url()).searchParams.get("q") ?? "").toLowerCase()
    await route.fulfill({ json: { success: true, data: [q.includes("baiyappanahalli") ? STATIONS.baiyappanahalli : STATIONS.whitefield] } })
  })

  const stamp = Date.now()
  const user = await api(page, "/auth/register", { name: "UI Audit User", email: `ui.audit.${stamp}@example.test`, password: UI_AUDIT_USER_PASSWORD })
  const userToken = user.data?.token
  const admin = await api(page, "/auth/login", { email: UI_AUDIT_ADMIN.email, password: UI_AUDIT_ADMIN.password })
  const adminToken = admin.data?.token
  expect(userToken, "the test user could not be registered").toBeTruthy()
  expect(adminToken, "the audit admin could not sign in").toBeTruthy()

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })

    // ── Public screens (signed out) ──
    await page.goto("/")
    await page.evaluate(() => localStorage.removeItem("ts_token"))
    for (const [screen, url] of [["landing", "/"], ["login", "/login"], ["register", "/register"], ["not-found", "/no-such-page"], ["credits", "/credits"]] as const) {
      await page.goto(url)
      await capture(page, vp.name, screen)
    }
    await page.goto("/")
    await capture(page, vp.name, "landing-revealed", true)

    // ── Signed in as the test user ──
    await signInWith(page, userToken!)
    await page.goto("/dashboard")
    await expect(page.getByRole("heading").first()).toBeVisible()
    await capture(page, vp.name, "dashboard")

    await page.goto("/plan")
    await expect(page.getByText("Plan Your Journey")).toBeVisible()
    await capture(page, vp.name, "plan-empty")

    await pickPlace(page, "Search start location…", "Whitefield Metro Station")
    await pickPlace(page, "Search destination…", "Baiyappanahalli Metro Station")
    await page.getByRole("button", { name: "Find Routes" }).click()
    const save = page.getByRole("button", { name: "Save Journey" })
    await expect(save).toBeVisible({ timeout: 30_000 })
    await capture(page, vp.name, "plan-results")

    await save.click()
    // (visible text only: at 375 px the desktop nav link "Saved Routes" is in the page but hidden)
    await expect(page.locator("text=/saved/i >> visible=true").first()).toBeVisible({ timeout: 10_000 })

    // Live navigation with the simulated journey, if the route offers "Start Journey".
    const start = page.getByRole("button", { name: /Start Journey/ })
    if (await start.count()) {
      await start.first().click()
      await expect(page.getByTestId("guidance-primary")).toBeVisible({ timeout: 10_000 })
      await capture(page, vp.name, "navigation")
      await page.getByRole("button", { name: /Simulate journey/ }).click()
      await page.waitForTimeout(1500)
      await capture(page, vp.name, "navigation-simulating")
      await page.getByRole("button", { name: "Exit navigation" }).click()
    }

    for (const [screen, url] of [["history", "/history"], ["saved-routes", "/saved-routes"], ["profile", "/profile"], ["research", "/research"]] as const) {
      await page.goto(url)
      await capture(page, vp.name, screen)
    }

    // History with the first journey's details open.
    await page.goto("/history")
    const details = page.locator('button[title="Open journey details"]').first()
    await details.waitFor({ timeout: 10_000 }).catch(() => {}) // the list loads after the page does
    if (await details.count()) {
      await details.click()
      await capture(page, vp.name, "history-details")
    }

    // ── Admin ──
    await signInWith(page, adminToken!)
    await page.goto("/admin")
    await expect(page.getByText("Admin Dashboard").first()).toBeVisible({ timeout: 15_000 })
    await capture(page, vp.name, "admin")
  }

  // Merge with the results of the other viewports already written for this label.
  fs.mkdirSync(OUT, { recursive: true })
  const file = path.join(OUT, "results.json")
  let previous: Finding[] = []
  try { previous = (JSON.parse(fs.readFileSync(file, "utf8")) as { results: Finding[] }).results.filter((r) => !WANTED.includes(r.viewport)) } catch { /* first run */ }
  const merged = [...previous, ...results].sort((a, b) => Number(a.viewport) - Number(b.viewport))
  fs.writeFileSync(file, JSON.stringify({ label: LABEL, results: merged }, null, 2))
  const bad = results.filter((r) => r.violations.length > 0 || r.overflowX)
  console.log(`\n${results.length} screens captured → ${path.relative(process.cwd(), OUT)}; ${bad.length} with findings`)
  for (const r of bad) console.log(`  ${r.viewport} ${r.screen}: ${r.violations.map((v) => `${v.id}(${v.nodes})`).join(", ") || "no axe violations"}${r.overflowX ? " · SIDEWAYS SCROLL" : ""}`)
})

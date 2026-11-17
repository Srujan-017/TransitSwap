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
  // A trip with bus options (Silk Board to Majestic), used by the "bus" and "wheelchair in rain" results screens.
  silkBoard: { name: "Silk Board Junction", address: "Silk Board, Bengaluru, Karnataka, India", latitude: 12.9172, longitude: 77.6232 },
  majestic: { name: "Majestic Kempegowda Bus Station", address: "Majestic, Bengaluru, Karnataka, India", latitude: 12.9767, longitude: 77.5713 },
}

type Finding = { screen: string; viewport: string; violations: Array<{ id: string; impact: string | null; nodes: number; targets?: string[]; detail?: string }>; overflowX: boolean; mapShare?: number; error?: string }
const results: Finding[] = []

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(400)
}

// `reveal`: scroll down the whole page first, so sections that fade in only once scrolled into view (the Landing page)
// are visible in the screenshot and in the accessibility scan, not just the part above the fold.
// `expandPlanner`: the journey panel scrolls inside itself, so a screenshot would show only its first screen. For the results
// screens, the panel (and the page around it) is stretched to its full height first, so the whole list is captured.
async function capture(page: Page, vp: string, screen: string, reveal = false, expandPlanner = false) {
  if (expandPlanner) {
    // The original styles are kept and put back after the capture, so the test can carry on using the page normally
    // (a stretched panel, left in place, lets the map sit over the form and swallow the next click).
    await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Journey planner"]') as HTMLElement | null
      if (!aside) return
      const scroller = aside.lastElementChild as HTMLElement
      const wrapper = aside.parentElement as HTMLElement
      const map = wrapper.querySelector("section[aria-label=Map]") as HTMLElement
      const els = [aside, scroller, wrapper, map]
      ;(window as unknown as { __planner?: unknown }).__planner = { els, saved: els.map((el) => el.getAttribute("style")) }
      scroller.style.overflow = "visible"
      scroller.style.height = "auto"
      aside.style.height = "auto"
      aside.style.overflow = "visible"
      aside.style.position = "static"
      wrapper.style.height = "auto"
      // On a phone the map would paint over the stretched panel; it is hidden for the picture (and put back afterwards).
      if (window.innerWidth < 1024) map.style.display = "none"
    })
    await page.waitForTimeout(300)
  }
  if (reveal) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= height; y += 400) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(150)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(900) // let the last fade-in finish
  }
  // Landing sections below the fold use content-visibility, which a full-page capture and an axe scan would otherwise skip
  // (blank pictures, unchecked text). Render everything for the capture.
  await page.addStyleTag({ content: "[class*='content-visibility']{content-visibility:visible !important}" })
  await settle(page)
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: path.join(OUT, `${vp}-${screen}.png`), fullPage: true })
  const finding: Finding = { screen, viewport: vp, violations: [], overflowX: false }
  // On the live navigation screen: how much of the screen height the map keeps (the plan promises about half on a phone).
  finding.mapShare = await page.evaluate(() => {
    const map = document.querySelector('[role="dialog"][aria-label="Live navigation"] .leaflet-container')
    return map ? Math.round((map.getBoundingClientRect().height / window.innerHeight) * 100) / 100 : undefined
  })
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
  if (expandPlanner) {
    await page.evaluate(() => {
      const s = (window as unknown as { __planner?: { els: HTMLElement[]; saved: Array<string | null> } }).__planner
      s?.els.forEach((el, i) => (s.saved[i] === null ? el.removeAttribute("style") : el.setAttribute("style", s.saved[i] as string)))
    })
  }
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
    const place = q.includes("baiyappanahalli") ? STATIONS.baiyappanahalli : q.includes("silk") ? STATIONS.silkBoard : q.includes("majestic") ? STATIONS.majestic : STATIONS.whitefield
    await route.fulfill({ json: { success: true, data: [place] } })
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
    // The same pages before anything is saved: their empty states (a photo and a way forward).
    for (const [screen, url] of [["history-empty", "/history"], ["saved-routes-empty", "/saved-routes"]] as const) {
      await page.goto(url)
      await expect(page.getByText(screen === "history-empty" ? "No journeys saved yet." : "No saved routes yet.").first()).toBeVisible({ timeout: 10_000 })
      await capture(page, vp.name, screen)
    }

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
    // Also save it as a route, so Saved Routes and the dashboard have something to show.
    await page.getByRole("button", { name: "Save Route" }).click()
    await expect(page.locator("text=/Route saved/ >> visible=true").first()).toBeVisible({ timeout: 10_000 })

    // Live navigation with the simulated journey, if the route offers "Start Journey".
    const start = page.getByRole("button", { name: /Start Journey/ })
    if (await start.count()) {
      await start.first().click()
      await expect(page.getByTestId("guidance-primary")).toBeVisible({ timeout: 10_000 })
      await capture(page, vp.name, "navigation")
      expect(results[results.length - 1].mapShare ?? 0, "the map keeps half the phone screen while navigating").toBeGreaterThanOrEqual(0.5)
      await page.getByRole("button", { name: /Simulate journey/ }).click()
      await page.waitForTimeout(1500)
      await capture(page, vp.name, "navigation-simulating")
      expect(results[results.length - 1].mapShare ?? 0, "the map keeps half the phone screen even with the demo controls showing").toBeGreaterThanOrEqual(0.5)
      await page.getByRole("button", { name: "Exit navigation" }).click()
    }

    // ── More results: a trip with buses (with a departure time, so boarding and arrival times show), and the same trip as a
    //    wheelchair user in demo rain (a best option with reasons, the other options, the stops). The step-by-step journey is
    //    opened in both. ──
    await page.goto("/plan")
    await pickPlace(page, "Search start location…", "Silk Board")
    await pickPlace(page, "Search destination…", "Majestic")
    await page.getByRole("button", { name: "Depart at" }).click()
    await page.getByLabel("Date").fill("2026-11-17")
    await page.getByLabel("Time").fill("14:30")
    await page.getByRole("button", { name: "Find Routes" }).click()
    await expect(page.getByText("Route 1", { exact: true })).toBeVisible({ timeout: 30_000 })
    await page.getByRole("button", { name: /Step-by-step journey/ }).click()
    await capture(page, vp.name, "plan-results-bus", false, true)

    await page.getByRole("button", { name: "Wheelchair" }).click()
    await page.getByRole("button", { name: /Demo options/ }).click()
    await page.getByRole("button", { name: "Rain", exact: true }).click()
    await page.getByRole("button", { name: "Find Routes" }).click()
    await expect(page.getByRole("region", { name: "Why this route suits you" })).toBeVisible({ timeout: 30_000 })
    const others = page.getByText(/Show other suitable options/)
    if (await others.count()) await others.click()
    await page.getByRole("button", { name: /Step-by-step journey/ }).click()
    await capture(page, vp.name, "plan-results-wheelchair-rain", false, true)

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

    // The dashboard once it has journeys and a saved route.
    await page.goto("/dashboard")
    await expect(page.getByText("Awaiting feedback").first()).toBeVisible({ timeout: 10_000 })
    await capture(page, vp.name, "dashboard-filled")

    // ── Admin ──
    await signInWith(page, adminToken!)
    await page.goto("/admin")
    await expect(page.getByText("Admin Dashboard").first()).toBeVisible({ timeout: 15_000 })
    await capture(page, vp.name, "admin")
    // The other admin sections (not scanned before), and the Add Station dialog.
    for (const [tabName, shot] of [["Stations", "admin-stations"], ["Accessibility", "admin-accessibility"], ["Crowd Reports", "admin-crowd"], ["Feedback", "admin-feedback"], ["Dataset", "admin-dataset"], ["Reports", "admin-reports"]] as const) {
      await page.getByRole("tab", { name: tabName, exact: true }).click()
      await page.waitForTimeout(600)
      await capture(page, vp.name, shot)
    }
    await page.getByRole("tab", { name: "Stations" }).click()
    await page.getByRole("button", { name: "Add Station" }).click()
    await expect(page.getByRole("dialog", { name: "Add station" })).toBeVisible()
    await capture(page, vp.name, "admin-add-station")
    await page.keyboard.press("Escape")
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

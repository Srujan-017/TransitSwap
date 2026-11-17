import { test, expect, type Browser, type BrowserContextOptions, type Page } from "@playwright/test"
import path from "node:path"
import { UI_AUDIT_USER_PASSWORD } from "../../ui-audit/accounts"

/**
 * The application screenshots on the poster, taken from the real app on a throwaway local stack (in-memory database,
 * fixed clear weather). Road legs come from the public routing servers, so walking follows real streets. The browser clock
 * is set to a weekday morning so times on screen read like a real commute, and the phone has a (fake) GPS fix at the start.
 */

const API = "http://localhost:5000/api"
const OUT = path.join(process.cwd(), "docs", "poster", "assets")
const MORNING = new Date("2026-11-18T09:05:00+05:30")
const SILK_BOARD = { latitude: 12.9174, longitude: 77.6234, accuracy: 12 }

async function signedIn(browser: Browser, options: BrowserContextOptions): Promise<Page> {
  const ctx = await browser.newContext({ reducedMotion: "reduce", ...options })
  const page = await ctx.newPage()
  await page.clock.install({ time: MORNING })
  await page.clock.resume()
  const res = await page.request.post(API + "/auth/register", {
    data: { name: "Demo Rider", email: `poster.${Date.now()}.${options.viewport?.width}@example.test`, password: UI_AUDIT_USER_PASSWORD },
  })
  const token = (await res.json()).data?.token
  expect(token, "could not register the poster user").toBeTruthy()
  await page.goto("/")
  await page.evaluate((t) => localStorage.setItem("ts_token", t), token)
  return page
}

/** A demo trip at a stated weekday time (the backend plans for the departure time it is sent, not the browser's clock). */
async function planDemoTrip(page: Page, chip: RegExp, time: string, profile?: string) {
  await page.goto("/plan")
  await page.getByRole("group", { name: "Demo trips" }).getByRole("button", { name: chip }).click()
  await page.getByRole("button", { name: "Depart at" }).click()
  await page.getByLabel("Date").fill("2026-11-18")
  await page.getByLabel("Time").fill(time)
  if (profile) await page.getByRole("button", { name: profile, exact: true }).click()
  await page.getByRole("button", { name: "Find Routes" }).click()
  await expect(page.getByRole("button", { name: "Start Journey" })).toBeVisible({ timeout: 60_000 })
  await page.evaluate(() => window.scrollTo(0, 0)) // (Playwright scrolls a button into view before clicking it)
  await page.waitForTimeout(3000) // map tiles
}

test("poster screenshots", async ({ browser }) => {
  // ── Laptop: ranked results for the bus-and-metro demo trip ──
  const desk = await signedIn(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await planDemoTrip(desk, /Silk Board → Majestic/, "09:10")
  await desk.screenshot({ path: path.join(OUT, "shot-plan-desktop.png") })

  // ── Laptop: live navigation on the same trip, simulated part-way ──
  await desk.getByRole("button", { name: "Start Journey" }).click()
  await expect(desk.getByTestId("guidance-primary")).toBeVisible({ timeout: 15_000 })
  await desk.getByRole("button", { name: /Simulate journey/ }).click()
  await desk.getByRole("button", { name: "10×" }).click()
  await desk.waitForTimeout(9000)
  await desk.screenshot({ path: path.join(OUT, "shot-nav-desktop.png") })
  await desk.getByRole("button", { name: "Exit navigation" }).click()

  // ── Laptop: the wheelchair story — best option explained, excluded routes with their reasons ──
  await planDemoTrip(desk, /Hoodi → MG Road/, "14:30", "Wheelchair")
  const why = desk.getByRole("region", { name: "Why this route suits you" })
  if (await why.count()) await why.screenshot({ path: path.join(OUT, "shot-best-for-wheelchair.png") })
  const excluded = desk.locator("details", { hasText: /excluded for your Wheelchair profile/ })
  await excluded.locator("summary").click()
  await desk.waitForTimeout(400)
  await excluded.screenshot({ path: path.join(OUT, "shot-excluded-reasons.png") })

  // ── Phone: results in the bottom sheet, and navigation following a (fake) GPS fix ──
  const phone = await signedIn(browser, {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: false,
    geolocation: SILK_BOARD, permissions: ["geolocation"],
  })
  await planDemoTrip(phone, /Silk Board → Majestic/, "09:10")
  await phone.screenshot({ path: path.join(OUT, "shot-plan-phone.png") })
  await phone.getByRole("button", { name: "Start Journey" }).click()
  await expect(phone.getByTestId("guidance-primary")).toBeVisible({ timeout: 15_000 })
  await phone.waitForTimeout(3500)
  await phone.screenshot({ path: path.join(OUT, "shot-nav-phone.png") })

  // ── Home page hero ──
  const home = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" })
  const hp = await home.newPage()
  await hp.goto("/")
  await hp.waitForTimeout(2500)
  await hp.screenshot({ path: path.join(OUT, "shot-home-desktop.png") })
})

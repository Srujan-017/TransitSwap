import { test, expect } from "@playwright/test"

/**
 * Phase 10 — the one Playwright E2E happy path the master plan asks for:
 * register -> plan a trip -> save it -> submit feedback.
 *
 * Runs against REAL frontend + backend dev servers (see playwright.config.ts
 * webServer entries) with a REAL in-memory MongoDB behind the backend — auth,
 * route generation, saving and feedback are all the real app code, not mocked.
 *
 * The ONE thing intercepted is GET /api/geocoding/search. Tried live Nominatim
 * first; two real, independent problems made that the wrong choice for this
 * test rather than a shortcut:
 *   1. transitData.ts's own header says its coordinates are "APPROXIMATE —
 *      placed from general geographic knowledge... not a surveyed or
 *      geocoded source." Confirmed directly: live Nominatim's top result for
 *      "Whitefield Metro Station" geocoded several km away from this seed's
 *      Whitefield Metro coordinate — too far for generateRoutes() to match
 *      within MAX_WALK_TO_METRO_M, so the search correctly 404'd. No query
 *      phrasing fixes a synthetic-coordinate-vs-real-geocoder mismatch.
 *   2. Nominatim's own result wording/availability varies run to run, which
 *      made earlier attempts at this test flaky independent of problem 1.
 * Mocking this one boundary — exactly the same "offline provider" principle
 * backend/src/__tests__/multimodalRouting.test.ts already uses for OSRM via
 * setMultimodalRoadLegProviderForTesting() — keeps every other step real
 * while making the result deterministic.
 */

const SEEDED_STATIONS: Record<string, { name: string; address: string; latitude: number; longitude: number }> = {
  whitefield: { name: "Whitefield Metro Station", address: "Whitefield, Bengaluru, Karnataka, India", latitude: 12.9698, longitude: 77.75 },
  baiyappanahalli: { name: "Baiyappanahalli Metro Station", address: "Baiyappanahalli, Bengaluru, Karnataka, India", latitude: 12.9906, longitude: 77.653 },
}

test("register, plan a trip, save it, and submit feedback", async ({ page }) => {
  const uniqueEmail = `e2e.${Date.now()}@example.com`

  await page.route("**/api/geocoding/search**", async (route) => {
    const url = new URL(route.request().url())
    const q = (url.searchParams.get("q") ?? "").toLowerCase()
    const match = q.includes("baiyappanahalli") ? SEEDED_STATIONS.baiyappanahalli : SEEDED_STATIONS.whitefield
    await route.fulfill({ json: { success: true, data: [match] } })
  })

  // ── 1. Register ──────────────────────────────────────────────────────

  await page.goto("/register")
  await page.getByLabel("Full name").fill("E2E Test User")
  await page.getByLabel("Email address").fill(uniqueEmail)
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123")
  await page.getByLabel("Confirm password").fill("TestPassword123")
  await page.getByRole("button", { name: "Create Account" }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // ── 2. Plan a trip ───────────────────────────────────────────────────

  await page.getByRole("link", { name: "Plan Trip" }).click()
  await expect(page).toHaveURL(/\/plan/)
  await expect(page.getByText("Plan Your Journey")).toBeVisible()

  // LocationSearch's placeholder text is the most specific, stable selector
  // available — the "Origin"/"Destination" <label> text is not associated
  // with its <input> via htmlFor/id, so getByLabel() doesn't resolve it.
  // The dropdown's distinctive "absolute top-full" wrapper (unique to this
  // one suggestions list, see LocationSearch.tsx) scopes the click safely;
  // clicking the first (only, since the mock above returns one) result.
  const suggestionsDropdown = page.locator("div.absolute.top-full")

  const originField = page.getByPlaceholder("Search start location…")
  await originField.fill("Whitefield Metro Station")
  await expect(suggestionsDropdown).toBeVisible({ timeout: 10_000 })
  await suggestionsDropdown.locator("button").first().click()

  const destinationField = page.getByPlaceholder("Search destination…")
  await destinationField.fill("Baiyappanahalli Metro Station")
  await expect(suggestionsDropdown).toBeVisible({ timeout: 10_000 })
  await suggestionsDropdown.locator("button").first().click()

  await page.getByRole("button", { name: "Find Routes" }).click()

  // Route generation itself never depends on live OSRM (haversine fallback —
  // see PHASE_6/9 docs), so this should always succeed once origin/destination
  // are set, regardless of network conditions beyond the geocoding step above.
  const saveJourneyButton = page.getByRole("button", { name: "Save Journey" })
  await expect(saveJourneyButton).toBeVisible({ timeout: 15_000 })

  // ── 3. Save the journey ──────────────────────────────────────────────

  await saveJourneyButton.click()
  await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 10_000 })

  // ── 4. Submit feedback on it from History ────────────────────────────

  await page.getByRole("link", { name: "History" }).click()
  await expect(page).toHaveURL(/\/history/)

  // The feedback form is behind a per-journey expand/collapse toggle
  // (HistoryPage.tsx's expandedId state) — open the first journey's details
  // before looking for its "Submit Feedback" button. This icon-only button
  // has no text content or aria-label, only a `title` attribute, which
  // getByRole's accessible-name matching did not reliably resolve — the
  // title attribute selector is unambiguous regardless of that computation.
  await page.locator('button[title="Open journey details"]').first().click()

  const submitFeedbackButton = page.getByRole("button", { name: "Submit Feedback" }).first()
  await expect(submitFeedbackButton).toBeVisible({ timeout: 10_000 })
  await submitFeedbackButton.click()

  await expect(page.getByText(/feedback/i).first()).toBeVisible({ timeout: 10_000 })
})

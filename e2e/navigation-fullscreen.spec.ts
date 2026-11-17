import { test, expect, type Page } from "@playwright/test"

/**
 * The live navigation screen must fill the WINDOW, not the page's content. This ran with animations on (no reduced-motion
 * emulation, unlike the screenshot audit), which is what exposed the bug: the page's entrance animation left a transform on
 * an ancestor, so the "fixed" overlay was sized to the page (a 140 px map, a cut-off panel) with the top bar and footer
 * still showing around it.
 */

async function startJourney(page: Page) {
  await page.goto("/register")
  await page.getByLabel("Full name").fill("Fullscreen Check")
  await page.getByLabel("Email address").fill(`fullscreen.${Date.now()}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123")
  await page.getByLabel("Confirm password").fill("TestPassword123")
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await page.goto("/plan")
  await page.getByRole("group", { name: "Demo trips" }).getByRole("button", { name: /Silk Board → Majestic/ }).click()
  await page.getByRole("button", { name: "Find Routes" }).click()
  await page.getByRole("button", { name: "Start Journey" }).click({ timeout: 30_000 })
  await expect(page.getByRole("dialog", { name: "Live navigation" })).toBeVisible()
  await page.waitForTimeout(1200) // let every entrance animation finish
}

for (const size of [{ width: 1280, height: 720 }, { width: 1280, height: 640 }, { width: 375, height: 812 }]) {
  test(`live navigation fills the whole window at ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "this check must run with motion on").toBe(false)
    await startJourney(page)

    const box = await page.getByRole("dialog", { name: "Live navigation" }).boundingBox()
    expect(box, "the navigation overlay has a box").not.toBeNull()
    expect(Math.round(box!.x)).toBe(0)
    expect(Math.round(box!.y)).toBe(0)
    expect(Math.round(box!.width)).toBe(size.width)
    expect(Math.round(box!.height)).toBe(size.height)

    // and the map is a large part of it: all of it beside the side panel on a laptop, half or more of a phone
    const map = await page.locator('[role="dialog"][aria-label="Live navigation"] .leaflet-container').boundingBox()
    expect(map, "the map is drawn").not.toBeNull()
    expect(map!.height / size.height).toBeGreaterThanOrEqual(size.width >= 1024 ? 0.95 : 0.45)

    // nothing from the page behind it is in front: the overlay is the topmost thing at its own corners and centre
    const covered = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Live navigation"]')!
      return [[5, 5], [innerWidth - 5, innerHeight - 5], [innerWidth / 2, innerHeight / 2]].every(([x, y]) => dialog.contains(document.elementFromPoint(x, y)))
    })
    expect(covered, "the top bar or the footer shows through the navigation screen").toBe(true)
  })
}

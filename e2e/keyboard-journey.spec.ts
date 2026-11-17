import { test, expect, type Page } from "@playwright/test"

/**
 * UI redesign Phase 10: the main journey with the keyboard alone. No mouse click and no programmatic focus: every control is
 * reached by pressing Tab (so it must be reachable, in a sensible order) and used with Enter, Space or the arrow keys. Same
 * real servers as happy-path.spec.ts; only the geocoder is answered locally, for the reasons given there.
 */

const STATIONS: Record<string, { name: string; address: string; latitude: number; longitude: number }> = {
  whitefield: { name: "Whitefield Metro Station", address: "Whitefield, Bengaluru, Karnataka, India", latitude: 12.9698, longitude: 77.75 },
  baiyappanahalli: { name: "Baiyappanahalli Metro Station", address: "Baiyappanahalli, Bengaluru, Karnataka, India", latitude: 12.9906, longitude: 77.653 },
}

/** What the focused element is called, the way a screen reader would say it (good enough for our own controls). */
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return ""
    const labelled = el.getAttribute("aria-label")
    if (labelled) return labelled
    const ids = el.getAttribute("aria-labelledby")
    if (ids) return ids.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim()
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`)
      if (label?.textContent) return label.textContent.trim()
    }
    return (el.getAttribute("title") || (el as HTMLInputElement).placeholder || el.innerText || el.textContent || "").trim()
  })
}

/** Presses Tab until the focused control's name matches, or fails after `max` presses (a control the keyboard cannot reach). */
async function tabTo(page: Page, name: string | RegExp, max = 80): Promise<void> {
  const seen: string[] = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab")
    const now = await focusedName(page)
    seen.push(now)
    if (typeof name === "string" ? now === name : name.test(now)) return
  }
  throw new Error(`Tab never reached "${name}" in ${max} presses. It stopped on: ${seen.slice(0, 15).join(" | ")} …`)
}

test("sign up, plan, save and review a journey using only the keyboard", async ({ page }) => {
  await page.route("**/api/geocoding/search**", async (route) => {
    const q = (new URL(route.request().url()).searchParams.get("q") ?? "").toLowerCase()
    await route.fulfill({ json: { success: true, data: [q.includes("baiyappanahalli") ? STATIONS.baiyappanahalli : STATIONS.whitefield] } })
  })

  // ── The skip link is the first stop on every page and moves focus to the content ──
  await page.goto("/register")
  await page.keyboard.press("Tab")
  expect(await focusedName(page)).toBe("Skip to main content")
  await page.keyboard.press("Enter")
  await expect(page.locator("#main-content")).toBeFocused()

  // ── Sign up: Tab through the form in order, Enter submits ──
  const email = `kbd.${Date.now()}@example.com`
  await page.goto("/register")
  await tabTo(page, "Full name")
  await page.keyboard.type("Keyboard User")
  await tabTo(page, "Email address")
  await page.keyboard.type(email)
  await tabTo(page, "Password")
  await page.keyboard.type("TestPassword123")
  await tabTo(page, "Confirm password")
  await page.keyboard.type("TestPassword123")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // A focused control is visibly marked (an outline or a ring), not just focused.
  await page.keyboard.press("Tab") // skip link
  await tabTo(page, "Plan Trip")
  const marked = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as HTMLElement)
    return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow !== "none" && s.boxShadow !== "")
  })
  expect(marked, "the focused nav link shows a focus indicator").toBe(true)
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/plan/)

  // ── Plan: type a place, pick it with the arrow keys and Enter ──
  await tabTo(page, "Origin")
  await page.keyboard.type("Whitefield Metro Station")
  await expect(page.getByRole("listbox", { name: "Origin suggestions" })).toBeVisible({ timeout: 10_000 })
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue("Whitefield Metro Station")

  await tabTo(page, "Destination")
  await page.keyboard.type("Baiyappanahalli Metro Station")
  await expect(page.getByRole("listbox", { name: "Destination suggestions" })).toBeVisible({ timeout: 10_000 })
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue("Baiyappanahalli Metro Station")

  await tabTo(page, "Find Routes")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Route 1", { exact: true })).toBeVisible({ timeout: 30_000 })
  await tabTo(page, "Save Journey", 120)
  await page.keyboard.press("Enter")
  await expect(page.getByText("Journey saved to your history.")).toBeVisible({ timeout: 10_000 })

  // ── History: open the journey and send feedback ──
  await page.goto("/history")
  await tabTo(page, "Open journey details")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "Collapse journey details" })).toHaveAttribute("aria-expanded", "true")
  await tabTo(page, "4 out of 5 stars")
  await page.keyboard.press("Space")
  await expect(page.getByRole("button", { name: "4 out of 5 stars" })).toHaveAttribute("aria-pressed", "true")
  await tabTo(page, "Submit Feedback")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "Update Feedback" })).toBeVisible({ timeout: 10_000 })
})

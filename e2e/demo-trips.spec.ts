import { test, expect } from "@playwright/test"

/**
 * Each one-tap demo trip on Plan Trip must really produce routes on the real backend, with no place search at all (the
 * geocoder is not called: it is deliberately not mocked here, so a request to it would reach the real service).
 */

const TRIPS = [
  { chip: "Whitefield → Baiyappanahalli", origin: "Whitefield Metro Station", destination: "Baiyappanahalli Metro Station" },
  { chip: "Hoodi → MG Road", origin: "Hoodi Metro Station", destination: "MG Road Metro Station" },
  { chip: "Silk Board → Majestic", origin: "Silk Board Junction", destination: "Majestic Kempegowda Bus Station" },
  { chip: "MG Road → Majestic", origin: "MG Road Metro Station", destination: "Majestic Metro Station" },
]

test("every demo trip plans a real route with one tap", async ({ page }) => {
  let geocoded = 0
  await page.route("**/api/geocoding/**", async (route) => {
    geocoded++
    await route.abort()
  })

  await page.goto("/register")
  await page.getByLabel("Full name").fill("Demo Trips User")
  await page.getByLabel("Email address").fill(`demo.${Date.now()}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123")
  await page.getByLabel("Confirm password").fill("TestPassword123")
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  for (const trip of TRIPS) {
    await page.goto("/plan")
    const group = page.getByRole("group", { name: "Demo trips" })
    await expect(group).toBeVisible()
    await group.getByRole("button", { name: new RegExp(trip.chip) }).click()
    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue(trip.origin)
    await expect(page.getByRole("combobox", { name: "Destination" })).toHaveValue(trip.destination)
    await expect(group).toBeHidden() // the chips step aside once a trip is chosen
    await page.getByRole("button", { name: "Find Routes" }).click()
    await expect(page.getByText("Route 1", { exact: true }), `${trip.chip} gave no route`).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Start Journey" })).toBeVisible()
  }
  expect(geocoded, "the demo trips must not need the place-search service").toBe(0)
})

test("the Hoodi to MG Road trip tells the wheelchair story: a route is still recommended, and the excluded ones are explained", async ({ page }) => {
  await page.goto("/register")
  await page.getByLabel("Full name").fill("Wheelchair Story")
  await page.getByLabel("Email address").fill(`story.${Date.now()}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill("TestPassword123")
  await page.getByLabel("Confirm password").fill("TestPassword123")
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  await page.goto("/plan")
  await page.getByRole("group", { name: "Demo trips" }).getByRole("button", { name: /Hoodi → MG Road/ }).click()
  await page.getByRole("button", { name: "Wheelchair" }).click()
  await page.getByRole("button", { name: "Find Routes" }).click()
  await expect(page.getByRole("button", { name: "Start Journey" })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/excluded for your Wheelchair profile/)).toBeVisible()
})

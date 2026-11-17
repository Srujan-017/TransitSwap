import { defineConfig, devices } from "@playwright/test"
import { UI_AUDIT_ADMIN } from "./ui-audit/accounts"

// UI redesign (see UI_REDESIGN_PLAN.md) — a screenshot + accessibility audit of every screen at 375, 768 and 1280 px.
// Separate from playwright.config.ts so the real end-to-end test (e2e/) is unaffected.
//
//   npx playwright test -c playwright.screens.config.ts                 → docs/ui-redesign/before/
//   UI_SHOTS=phase-4 npx playwright test -c playwright.screens.config.ts → docs/ui-redesign/phase-4/
//
// The backend is the real server on a throwaway in-memory MongoDB with fixed clear weather (see
// backend/scripts/ui-screens-launch.js). Nothing here touches the live site.
export default defineConfig({
  testDir: "./ui-audit",
  testMatch: /screens\.spec\.ts/,
  // One long test: about 20 screens x 3 viewports, each with a full-page screenshot and an axe scan.
  timeout: 600_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    // Screenshots are taken with motion off so they are stable; UI_MOTION=on runs the same audit with real animations, which
    // is how a real visitor sees the app (an entrance animation once left a transform behind that broke every fixed overlay).
    reducedMotion: process.env.UI_MOTION === "on" ? "no-preference" : "reduce",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/ui-screens-launch.js",
      cwd: "./backend",
      port: 5000,
      timeout: 90_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ADMIN_NAME: UI_AUDIT_ADMIN.name,
        ADMIN_EMAIL: UI_AUDIT_ADMIN.email,
        ADMIN_PASSWORD: UI_AUDIT_ADMIN.password,
      },
    },
    {
      command: "npm run dev",
      port: 5173,
      timeout: 30_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
})

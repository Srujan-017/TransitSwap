import { defineConfig, devices } from "@playwright/test"
import { UI_AUDIT_ADMIN } from "../../ui-audit/accounts"

// Captures the application screenshots used on the competition poster (docs/poster/assets/shot-*.png).
// Same throwaway stack as the screenshot audit: the real frontend and backend, an in-memory database, fixed clear weather.
//
//   npx playwright test -c docs/poster/playwright.poster.config.ts
export default defineConfig({
  testDir: ".",
  testMatch: /shots\.spec\.ts/,
  timeout: 600_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:5173", trace: "off", reducedMotion: "reduce" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/ui-screens-launch.js",
      cwd: "../../backend",
      port: 5000,
      timeout: 90_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: { ADMIN_NAME: UI_AUDIT_ADMIN.name, ADMIN_EMAIL: UI_AUDIT_ADMIN.email, ADMIN_PASSWORD: UI_AUDIT_ADMIN.password },
    },
    { command: "npm run dev", cwd: "../..", port: 5173, timeout: 30_000, reuseExistingServer: false, stdout: "pipe", stderr: "pipe" },
  ],
})

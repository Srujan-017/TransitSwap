import { defineConfig, devices } from "@playwright/test"

// Phase 10 — one E2E happy path (register -> plan -> save -> feedback), per
// PROJECT_MASTER_PLAN.md §39 Phase 10. Both the frontend and backend are
// started as real dev servers for the test run (not mocked): the backend via
// backend/scripts/e2e-launch.js, which spins up a real in-memory MongoDB
// first (see that file's own comment) so register/save/feedback — all of
// which throw a 503 with no DB — actually work end to end.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node scripts/e2e-launch.js",
      cwd: "./backend",
      port: 5000,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
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

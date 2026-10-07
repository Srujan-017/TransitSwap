import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Phase 10 — separate from vite.config.ts (which stays focused on the real
// build) so adding component-test tooling never risks the production build
// config. Reuses the same '@' alias as vite.config.ts so component tests can
// import pages/components exactly as the app does.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Scoped to the frontend's own src/ — without this, Vitest's default
    // test-file glob also picks up backend/src/__tests__/**/*.test.ts (a
    // completely separate, plain ts-node + assert test suite, run only via
    // backend/scripts/run-tests.js) and fails every one of them with
    // "No test suite found", since they don't use describe()/it().
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    // jsdom scopes localStorage/sessionStorage to the document's origin and
    // leaves Storage disabled entirely on the default "about:blank" origin —
    // AuthContext reads/writes localStorage on every render, so without a
    // real http(s) URL here every test touching it fails with
    // "Cannot read properties of undefined (reading 'clear'/'getItem'/...)".
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5173',
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
})

/**
 * Test-only accounts for the UI screenshot and accessibility audit (playwright.screens.config.ts).
 *
 * They exist only inside the throwaway in-memory MongoDB that backend/scripts/ui-screens-launch.js starts for an
 * audit run, and vanish when it stops. They are never created on the live site or in any real database.
 */
export const UI_AUDIT_ADMIN = {
  name: "UI Audit Admin",
  email: "ui.audit.admin@example.test",
  password: "UiAuditAdmin#2026",
}

export const UI_AUDIT_USER_PASSWORD = "UiAuditUser#2026"

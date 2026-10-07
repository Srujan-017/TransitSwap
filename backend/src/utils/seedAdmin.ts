import mongoose from "mongoose"
import { User } from "../models/User"

/**
 * Problem 23 — secure admin bootstrap.
 *
 * Run manually with: npx ts-node --transpile-only src/utils/seedAdmin.ts
 * Requires ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and MONGODB_URI in the environment.
 *
 * There is deliberately no public API for creating an admin account — this script
 * is the only path, and it never overwrites an existing user or promotes an
 * existing account without explicit confirmation.
 */
async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set. Cannot seed an admin account without a database.")
    process.exit(1)
  }
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables before running this script.")
    process.exit(1)
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.")
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })
  if (existing) {
    if (existing.role === "admin") {
      console.log(`An admin account already exists for ${ADMIN_EMAIL}. No changes made.`)
    } else {
      console.log(`A user already exists for ${ADMIN_EMAIL} but is not an admin. Refusing to silently promote — remove this account or choose a different ADMIN_EMAIL if you intend to create a new admin.`)
    }
    await mongoose.disconnect()
    process.exit(0)
  }

  const admin = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    password: ADMIN_PASSWORD,
    role: "admin",
  })

  console.log(`Admin account created: ${admin.email} (id: ${admin.id})`)
  await mongoose.disconnect()
  process.exit(0)
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin account:", err)
  process.exit(1)
})

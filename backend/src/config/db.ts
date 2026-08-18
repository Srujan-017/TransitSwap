import mongoose from "mongoose"
import dns from "dns"
import { env } from "./env"

dns.setServers(["1.1.1.1", "8.8.8.8"])
export async function connectDB(): Promise<void> {
  if (!env.MONGODB_URI) {
    console.warn("⚠️  Skipping DB connection — MONGODB_URI not configured. Auth, journey history, and reports will not work until it is set.")
    return
  }

  try {
    await mongoose.connect(env.MONGODB_URI)
    console.log("✅  MongoDB Atlas connected successfully")
  } catch (err) {
    // Do NOT crash the server here. Every service in this app (journeyService,
    // accessibilityService, crowdService) already checks mongoose.connection.readyState
    // and falls back to demo data / a clear 503 error when the database is unavailable.
    // Exiting the process on a failed connection would break that design and take down
    // features (weather, demo transit routing, accessibility filtering) that don't need Mongo at all.
    console.error("❌  MongoDB connection failed. The server will keep running on demo data.")
    console.error("    Check MONGODB_URI in your .env file — it must be a real connection string")
    console.error("    from MongoDB Atlas, not the <username>/<password>/<cluster> placeholder.")
    console.error("   ", err instanceof Error ? err.message : err)
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected")
})


import app from "./app"
import { connectDB } from "./config/db"
import { env } from "./config/env"
import { seedDemoUser } from "./utils/seedDemoUser"
import { historicalReliabilityService } from "./services/reliability/historicalReliabilityService"
import { accessibilityService } from "./services/accessibilityService"

async function start() {
  await connectDB()
  await seedDemoUser()
  await historicalReliabilityService.seedDemoObservationsIfEmpty()
  await accessibilityService.seedDemoAccessibilityIfEmpty()

  const server = app.listen(Number(env.PORT), () => {
    console.log(`
╔══════════════════════════════════════════════╗
║           TransitSwap API Server             ║
║──────────────────────────────────────────────║
║  Status  : Running                           ║
║  Port    : ${env.PORT.padEnd(34)}║
║  Env     : ${env.NODE_ENV.padEnd(34)}║
║  Health  : http://localhost:${env.PORT}/api/health  ║
╚══════════════════════════════════════════════╝
    `)
  })

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n🛑 ${signal} received — shutting down gracefully`)
    server.close(() => {
      console.log("✅ Server closed")
      process.exit(0)
    })
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err)
  process.exit(1)
})

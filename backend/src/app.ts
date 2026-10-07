import express, { type Request, type Response } from "express"
import cors from "cors"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import { env } from "./config/env"
import router from "./routes"
import { errorHandler } from "./middleware/errorHandler"

const app = express()

// Trust proxy (for deployment behind Vercel/Render)
app.set("trust proxy", 1)

// CORS
// In development we allow any localhost/127.0.0.1 origin (any port) so switching the
// frontend dev server port never silently breaks requests with a confusing CORS error.
// In production we only trust the configured FRONTEND_URL.
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/
app.use(
  cors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin) return callback(null, true) // same-origin / curl / server-to-server
      if (origin === env.FRONTEND_URL) return callback(null, true)
      if (env.NODE_ENV !== "production" && localhostOriginPattern.test(origin)) return callback(null, true)
      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
)

// Request logging
if (env.NODE_ENV !== "production") {
  app.use(morgan("dev"))
}

// Body parsing
app.use(express.json({ limit: "200kb" }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
})
app.use("/api", limiter)

// API routes
app.use("/api", router)

// Root
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    name: "TransitSwap API",
    version: "3.0.0",
    phase: "Phase 30 — AI-assisted Urban Mobility Intelligence Platform",
    description: "Multi-criteria intelligent routing: weighted scoring, rule-based accessibility, prototype reliability estimates, simulation-based connection risk, and TransitDNA adaptive preference learning.",
    docs: "/api/health",
  })
})

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` })
})

// Central error handler
app.use(errorHandler)

export default app

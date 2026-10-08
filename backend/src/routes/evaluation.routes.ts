import { Router } from "express"
import {
  getEvaluationMetrics,
  getHistoricalStats,
  getMLEvaluation,
  getMLStatus,
  getReliabilityEvaluation,
} from "../controllers/evaluationController"
import { requireAuth } from "../middleware/auth"

const router = Router()

// Phase 11 (S4) fix — these 5 research/diagnostic endpoints were previously
// unauthenticated, and getEvaluationMetrics runs multiple full route
// generations plus Monte Carlo simulation per call: a cheap DoS / cost
// amplification vector for anyone who could reach it. Every route here now
// requires a valid JWT, same as every other non-public endpoint.
router.use(requireAuth)

router.get("/", getEvaluationMetrics)
router.get("/ml", getMLEvaluation)
router.get("/ml/status", getMLStatus)
router.get("/reliability/evaluation", getReliabilityEvaluation)
router.get("/reliability/stats", getHistoricalStats)

export default router



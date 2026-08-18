import { Router } from "express"
import {
  getEvaluationMetrics,
  getHistoricalStats,
  getMLEvaluation,
  getMLStatus,
  getReliabilityEvaluation,
} from "../controllers/evaluationController"

const router = Router()

router.get("/", getEvaluationMetrics)
router.get("/ml", getMLEvaluation)
router.get("/ml/status", getMLStatus)
router.get("/reliability/evaluation", getReliabilityEvaluation)
router.get("/reliability/stats", getHistoricalStats)

export default router



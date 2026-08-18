import { Router } from "express"
import { body, param } from "express-validator"
import { getCrowdHistory, getStationCrowd, reportCrowd } from "../controllers/crowdController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

router.post(
  "/report",
  requireAuth,
  [
    body("stationId").isString().trim().isLength({ min: 2, max: 80 }).withMessage("Station id is required"),
    body("stationName").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Station name is required"),
    body("transportMode").isIn(["metro", "bus"]).withMessage("Transport mode must be metro or bus"),
    body("crowdLevel").isIn(["LOW", "MEDIUM", "HIGH"]).withMessage("Crowd level must be LOW, MEDIUM or HIGH"),
  ],
  validate,
  reportCrowd,
)
router.get("/station/:stationId", requireAuth, param("stationId").isString().trim().isLength({ min: 2, max: 80 }), validate, getStationCrowd)
router.get("/history/:stationId", requireAuth, param("stationId").isString().trim().isLength({ min: 2, max: 80 }), validate, getCrowdHistory)

export default router

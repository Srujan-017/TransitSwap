import { Router } from "express"
import { body, param } from "express-validator"
import {
  getAccessibilityStation,
  getStationReports,
  listAccessibilityStations,
  reportAccessibilityIssue,
} from "../controllers/accessibilityController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

router.get("/stations", requireAuth, listAccessibilityStations)
router.get(
  "/stations/:stationId",
  requireAuth,
  param("stationId").isString().trim().isLength({ min: 2, max: 80 }),
  validate,
  getAccessibilityStation,
)
router.get(
  "/stations/:stationId/reports",
  requireAuth,
  param("stationId").isString().trim().isLength({ min: 2, max: 80 }),
  validate,
  getStationReports,
)
router.post(
  "/report",
  requireAuth,
  [
    body("stationId").isString().trim().isLength({ min: 2, max: 80 }).withMessage("Station id is required"),
    body("stationName").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Station name is required"),
    body("issueType")
      .isIn([
        "lift_unavailable",
        "ramp_blocked",
        "escalator_not_working",
        "stairs_issue",
        "entrance_blocked",
        "tactile_paving_damaged",
        "accessible_toilet_unavailable",
        "station_accessibility_issue",
        "other",
      ])
      .withMessage("Invalid issue type"),
    body("description").isString().trim().isLength({ min: 5, max: 600 }).withMessage("Description is required"),
  ],
  validate,
  reportAccessibilityIssue,
)

export default router

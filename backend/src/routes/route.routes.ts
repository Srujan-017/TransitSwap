import { Router } from "express"
import { body } from "express-validator"
import { calculateRoute } from "../controllers/routeController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

const routeValidation = [
  body("origin.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Origin latitude must be a number between -90 and 90"),
  body("origin.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Origin longitude must be a number between -180 and 180"),
  body("destination.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Destination latitude must be a number between -90 and 90"),
  body("destination.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Destination longitude must be a number between -180 and 180"),
  body("mode")
    .optional()
    .isIn(["driving", "walking", "cycling"])
    .withMessage("Mode must be one of: driving, walking, cycling"),
]

// POST /api/routes  — calculate a route between two coordinates
router.post("/", requireAuth, routeValidation, validate, calculateRoute)

export default router

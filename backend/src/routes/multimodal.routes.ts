import { Router } from "express"
import { body, query } from "express-validator"
import { calculateMultimodalRoute, getNearbyTransit } from "../controllers/multimodalController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

const multimodalValidation = [
  body("origin.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Origin latitude must be between -90 and 90"),
  body("origin.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Origin longitude must be between -180 and 180"),
  body("destination.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Destination latitude must be between -90 and 90"),
  body("destination.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Destination longitude must be between -180 and 180"),
  body("profile")
    .optional()
    .isString()
    .isLength({ max: 40 })
    .withMessage("Profile must be a string"),
]

// Problem 11 — Nearby Transit validation
const nearbyTransitValidation = [
  query("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("latitude must be between -90 and 90"),
  query("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("longitude must be between -180 and 180"),
]

// POST /api/routes/multimodal  — Phase 3 multimodal route generation
router.post("/multimodal", requireAuth, multimodalValidation, validate, calculateMultimodalRoute)

// GET /api/routes/nearby — Problem 11 nearby transit discovery. Kept behind the
// same requireAuth convention as the sibling /multimodal endpoint above rather
// than introducing a new unauthenticated pattern into the API.
router.get("/nearby", requireAuth, nearbyTransitValidation, validate, getNearbyTransit)

export default router

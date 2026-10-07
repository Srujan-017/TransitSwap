import { Router } from "express"
import { body } from "express-validator"
import { register, login, getMe, updateProfile, updatePreferences, resetTransitDna } from "../controllers/authController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters"),
  body("email")
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("accessibilityProfile")
    .optional()
    .isIn(["standard", "wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility"])
    .withMessage("Invalid accessibility profile"),
]

const loginValidation = [
  body("email")
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required"),
]

// Phase 4 fix (B6) — PUT /profile and /preferences had no express-validator
// rules at all. Bad input either slipped through as-is (authService.updateProfile
// assigns req.body fields directly) or surfaced as an opaque 500 from a Mongoose
// ValidationError instead of a clear, field-level 400 — the README's "input
// validation on all POST/PUT endpoints" claim was false for these two routes.
const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters"),
  body("accessibilityProfile")
    .optional()
    .isIn(["standard", "wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility"])
    .withMessage("Invalid accessibility profile"),
]

const updatePreferencesValidation = [
  body("preferredMode")
    .optional()
    .isIn(["metro", "bus", "walking", "auto", "any"])
    .withMessage("Invalid preferred mode"),
  body("walkingTolerance")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Invalid walking tolerance"),
  body("budgetPreference")
    .optional()
    .isIn(["cheapest", "balanced", "comfort"])
    .withMessage("Invalid budget preference"),
  body("prioritize")
    .optional()
    .isIn(["speed", "comfort", "reliability", "accessibility"])
    .withMessage("Invalid priority"),
]

// validate() sits between the rules and the controller.
// If any rule fails, validate() returns 400 and the controller never runs.
router.post("/register", registerValidation, validate, register)
router.post("/login",    loginValidation,    validate, login)
router.get("/me",        requireAuth,                  getMe)
router.put("/profile",     requireAuth, updateProfileValidation,     validate, updateProfile)
router.put("/preferences", requireAuth, updatePreferencesValidation, validate, updatePreferences)
router.post("/transitdna/reset", requireAuth,          resetTransitDna)

export default router


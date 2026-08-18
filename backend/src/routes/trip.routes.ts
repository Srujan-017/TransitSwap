import { Router } from "express"
import { body, param } from "express-validator"
import {
  deleteJourney,
  deleteSavedDestination,
  getJourney,
  getJourneyHistory,
  getSavedDestinations,
  saveDestination,
  saveJourney,
  submitFeedback,
} from "../controllers/tripController"
import {
  deleteSavedRoute,
  getSavedRoute,
  getSavedRoutes,
  saveRoute,
} from "../controllers/savedRouteController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

const locationRules = (prefix: string) => [
  body(`${prefix}.name`).isString().trim().isLength({ min: 1, max: 160 }).withMessage(`${prefix} name is required`),
  body(`${prefix}.latitude`).isFloat({ min: -90, max: 90 }).withMessage(`${prefix} latitude is invalid`),
  body(`${prefix}.longitude`).isFloat({ min: -180, max: 180 }).withMessage(`${prefix} longitude is invalid`),
]

const journeyValidation = [
  ...locationRules("origin"),
  ...locationRules("destination"),
  body("selectedRoute.id").isString().notEmpty().withMessage("Route id is required"),
  body("selectedRoute.segments").isArray({ min: 1 }).withMessage("Route segments are required"),
  body("selectedRoute.totalDistanceMeters").isFloat({ min: 0 }).withMessage("Route distance is invalid"),
  body("selectedRoute.totalDurationSeconds").isFloat({ min: 0 }).withMessage("Route duration is invalid"),
  body("selectedRoute.totalFare").isFloat({ min: 0 }).withMessage("Route fare is invalid"),
  body("selectedRoute.totalWalkingMeters").isFloat({ min: 0 }).withMessage("Walking distance is invalid"),
  body("selectedRoute.transferCount").isInt({ min: 0 }).withMessage("Transfer count is invalid"),
  // Problem 21 — optional real departure date/time the user picked while
  // planning (e.g. "2026-08-16T08:30:00"). Never required; never invented
  // server-side if absent.
  body("departureTime").optional({ values: "falsy" }).isString().isLength({ max: 40 }),
]

const destinationValidation = [
  body("name").isString().trim().isLength({ min: 2, max: 60 }).withMessage("Destination name must be 2-60 characters"),
  body("address").isString().trim().isLength({ min: 2, max: 240 }).withMessage("Address is required"),
  body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Latitude is invalid"),
  body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Longitude is invalid"),
]

// Problem 10 — Saved Routes validation. Reuses the same route-snapshot shape
// already validated for journeys (journeyValidation), plus a name field.
const savedRouteValidation = [
  body("name").isString().trim().isLength({ min: 1, max: 80 }).withMessage("Route name is required"),
  ...journeyValidation,
]

// Problem 15 — Feedback validation. Restricting `issues` to this fixed list
// (matching the values the frontend actually offers) prevents arbitrary/unsafe
// strings from being stored while keeping the same simple Journey.userFeedback
// shape.
const FEEDBACK_ISSUE_VALUES = [
  "too_slow",
  "too_expensive",
  "too_crowded",
  "too_much_walking",
  "transfer_problem",
  "accessibility_problem",
  "weather_problem",
  "other",
]

const feedbackValidation = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Comment must be 500 characters or fewer"),
  body("issues").optional().isArray({ max: 8 }).withMessage("Issues must be a list"),
  body("issues.*")
    .isString()
    .isIn(FEEDBACK_ISSUE_VALUES)
    .withMessage(`Each issue must be one of: ${FEEDBACK_ISSUE_VALUES.join(", ")}`),
  // Problem 21 — optional actual journey duration (minutes). Must be a finite
  // number strictly between 0 and 24h when present; absent entirely is fine.
  body("actualDurationMinutes")
    .optional()
    .isFloat({ min: 1, max: 1440 })
    .withMessage("Enter an actual journey duration between 1 and 1440 minutes."),
]

router.use(requireAuth)

router.post("/save", journeyValidation, validate, saveJourney)
router.get("/history", getJourneyHistory)
router.post("/destinations", destinationValidation, validate, saveDestination)
router.get("/destinations", getSavedDestinations)
router.delete("/destinations/:id", param("id").isMongoId().withMessage("Invalid destination id"), validate, deleteSavedDestination)

// Problem 10 — Saved Routes. Registered before the generic /:id routes below so
// "saved-routes" is never mistaken for a journey id.
router.post("/saved-routes", savedRouteValidation, validate, saveRoute)
router.get("/saved-routes", getSavedRoutes)
router.get("/saved-routes/:id", param("id").isMongoId().withMessage("Invalid saved route id"), validate, getSavedRoute)
router.delete("/saved-routes/:id", param("id").isMongoId().withMessage("Invalid saved route id"), validate, deleteSavedRoute)

router.post("/:id/feedback", param("id").isMongoId().withMessage("Invalid journey id"), feedbackValidation, validate, submitFeedback)
router.get("/:id", param("id").isMongoId().withMessage("Invalid journey id"), validate, getJourney)
router.delete("/:id", param("id").isMongoId().withMessage("Invalid journey id"), validate, deleteJourney)

export default router


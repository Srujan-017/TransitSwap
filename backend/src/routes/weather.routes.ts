import { Router } from "express"
import { query } from "express-validator"
import { getCurrentWeather } from "../controllers/weatherController"
import { requireAuth } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

const coordinateValidation = [
  query("latitude").isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),
  query("longitude").isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),
]

router.get("/", requireAuth, coordinateValidation, validate, getCurrentWeather)
router.get("/current", requireAuth, coordinateValidation, validate, getCurrentWeather)

export default router

import { Router } from "express"
import { searchLocations } from "../controllers/geocodingController"
import { requireAuth } from "../middleware/auth"

const router = Router()

// GET /api/geocoding/search?q=<query>
// Proxies Nominatim — requires authentication to prevent public API abuse
router.get("/search", requireAuth, searchLocations)

export default router

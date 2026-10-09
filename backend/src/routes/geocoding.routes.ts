import { Router } from "express"
import { searchLocations, reverseGeocode } from "../controllers/geocodingController"
import { requireAuth } from "../middleware/auth"

const router = Router()

// GET /api/geocoding/search?q=<query>
// Proxies Nominatim — requires authentication to prevent public API abuse
router.get("/search", requireAuth, searchLocations)

// GET /api/geocoding/reverse?lat=<lat>&lng=<lng>
// "What's here?" — resolves a clicked map coordinate to a real place name.
router.get("/reverse", requireAuth, reverseGeocode)

export default router

import { Router } from "express"
import { body, param, query } from "express-validator"
import {
  getOverview,
  listStations,
  createStation,
  updateStation,
  deactivateStation,
  deleteStation,
  listAccessibility,
  updateAccessibility,
  setLiftStatus,
  listCrowdReports,
  deleteCrowdReport,
  listFeedback,
  getDataset,
} from "../controllers/adminController"
import { requireAuth, requireAdmin } from "../middleware/auth"
import { validate } from "../middleware/validate"

const router = Router()

// Every admin route requires a valid JWT AND role === "admin". requireAuth runs
// first so requireAdmin can trust req.user without re-verifying the token.
router.use(requireAuth, requireAdmin)

router.get("/overview", getOverview)

router.get("/stations", listStations)
router.post(
  "/stations",
  [
    body("stationId").isString().trim().isLength({ min: 2, max: 40 }),
    body("stationName").isString().trim().isLength({ min: 2, max: 120 }),
    body("transportMode").isIn(["metro", "bus"]),
    body("latitude").optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
    body("longitude").optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  ],
  validate,
  createStation,
)
// Phase 4 fix (B6) — this used to validate only the :stationId path param.
// adminService.updateStation() assigns stationName/latitude/longitude/
// active/notes straight onto the document with no range check of its own
// (createStation's sibling route already validates these same fields —
// this route just never matched it), so an admin could store e.g.
// latitude: 999, silently corrupting every haversine distance calculation
// and the map marker for that station.
const updateStationValidation = [
  param("stationId").isString().trim().isLength({ min: 2, max: 40 }),
  body("stationName").optional().isString().trim().isLength({ min: 2, max: 120 }),
  body("latitude").optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body("longitude").optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body("active").optional().isBoolean(),
  body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
]

router.put("/stations/:stationId", updateStationValidation, validate, updateStation)
router.put("/stations/:stationId/deactivate", param("stationId").isString().trim().isLength({ min: 2, max: 40 }), validate, deactivateStation)
router.delete("/stations/:stationId", param("stationId").isString().trim().isLength({ min: 2, max: 40 }), validate, deleteStation)

// Phase 4 fix (B6) — same gap as updateStationValidation above, for the
// allowed fields in adminService.updateAccessibility().
const updateAccessibilityValidation = [
  param("stationId").isString().trim().isLength({ min: 2, max: 40 }),
  body("hasLift").optional({ nullable: true }).isBoolean(),
  body("hasRamp").optional({ nullable: true }).isBoolean(),
  body("hasEscalator").optional({ nullable: true }).isBoolean(),
  body("stairCount").optional({ nullable: true }).isInt({ min: 0 }),
  body("tactilePaving").optional({ nullable: true }).isBoolean(),
  body("accessibleToilet").optional({ nullable: true }).isBoolean(),
  body("wheelchairAccessible").optional({ nullable: true }).isBoolean(),
  body("stepFreeEntrance").optional({ nullable: true }).isBoolean(),
  body("stepFreePlatform").optional({ nullable: true }).isBoolean(),
  body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
]

router.get("/accessibility", listAccessibility)
router.put("/accessibility/:stationId", updateAccessibilityValidation, validate, updateAccessibility)
router.put(
  "/accessibility/:stationId/lift",
  [
    param("stationId").isString().trim().isLength({ min: 2, max: 40 }),
    body("liftStatus").isIn(["working", "broken"]).withMessage('liftStatus must be "working" or "broken"'),
  ],
  validate,
  setLiftStatus,
)

router.get("/crowd", listCrowdReports)
router.delete("/crowd/:reportId", param("reportId").isMongoId(), validate, deleteCrowdReport)

router.get(
  "/feedback",
  [query("rating").optional().isInt({ min: 1, max: 5 }), query("issue").optional().isString().trim()],
  validate,
  listFeedback,
)

router.get("/dataset", getDataset)

export default router

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
router.put("/stations/:stationId", param("stationId").isString().trim().isLength({ min: 2, max: 40 }), validate, updateStation)
router.put("/stations/:stationId/deactivate", param("stationId").isString().trim().isLength({ min: 2, max: 40 }), validate, deactivateStation)
router.delete("/stations/:stationId", param("stationId").isString().trim().isLength({ min: 2, max: 40 }), validate, deleteStation)

router.get("/accessibility", listAccessibility)
router.put("/accessibility/:stationId", param("stationId").isString().trim().isLength({ min: 2, max: 40 }), validate, updateAccessibility)
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

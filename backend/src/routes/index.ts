import { Router } from "express"
import healthRouter from "./health.routes"
import authRouter from "./auth.routes"
import geocodingRouter from "./geocoding.routes"
import routeRouter from "./route.routes"
import multimodalRouter from "./multimodal.routes"
import tripRouter from "./trip.routes"
import weatherRouter from "./weather.routes"
import accessibilityRouter from "./accessibility.routes"
import crowdRouter from "./crowd.routes"
import evaluationRouter from "./evaluation.routes"
import adminRouter from "./admin.routes"

const router = Router()

router.use("/health", healthRouter)
router.use("/auth", authRouter)

router.use("/geocoding", geocodingRouter)
router.use("/routes", routeRouter)
router.use("/routes", multimodalRouter)
router.use("/trips", tripRouter)
router.use("/weather", weatherRouter)
router.use("/accessibility", accessibilityRouter)
router.use("/crowd", crowdRouter)
router.use("/evaluation", evaluationRouter)
router.use("/admin", adminRouter)

export default router


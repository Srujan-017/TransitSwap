import type { Request, Response, NextFunction } from "express"
import { evaluationService } from "../services/evaluationService"
import { mlEvaluationService } from "../services/ml/mlEvaluationService"
import { mlPreferenceService } from "../services/ml/mlPreferenceService"
import { historicalReliabilityService } from "../services/reliability/historicalReliabilityService"
import { sendSuccess } from "../utils/response"

export async function getEvaluationMetrics(_req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await evaluationService.runEvaluation()
    sendSuccess(
      res,
      metrics,
      "Evaluation metrics computed comparing TransitSwap Multi-Criteria Engine vs Shortest-Time and Lowest-Cost Baselines.",
    )
  } catch (err: unknown) {
    next(err)
  }
}

export async function getMLEvaluation(req: Request, res: Response, next: NextFunction) {
  try {
    const authUserId = (req as unknown as { user?: { userId: string } }).user?.userId
    const report = await mlEvaluationService.runMLEvaluation(authUserId)
    sendSuccess(
      res,
      report,
      "Pairwise Logistic Regression Learning-to-Rank Model Evaluation vs Rule-Based Baseline.",
    )
  } catch (err: unknown) {
    next(err)
  }
}

export async function getMLStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const authUserId = (req as unknown as { user?: { userId: string } }).user?.userId
    const status = await mlPreferenceService.getModelStatus(authUserId)
    sendSuccess(res, status, "Current ML Model Status & Learned Preference Weights.")
  } catch (err: unknown) {
    next(err)
  }
}

export async function getReliabilityEvaluation(_req: Request, res: Response, next: NextFunction) {
  try {
    const report = await historicalReliabilityService.calculateCoverageEvaluation()
    sendSuccess(res, report, "Empirical prediction interval coverage evaluation calculated on unseen historical test set.")
  } catch (err: unknown) {
    next(err)
  }
}

export async function getHistoricalStats(req: Request, res: Response, next: NextFunction) {
  try {
    const mode = req.query.transportMode as string | undefined
    const routeId = req.query.routeId as string | undefined
    const stats = await historicalReliabilityService.getHistoricalStatistics(mode, routeId)
    sendSuccess(res, stats, "Data-driven historical prediction error statistics.")
  } catch (err: unknown) {
    next(err)
  }
}



import type { Request, Response } from "express"
import mongoose from "mongoose"
import { sendSuccess } from "../utils/response"

export function getHealth(_req: Request, res: Response) {
  sendSuccess(res, {
    status: "ok",
    message: "TransitSwap API is running",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    version: "3.0.0",
    phase: "Phase 30 — AI-assisted Urban Mobility Intelligence Platform",
  })
}

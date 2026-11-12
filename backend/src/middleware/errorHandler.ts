import type { Request, Response, NextFunction } from "express"
import mongoose from "mongoose"

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  // Optional structured detail returned to the client as `data` — e.g. the list
  // of candidate routes that were excluded when no accessible route is left.
  data?: unknown

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.data = data
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  let message = err.message || "Internal server error"
  let statusCode = 500

  if (err instanceof AppError) {
    statusCode = err.statusCode
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400
    message = Object.values(err.errors).map((e) => e.message).join(", ")
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409
    message = "Email already registered. Please use a different email or sign in."
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400
    message = "Invalid ID format"
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(`[${statusCode}] ${req.method} ${req.path} — ${message}`)
  }

  const data = err instanceof AppError ? err.data : undefined
  res.status(statusCode).json({ success: false, message, ...(data !== undefined ? { data } : {}) })
}

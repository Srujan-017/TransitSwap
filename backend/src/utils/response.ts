import type { Response } from "express"

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200) {
  return res.status(status).json({ success: true, data, ...(message ? { message } : {}) })
}

export function sendError(res: Response, message: string, status = 500) {
  return res.status(status).json({ success: false, message })
}

import { validationResult } from "express-validator"
import type { Request, Response, NextFunction } from "express"

export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const formatted: Record<string, string> = {}
    for (const err of errors.array()) {
      const field = (err as { path?: string }).path ?? "field"
      if (!formatted[field]) formatted[field] = err.msg
    }
    res.status(400).json({ success: false, message: "Validation failed", errors: formatted })
    return
  }
  next()
}

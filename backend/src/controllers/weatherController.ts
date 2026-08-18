import type { Request, Response, NextFunction } from "express"
import { weatherService, calculateWeatherImpact } from "../services/weatherService"
import { sendSuccess } from "../utils/response"

export async function getCurrentWeather(req: Request, res: Response, next: NextFunction) {
  try {
    const latitude = Number(req.query.latitude)
    const longitude = Number(req.query.longitude)
    const weather = await weatherService.getCurrent(latitude, longitude)
    sendSuccess(res, {
      weather,
      impact: calculateWeatherImpact(weather, 0),
    })
  } catch (err) {
    next(err)
  }
}

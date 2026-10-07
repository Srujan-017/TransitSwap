import axios from "axios"
import { env } from "../config/env"
import type { WeatherData, WeatherImpact, WeatherImpactLevel } from "../types/intelligence"

interface CacheEntry {
  expiresAt: number
  data: WeatherData
}

interface OpenWeatherResponse {
  main: {
    temp: number
    feels_like: number
    humidity: number
  }
  weather?: Array<{ main: string; description: string }>
  wind?: { speed: number }
  rain?: { "1h"?: number; "3h"?: number }
  dt?: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_MS = 10 * 60 * 1000

function cacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`
}

function demoWeather(latitude: number, longitude: number): WeatherData {
  const warm = Math.round(28 + Math.abs(latitude + longitude) % 5)
  const rainy = Math.abs(Math.round(latitude * 1000 + longitude * 1000)) % 3 === 0
  return {
    temperatureC: warm,
    feelsLikeC: warm + (rainy ? 1 : 3),
    condition: rainy ? "Demo light rain" : "Demo clear weather",
    rainMm: rainy ? 2.4 : 0,
    windKph: rainy ? 18 : 9,
    humidity: rainy ? 82 : 58,
    observedAt: new Date().toISOString(),
    source: "Demo Weather Data",
    isDemoData: true,
  }
}

function normalizeWeather(payload: OpenWeatherResponse): WeatherData {
  const weather = payload.weather?.[0]
  const rainMm = payload.rain?.["1h"] ?? payload.rain?.["3h"] ?? 0
  return {
    temperatureC: Math.round(payload.main.temp),
    feelsLikeC: Math.round(payload.main.feels_like),
    condition: weather?.description ?? weather?.main ?? "Unknown",
    rainMm,
    windKph: Math.round((payload.wind?.speed ?? 0) * 3.6),
    humidity: payload.main.humidity,
    observedAt: payload.dt ? new Date(payload.dt * 1000).toISOString() : new Date().toISOString(),
    source: "OpenWeatherMap",
    isDemoData: false,
  }
}

/**
 * Rule-based, deterministic weather impact — not machine learning, not a prediction.
 * The penalty scales with how much walking THIS route actually has, so two routes in
 * identical weather get different impact scores if one walks 700m and the other 250m
 * (Phase 5.7). `walkingMetersForOtherRoutes` lets us mark a route "weather-friendly"
 * when it clearly walks less than its alternatives while the weather is bad enough to
 * matter — this only affects how the route is labelled, not which routes are returned.
 */
export function calculateWeatherImpact(
  weather: WeatherData | undefined,
  walkingMeters: number,
  walkingMetersForOtherRoutes: number[] = [],
): WeatherImpact {
  if (!weather) {
    return {
      available: false,
      level: "unavailable",
      walkingPenaltyPercent: 0,
      weatherFriendly: false,
      summary: "Weather information temporarily unavailable.",
      warnings: ["Route planning continued without weather context."],
    }
  }

  const warnings: string[] = []
  let baseSeverity = 0 // weather severity only, independent of any route's walking distance

  if (weather.rainMm >= 5) {
    baseSeverity += 35
    warnings.push("Heavy rain increases walking discomfort.")
  } else if (weather.rainMm > 0) {
    baseSeverity += 18
    warnings.push("Rain may make longer walking segments less comfortable.")
  }

  if (weather.feelsLikeC >= 34) {
    baseSeverity += 20
    warnings.push("High temperature increases walking effort.")
  }

  if (weather.windKph >= 35) {
    baseSeverity += 10
    warnings.push("Strong wind may affect open walking sections.")
  }

  // Scale the base weather severity by how much of THIS route is actually spent walking.
  // Under 300m of walking barely matters even in heavy rain; over 800m matters a lot more.
  const walkingDistanceMultiplier = walkingMeters < 300 ? 0.4 : walkingMeters <= 800 ? 1 : 1.5
  const penalty = Math.min(100, Math.round(baseSeverity * walkingDistanceMultiplier))

  // Weather-friendly: this route walks meaningfully less (>=150m) than every alternative,
  // and the weather is bad enough (baseSeverity > 0) that the difference is worth surfacing.
  const weatherFriendly =
    baseSeverity > 0 &&
    walkingMetersForOtherRoutes.length > 0 &&
    walkingMetersForOtherRoutes.every((otherMeters) => walkingMeters <= otherMeters - 150)

  if (weatherFriendly) {
    warnings.push("This route has noticeably less walking than the alternatives in current conditions.")
  }

  const level: WeatherImpactLevel = penalty >= 35 ? "high" : penalty >= 15 ? "medium" : "low"
  return {
    available: true,
    level,
    walkingPenaltyPercent: penalty,
    weatherFriendly,
    summary: weatherFriendly
      ? "Weather-friendly — less walking than alternative routes in current conditions."
      : level === "low"
        ? "Low weather impact on this journey."
        : `${level[0].toUpperCase()}${level.slice(1)} weather impact on this route's walking segments.`,
    warnings,
    weather,
  }
}

export const weatherService = {
  async getCurrent(latitude: number, longitude: number): Promise<WeatherData> {
    const key = cacheKey(latitude, longitude)
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.data

    if (!env.OPENWEATHER_API_KEY) {
      const data = demoWeather(latitude, longitude)
      cache.set(key, { data, expiresAt: Date.now() + CACHE_MS })
      return data
    }

    try {
      const { data } = await axios.get<OpenWeatherResponse>(env.OPENWEATHER_API_URL, {
        params: {
          lat: latitude,
          lon: longitude,
          units: "metric",
          appid: env.OPENWEATHER_API_KEY,
        },
        timeout: 7000,
      })
      const normalized = normalizeWeather(data)
      cache.set(key, { data: normalized, expiresAt: Date.now() + CACHE_MS })
      return normalized
    } catch {
      const data = demoWeather(latitude, longitude)
      cache.set(key, { data, expiresAt: Date.now() + CACHE_MS })
      return data
    }
  },
}

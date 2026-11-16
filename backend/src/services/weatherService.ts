import axios from "axios"
import { env } from "../config/env"
import type { WeatherData, WeatherImpact, WeatherImpactLevel } from "../types/intelligence"

/**
 * Weather for route planning.
 *
 * Source: Open-Meteo (https://open-meteo.com — free, no API key). When a departure time is chosen the
 * hourly FORECAST for that hour is used; otherwise the current conditions. If Open-Meteo cannot be
 * reached, OpenWeatherMap is tried when a key is configured; if that fails too, weather is simply
 * unavailable (null) and the app says so — it no longer invents "demo rain" from the coordinates.
 *
 * WEATHER_SOURCE (environment): "live" (default) | "clear" (fixed clear weather, no network — used by
 * the tests and offline scripts) | "off" (weather unavailable, no network).
 *
 * The rider can also pick a demo condition (Clear / Rain / Heavy rain / Heat) on the Plan Trip page,
 * so the weather rules can be shown on a sunny day; it is labelled as a demo everywhere.
 */

export type WeatherMode = "live" | "clear" | "rain" | "heavy_rain" | "heat"
export const WEATHER_MODES: readonly WeatherMode[] = ["live", "clear", "rain", "heavy_rain", "heat"]

/** Walks longer than this are replaced by an auto when the weather is bad. */
export const BAD_WEATHER_MAX_WALK_M = 300
const RAIN_MM = 0.5
const HEAVY_RAIN_MM = 5
const HEAT_FEELS_LIKE_C = 35

interface CacheEntry<T> {
  expiresAt: number
  data: T
}

interface OpenWeatherResponse {
  main: { temp: number; feels_like: number; humidity: number }
  weather?: Array<{ main: string; description: string }>
  wind?: { speed: number }
  rain?: { "1h"?: number; "3h"?: number }
  dt?: number
}

interface OpenMeteoBlock {
  temperature_2m: number
  apparent_temperature: number
  precipitation: number
  weather_code: number
  wind_speed_10m: number
  relative_humidity_2m: number
}
export interface OpenMeteoResponse {
  current?: OpenMeteoBlock & { time: string }
  hourly?: { time: string[] } & { [K in keyof OpenMeteoBlock]: number[] }
}

const CACHE_MS = 10 * 60 * 1000
const openMeteoCache = new Map<string, CacheEntry<OpenMeteoResponse>>()
const openWeatherCache = new Map<string, CacheEntry<WeatherData>>()

function cacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`
}

// ── Open-Meteo ───────────────────────────────────────────────────────────────

let fetcherOverride: ((latitude: number, longitude: number) => Promise<OpenMeteoResponse>) | null = null
/** Lets a test feed a canned Open-Meteo response (or a failure) instead of calling the network. */
export function setOpenMeteoFetcherForTesting(fetcher: typeof fetcherOverride): void {
  fetcherOverride = fetcher
  openMeteoCache.clear()
  openWeatherCache.clear()
}

async function fetchOpenMeteo(latitude: number, longitude: number): Promise<OpenMeteoResponse> {
  if (fetcherOverride) return fetcherOverride(latitude, longitude)
  const fields = "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m"
  const { data } = await axios.get<OpenMeteoResponse>("https://api.open-meteo.com/v1/forecast", {
    params: { latitude, longitude, current: fields, hourly: fields, forecast_days: 3, timezone: "auto" },
    timeout: 6000,
  })
  return data
}

// WMO weather interpretation codes -> words.
export function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky"
  if (code === 1) return "Mainly clear"
  if (code === 2) return "Partly cloudy"
  if (code === 3) return "Overcast"
  if (code === 45 || code === 48) return "Fog"
  if (code >= 51 && code <= 57) return "Drizzle"
  if (code === 61 || code === 80) return "Light rain"
  if (code === 63 || code === 81) return "Moderate rain"
  if (code === 65 || code === 66 || code === 67 || code === 82) return "Heavy rain"
  if (code >= 71 && code <= 77) return "Snow"
  if (code === 95) return "Thunderstorm"
  if (code === 96 || code === 99) return "Thunderstorm with hail"
  return "Unsettled"
}

function localHourKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`
}

export function fromOpenMeteoBlock(block: OpenMeteoBlock, observedAt: string, forecastFor?: string): WeatherData {
  const code = block.weather_code
  return {
    temperatureC: Math.round(block.temperature_2m),
    feelsLikeC: Math.round(block.apparent_temperature),
    condition: describeWeatherCode(code),
    rainMm: Math.round(block.precipitation * 10) / 10,
    windKph: Math.round(block.wind_speed_10m),
    humidity: Math.round(block.relative_humidity_2m),
    observedAt,
    source: "Open-Meteo",
    isDemoData: false,
    weatherCode: code,
    ...(forecastFor ? { forecastFor } : {}),
  }
}

/** The weather at `when` from an Open-Meteo response: that hour's forecast if there is one, else the current conditions. */
export function pickOpenMeteo(payload: OpenMeteoResponse, when?: Date): WeatherData | null {
  if (when && payload.hourly) {
    const index = payload.hourly.time.indexOf(localHourKey(when))
    if (index >= 0) {
      const block = {} as OpenMeteoBlock
      for (const key of ["temperature_2m", "apparent_temperature", "precipitation", "weather_code", "wind_speed_10m", "relative_humidity_2m"] as const) {
        const value = payload.hourly[key][index]
        if (typeof value !== "number") return null
        block[key] = value
      }
      return fromOpenMeteoBlock(block, new Date().toISOString(), payload.hourly.time[index])
    }
  }
  if (payload.current && typeof payload.current.temperature_2m === "number") {
    return fromOpenMeteoBlock(payload.current, new Date().toISOString())
  }
  return null
}

// ── OpenWeatherMap (only if a key is configured) ──────────────────────────────

function normalizeOpenWeather(payload: OpenWeatherResponse): WeatherData {
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

// ── Demo conditions ───────────────────────────────────────────────────────────

const DEMO: Record<Exclude<WeatherMode, "live">, Omit<WeatherData, "observedAt" | "source" | "isDemoData">> = {
  clear: { temperatureC: 29, feelsLikeC: 31, condition: "Clear sky", rainMm: 0, windKph: 9, humidity: 55, weatherCode: 0 },
  rain: { temperatureC: 24, feelsLikeC: 25, condition: "Moderate rain", rainMm: 2.5, windKph: 18, humidity: 85, weatherCode: 63 },
  heavy_rain: { temperatureC: 22, feelsLikeC: 22, condition: "Heavy rain", rainMm: 9, windKph: 30, humidity: 92, weatherCode: 65 },
  heat: { temperatureC: 38, feelsLikeC: 41, condition: "Very hot and sunny", rainMm: 0, windKph: 8, humidity: 40, weatherCode: 0 },
}

function demoWeather(mode: Exclude<WeatherMode, "live">, label: "selected" | "fixed"): WeatherData {
  return {
    ...DEMO[mode],
    observedAt: new Date().toISOString(),
    source: label === "selected" ? "Demo (selected by you)" : "Demo Weather Data",
    isDemoData: true,
  }
}

// ── Is it bad weather for walking? ────────────────────────────────────────────

export type BadWeatherKind = "rain" | "heavy_rain" | "thunderstorm" | "heat"

export interface WeatherAssessment {
  bad: boolean
  kind: BadWeatherKind | null
  /** One line for the banner, e.g. "Rain expected around 18:00". */
  headline: string
  /** What the planner does about it. */
  rule: string
}

/**
 * Bad weather means rain (0.5 mm or more), a thunderstorm, or a feels-like temperature of 35 C or
 * more. These are design assumptions, not meteorological standards.
 */
export function assessWeather(weather: WeatherData | null | undefined): WeatherAssessment {
  if (!weather) return { bad: false, kind: null, headline: "Weather unavailable", rule: "" }
  const thunder = (weather.weatherCode !== undefined && weather.weatherCode >= 95) || /thunder/i.test(weather.condition)
  let kind: BadWeatherKind | null = null
  if (thunder) kind = "thunderstorm"
  else if (weather.rainMm >= HEAVY_RAIN_MM) kind = "heavy_rain"
  else if (weather.rainMm >= RAIN_MM) kind = "rain"
  else if (weather.feelsLikeC >= HEAT_FEELS_LIKE_C) kind = "heat"

  const when = weather.forecastFor ? `expected around ${weather.forecastFor.slice(11, 16)}` : "right now"
  const labels: Record<BadWeatherKind, string> = {
    rain: `Rain ${when}`,
    heavy_rain: `Heavy rain ${when}`,
    thunderstorm: `Thunderstorm ${when}`,
    heat: `Very hot ${when} (feels like ${weather.feelsLikeC}°C)`,
  }
  if (!kind) {
    return { bad: false, kind: null, headline: `${weather.condition}, ${weather.temperatureC}°C`, rule: "" }
  }
  return {
    bad: true,
    kind,
    headline: labels[kind],
    rule: `Walks over ${BAD_WEATHER_MAX_WALK_M} m are replaced by an auto, and routes with less walking come first.`,
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
  /**
   * Weather for a place and (optionally) a time. `mode` is the rider's demo choice; `when` is the chosen
   * departure time — without it, current conditions are used. Returns null when no weather can be had.
   */
  async getCurrent(latitude: number, longitude: number, options: { when?: Date; mode?: WeatherMode } = {}): Promise<WeatherData | null> {
    const mode = options.mode ?? "live"
    if (mode !== "live") return demoWeather(mode, "selected")

    const source = process.env.WEATHER_SOURCE
    if (source === "clear") return demoWeather("clear", "fixed")
    if (source === "off") return null

    const key = cacheKey(latitude, longitude)
    try {
      let payload = openMeteoCache.get(key)
      if (!payload || payload.expiresAt <= Date.now()) {
        payload = { data: await fetchOpenMeteo(latitude, longitude), expiresAt: Date.now() + CACHE_MS }
        openMeteoCache.set(key, payload)
      }
      const picked = pickOpenMeteo(payload.data, options.when)
      if (picked) return picked
    } catch {
      // fall through to the optional second source
    }

    if (env.OPENWEATHER_API_KEY) {
      const cached = openWeatherCache.get(key)
      if (cached && cached.expiresAt > Date.now()) return cached.data
      try {
        const { data } = await axios.get<OpenWeatherResponse>(env.OPENWEATHER_API_URL, {
          params: { lat: latitude, lon: longitude, units: "metric", appid: env.OPENWEATHER_API_KEY },
          timeout: 7000,
        })
        const normalized = normalizeOpenWeather(data)
        openWeatherCache.set(key, { data: normalized, expiresAt: Date.now() + CACHE_MS })
        return normalized
      } catch {
        return null
      }
    }
    return null
  },
}

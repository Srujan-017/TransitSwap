import {
  assessWeather, describeWeatherCode, pickOpenMeteo, weatherService, setOpenMeteoFetcherForTesting,
  BAD_WEATHER_MAX_WALK_M, WEATHER_MODES, type OpenMeteoResponse,
} from "../services/weatherService"
import { setMultimodalRoadLegProviderForTesting, type RoadLegProvider } from "../services/multimodalService"
import { planTrip } from "../services/tripPlanner"
import type { WeatherData } from "../types/intelligence"
import type { NormalizedRoute } from "../types/routing"

/**
 * Feature-upgrade phase 5 — weather.
 *   A: Open-Meteo parsing, the forecast for the chosen hour, demo modes, "unavailable" when nothing
 *      answers (no invented rain).
 *   B: what counts as bad weather.
 *   C: the planner — in bad weather no route (any profile) has a walk over 300 m; the rider is told.
 * No network: Open-Meteo is replaced by a canned response throughout.
 */

let passed = 0
let failed = 0
function assert(condition: boolean, msg: string): boolean {
  if (condition) { passed++; return true }
  failed++
  console.error(`   ❌ FAILED: ${msg}`)
  return false
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
const offline: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const d = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    return [{ distanceMeters: d, durationSeconds: d / (mode === "walking" ? 1.3 : 8), geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] } }] as unknown as NormalizedRoute[]
  },
}

// A canned Open-Meteo response: dry and 30 C all day on 16 Nov 2026 except heavy rain at 18:00 and heat at 13:00.
function cannedOpenMeteo(): OpenMeteoResponse {
  const times: string[] = []
  const series = { temperature_2m: [] as number[], apparent_temperature: [] as number[], precipitation: [] as number[], weather_code: [] as number[], wind_speed_10m: [] as number[], relative_humidity_2m: [] as number[] }
  for (let h = 0; h < 24; h++) {
    times.push(`2026-11-16T${String(h).padStart(2, "0")}:00`)
    const rain = h === 18, hot = h === 13
    series.temperature_2m.push(hot ? 37 : rain ? 23 : 28)
    series.apparent_temperature.push(hot ? 40 : rain ? 24 : 30)
    series.precipitation.push(rain ? 7.2 : 0)
    series.weather_code.push(rain ? 65 : 1)
    series.wind_speed_10m.push(10)
    series.relative_humidity_2m.push(60)
  }
  return {
    current: { time: "2026-11-16T10:15", temperature_2m: 28, apparent_temperature: 30, precipitation: 0, weather_code: 2, wind_speed_10m: 11, relative_humidity_2m: 58 },
    hourly: { time: times, ...series },
  }
}

const at = (h: number, m = 0) => new Date(2026, 10, 16, h, m)
const P = (n: string, lat: number, lng: number) => ({ name: n, latitude: lat, longitude: lng })

async function run() {
  console.log("🧪 Running Weather Tests...\n")

  console.log("1️⃣ Weather codes and Open-Meteo parsing...")
  assert(describeWeatherCode(0) === "Clear sky" && describeWeatherCode(63) === "Moderate rain" && describeWeatherCode(65) === "Heavy rain" && describeWeatherCode(95) === "Thunderstorm", "WMO codes become words")
  const canned = cannedOpenMeteo()
  const current = pickOpenMeteo(canned)!
  assert(current.condition === "Partly cloudy" && current.temperatureC === 28 && current.feelsLikeC === 30 && current.source === "Open-Meteo" && !current.isDemoData && current.forecastFor === undefined, "no time given: the current conditions")
  const evening = pickOpenMeteo(canned, at(18, 20))!
  assert(evening.condition === "Heavy rain" && evening.rainMm === 7.2 && evening.forecastFor === "2026-11-16T18:00", "a chosen time: that hour's forecast (18:20 -> the 18:00 hour)")
  assert(pickOpenMeteo(canned, new Date(2026, 10, 20, 9, 0))!.forecastFor === undefined, "a time beyond the forecast falls back to current conditions")
  assert(pickOpenMeteo({}) === null, "an empty response gives no weather")
  console.log("   ✅ parsing\n")

  console.log("2️⃣ What counts as bad weather...")
  const w = (over: Partial<WeatherData>): WeatherData => ({ temperatureC: 28, feelsLikeC: 30, condition: "Clear sky", rainMm: 0, windKph: 9, humidity: 50, observedAt: "", source: "Open-Meteo", isDemoData: false, weatherCode: 0, ...over })
  assert(!assessWeather(w({})).bad, "clear and 30 C is fine")
  assert(!assessWeather(w({ rainMm: 0.4 })).bad && assessWeather(w({ rainMm: 0.5 })).kind === "rain", "rain starts at 0.5 mm")
  assert(assessWeather(w({ rainMm: 5 })).kind === "heavy_rain", "heavy rain from 5 mm")
  assert(assessWeather(w({ weatherCode: 95, condition: "Thunderstorm" })).kind === "thunderstorm", "a thunderstorm code is bad weather even with little rain")
  assert(!assessWeather(w({ feelsLikeC: 34 })).bad && assessWeather(w({ feelsLikeC: 35 })).kind === "heat", "heat starts at a feels-like of 35 C")
  assert(assessWeather(null).bad === false && assessWeather(undefined).headline === "Weather unavailable", "no weather is not bad weather")
  const forecastRain = assessWeather(w({ rainMm: 3, forecastFor: "2026-11-16T18:00" }))
  assert(/expected around 18:00/.test(forecastRain.headline), `a forecast says when (${forecastRain.headline})`)
  assert(/right now/.test(assessWeather(w({ rainMm: 3 })).headline), "current conditions say 'right now'")
  assert(assessWeather(w({ rainMm: 3 })).rule.includes(String(BAD_WEATHER_MAX_WALK_M)), "the rule states the 300 m limit")
  console.log("   ✅ assessment\n")

  console.log("3️⃣ weatherService.getCurrent...")
  const saved = process.env.WEATHER_SOURCE
  try {
    process.env.WEATHER_SOURCE = "live"
    let calls = 0
    setOpenMeteoFetcherForTesting(async () => { calls++; return cannedOpenMeteo() })
    const live = await weatherService.getCurrent(12.97, 77.6)
    assert(live?.source === "Open-Meteo" && live.condition === "Partly cloudy", "live: Open-Meteo current conditions")
    const forecast = await weatherService.getCurrent(12.97, 77.6, { when: at(13, 30) })
    assert(forecast?.feelsLikeC === 40 && forecast.forecastFor === "2026-11-16T13:00", "live with a time: the forecast for that hour")
    assert(calls === 1, `one request serves both (cached; got ${calls})`)
    for (const [mode, expectRain] of [["clear", false], ["rain", true], ["heavy_rain", true], ["heat", false]] as const) {
      const demo = await weatherService.getCurrent(12.97, 77.6, { mode })
      assert(demo?.isDemoData === true && demo.source === "Demo (selected by you)", `${mode}: labelled as a demo chosen by the rider`)
      assert(assessWeather(demo).bad === (mode !== "clear"), `${mode}: bad weather is ${mode !== "clear"}`)
      assert((demo!.rainMm > 0) === expectRain, `${mode}: rain amount matches`)
    }
    assert(calls === 1, "demo modes never call the weather service")
    assert(WEATHER_MODES.length === 5, "five modes: live, clear, rain, heavy rain, heat")

    setOpenMeteoFetcherForTesting(async () => { throw new Error("offline") })
    const down = await weatherService.getCurrent(13.5, 77.9)
    assert(down === null, "no answer from the weather service -> null, no invented weather")

    process.env.WEATHER_SOURCE = "clear"
    assert((await weatherService.getCurrent(12.97, 77.6))?.condition === "Clear sky", "WEATHER_SOURCE=clear gives fixed clear weather")
    process.env.WEATHER_SOURCE = "off"
    assert((await weatherService.getCurrent(12.97, 77.6)) === null, "WEATHER_SOURCE=off gives none")
  } finally {
    if (saved === undefined) delete process.env.WEATHER_SOURCE
    else process.env.WEATHER_SOURCE = saved
    setOpenMeteoFetcherForTesting(null)
  }
  console.log("   ✅ service\n")

  console.log("4️⃣ The planner in bad weather...")
  setMultimodalRoadLegProviderForTesting(offline)
  process.env.WEATHER_SOURCE = "clear"
  try {
    const trips = [
      { id: "Mysuru Road -> Majestic", from: P("Mysuru Road", 12.9419, 77.509), to: P("Majestic", 12.9767, 77.5713) },
      { id: "Silk Board -> Majestic", from: P("Silk Board", 12.9172, 77.6232), to: P("Majestic", 12.9767, 77.5713) },
      { id: "Hebbal -> Shivajinagar", from: P("Hebbal", 13.0355, 77.5971), to: P("Shivajinagar", 12.9868, 77.6047) },
      { id: "Indiranagar -> Cubbon Park", from: P("Indiranagar", 12.9802, 77.6408), to: P("Cubbon Park", 12.9774, 77.5982) },
    ]
    const longestWalk = (routes: Array<{ segments: Array<{ mode: string; distanceMeters: number }> }>) =>
      Math.max(0, ...routes.flatMap((r) => r.segments.filter((s) => s.mode === "walking").map((s) => s.distanceMeters)))
    let clearHadLongWalk = false
    for (const trip of trips) {
      const clear = await planTrip({ origin: trip.from, destination: trip.to, profile: "standard", departureTime: "2026-11-16T14:30", weather: "clear" })
      if (longestWalk(clear.rankedRoutes) > BAD_WEATHER_MAX_WALK_M) clearHadLongWalk = true
      assert(clear.weather.available && !clear.weather.bad, `${trip.id}: clear weather is reported, not bad`)
      for (const mode of ["rain", "heavy_rain", "heat"] as const) {
        for (const profile of ["standard", "fastest", "cheapest", "comfort", "wheelchair", "senior", "luggage"] as const) {
          const plan = await planTrip({ origin: trip.from, destination: trip.to, profile, departureTime: "2026-11-16T14:30", weather: mode })
          assert(plan.rankedRoutes.length >= 1, `${trip.id} / ${profile} / ${mode}: still gets an answer`)
          assert(longestWalk(plan.rankedRoutes) <= BAD_WEATHER_MAX_WALK_M, `${trip.id} / ${profile} / ${mode}: no walk over ${BAD_WEATHER_MAX_WALK_M} m in any route (longest ${Math.round(longestWalk(plan.rankedRoutes))} m)`)
          assert(plan.weather.bad && plan.weather.isDemo === true && plan.weather.headline.length > 0 && plan.weather.rule.includes("300"), `${trip.id} / ${profile} / ${mode}: the rider is told`)
        }
      }
    }
    assert(clearHadLongWalk, "(sanity) in clear weather some of these trips DO have a walk over 300 m, so the rain rule is doing something")

    const rainy = await planTrip({ origin: trips[0].from, destination: trips[0].to, profile: "standard", departureTime: "2026-11-16T14:30", weather: "rain" })
    assert(rainy.rankedRoutes.every((r) => r.weatherImpact?.available), "every route carries its weather impact")
    assert(rainy.rankedRoutes.some((r) => r.segments.some((s) => s.mode === "auto")), "an auto now covers what used to be a long walk")

    console.log("   ✅ the 300 m rule\n")

    console.log("5️⃣ The forecast for the chosen hour decides...")
    process.env.WEATHER_SOURCE = "live"
    setOpenMeteoFetcherForTesting(async () => cannedOpenMeteo())
    const t = trips[0]
    const dry = await planTrip({ origin: t.from, destination: t.to, profile: "standard", departureTime: "2026-11-16T11:00" })
    assert(!dry.weather.bad && dry.weather.forecastFor === "2026-11-16T11:00" && dry.weather.source === "Open-Meteo", "11:00: dry forecast, no rule")
    const wet = await planTrip({ origin: t.from, destination: t.to, profile: "standard", departureTime: "2026-11-16T18:10" })
    assert(wet.weather.bad && wet.weather.kind === "heavy_rain" && wet.weather.forecastFor === "2026-11-16T18:00" && /expected around 18:00/.test(wet.weather.headline), "18:10: the 18:00 heavy-rain forecast applies")
    assert(longestWalk(wet.rankedRoutes) <= BAD_WEATHER_MAX_WALK_M, "...and no route has a long walk")
    const hot = await planTrip({ origin: t.from, destination: t.to, profile: "standard", departureTime: "2026-11-16T13:00" })
    assert(hot.weather.kind === "heat", "13:00: the heat forecast applies")
    const rider = await planTrip({ origin: t.from, destination: t.to, profile: "standard", departureTime: "2026-11-16T18:10", weather: "clear" })
    assert(!rider.weather.bad && rider.weather.isDemo === true, "a demo choice overrides the forecast")

    setOpenMeteoFetcherForTesting(async () => { throw new Error("offline") })
    const unavailable = await planTrip({ origin: P("Origin B", 12.9172, 77.6232), destination: t.to, profile: "standard", departureTime: "2026-11-16T14:30" })
    assert(unavailable.rankedRoutes.length >= 1 && !unavailable.weather.available && /unavailable/.test(unavailable.weather.headline), "weather service down: routes still returned, and the rider is told weather is unavailable")
    assert(unavailable.rankedRoutes.every((r) => r.weatherImpact?.available === false), "...each route's weather impact says unavailable (nothing invented)")
    console.log("   ✅ forecast and fallback\n")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
    setOpenMeteoFetcherForTesting(null)
    if (saved === undefined) delete process.env.WEATHER_SOURCE
    else process.env.WEATHER_SOURCE = saved
  }

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) console.log(`🎉 ALL ${passed} WEATHER TESTS PASSED!`)
  else console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => { console.error("❌ Weather test failure:", err); process.exit(1) })

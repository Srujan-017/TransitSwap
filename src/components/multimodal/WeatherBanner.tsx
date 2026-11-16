import { Cloud, CloudRain, CloudLightning, Sun, Thermometer } from "lucide-react"
import type { WeatherReport } from "../../types/multimodal"

interface Props {
  weather?: WeatherReport
}

function sourceLabel(weather: WeatherReport): string {
  if (weather.isDemo) return "Demo weather"
  const when = weather.forecastFor ? `Forecast for ${weather.forecastFor.slice(11, 16)}` : "Live"
  return `${when} · ${weather.source ?? "weather service"}`
}

function Icon({ weather }: { weather: WeatherReport }) {
  const cls = "h-4 w-4 flex-shrink-0"
  if (weather.kind === "thunderstorm") return <CloudLightning className={cls} aria-hidden="true" />
  if (weather.kind === "rain" || weather.kind === "heavy_rain") return <CloudRain className={cls} aria-hidden="true" />
  if (weather.kind === "heat") return <Thermometer className={cls} aria-hidden="true" />
  if ((weather.rainMm ?? 0) === 0 && /clear|sunny/i.test(weather.condition ?? "")) return <Sun className={cls} aria-hidden="true" />
  return <Cloud className={cls} aria-hidden="true" />
}

/**
 * The weather the routes were planned for. In bad weather (rain, thunderstorm, extreme heat) it says what
 * the planner did — walks over 300 m become autos — in a banner; otherwise it is one quiet line, so the
 * rider can see the weather was considered. Weather that could not be fetched is stated, not invented.
 */
export default function WeatherBanner({ weather }: Props) {
  if (!weather) return null

  if (!weather.available) {
    return (
      <p role="status" className="rounded-panel bg-navy-100/70 px-3 py-2 text-xs text-navy-700">
        {weather.headline}
      </p>
    )
  }

  if (!weather.bad) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-panel bg-navy-100/70 px-3 py-2 text-xs text-navy-700">
        <Icon weather={weather} />
        <span>
          {weather.condition}, {weather.temperatureC}°C <span className="text-navy-500">· {sourceLabel(weather)}</span>
        </span>
      </p>
    )
  }

  return (
    <section role="status" aria-label="Weather" className="space-y-1 rounded-panel border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon weather={weather} />
        {weather.headline}
        <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">{sourceLabel(weather)}</span>
      </p>
      <p className="text-xs">{weather.rule}</p>
      <p className="text-xs text-amber-900">
        {weather.condition}, {weather.temperatureC}°C (feels like {weather.feelsLikeC}°C)
        {(weather.rainMm ?? 0) > 0 ? `, ${weather.rainMm} mm of rain` : ""}.
      </p>
      {weather.note && <p className="text-xs font-semibold">{weather.note}</p>}
    </section>
  )
}

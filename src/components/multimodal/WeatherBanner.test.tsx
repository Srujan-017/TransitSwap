import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import WeatherBanner from "./WeatherBanner"
import type { WeatherReport } from "../../types/multimodal"

/** Feature-upgrade phase 5 — the rider is told the weather, and what was done about bad weather. */

const base: WeatherReport = { available: true, bad: false, kind: null, headline: "Clear sky, 29°C", rule: "", condition: "Clear sky", temperatureC: 29, feelsLikeC: 31, rainMm: 0, source: "Open-Meteo", isDemo: false }

describe("WeatherBanner", () => {
  it("renders nothing when there is no weather information at all", () => {
    const { container } = render(<WeatherBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows one quiet line for good weather, with where it came from", () => {
    render(<WeatherBanner weather={base} />)
    expect(screen.getByRole("status")).toHaveTextContent("Clear sky, 29°C")
    expect(screen.getByRole("status")).toHaveTextContent("Live · Open-Meteo")
    expect(screen.queryByText(/replaced by an auto/)).toBeNull()
  })

  it("says it is a forecast when one was used", () => {
    render(<WeatherBanner weather={{ ...base, forecastFor: "2026-11-16T18:00" }} />)
    expect(screen.getByRole("status")).toHaveTextContent("Forecast for 18:00 · Open-Meteo")
  })

  it("explains what the planner did in bad weather", () => {
    render(
      <WeatherBanner
        weather={{ ...base, bad: true, kind: "rain", condition: "Moderate rain", rainMm: 2.5, temperatureC: 24, feelsLikeC: 25, headline: "Rain right now", rule: "Walks over 300 m are replaced by an auto, and routes with less walking come first." }}
      />,
    )
    const banner = screen.getByRole("status", { name: "Weather" })
    expect(banner).toHaveTextContent("Rain right now")
    expect(banner).toHaveTextContent("Walks over 300 m are replaced by an auto")
    expect(banner).toHaveTextContent("2.5 mm of rain")
  })

  it("labels demo weather as a demo", () => {
    render(<WeatherBanner weather={{ ...base, isDemo: true, source: "Demo (selected by you)" }} />)
    expect(screen.getByRole("status")).toHaveTextContent("Demo weather")
  })

  it("shows the note when no route avoids every long walk", () => {
    render(<WeatherBanner weather={{ ...base, bad: true, kind: "heavy_rain", headline: "Heavy rain right now", rule: "r", note: "No route avoids every walk over 300 m for this trip — the shortest walks are shown first." }} />)
    expect(screen.getByText(/No route avoids every walk over 300 m/)).toBeInTheDocument()
  })

  it("states plainly that the weather is unavailable instead of inventing it", () => {
    render(<WeatherBanner weather={{ available: false, bad: false, kind: null, headline: "Weather unavailable right now — routes were planned without it.", rule: "" }} />)
    expect(screen.getByRole("status")).toHaveTextContent("Weather unavailable right now")
  })
})

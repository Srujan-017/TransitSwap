import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ExcludedRoutes from "./ExcludedRoutes"
import { excludedRoutesFromError } from "../../utils/excludedRoutes"
import type { ExcludedRoute } from "../../types/multimodal"

/**
 * Completion-phase 2 (B3) — when every candidate route is excluded for the rider's
 * profile, the page must say which routes existed and why each was ruled out. It
 * used to claim "no combination connects them", which was false in that case.
 */

const ROUTES: ExcludedRoute[] = [
  {
    summary: "Hoodi Metro → Indiranagar Metro (metro), then auto",
    durationMinutes: 23,
    walkingMeters: 346,
    reasonType: "station",
    reason: "Indiranagar Metro is explicitly not wheelchair accessible.",
  },
  {
    summary: "Hoodi Metro → Halasuru Metro (metro)",
    durationMinutes: 44,
    walkingMeters: 2275,
    reasonType: "walking_distance",
    reason: "This route requires 2275m of walking/rolling, exceeding the 1200m limit for this profile.",
  },
  {
    summary: "Hoodi Metro → MG Road Metro (metro)",
    durationMinutes: 27,
    walkingMeters: 346,
    reasonType: "crowd",
    reason: "Route excluded: passes through HIGH-crowd station MG Road Metro, unsuitable for your selected profile.",
  },
]

describe("ExcludedRoutes", () => {
  it("renders nothing when there are no excluded routes", () => {
    const { container } = render(<ExcludedRoutes routes={[]} profileLabel="Wheelchair" variant="none-left" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("none-left: names the profile and lists every route with its typed reason", () => {
    render(<ExcludedRoutes routes={ROUTES} profileLabel="Wheelchair" variant="none-left" />)

    expect(screen.getByText(/found 3 possible routes for this trip/i)).toBeInTheDocument()
    expect(screen.getByText("Wheelchair")).toBeInTheDocument()
    // Every route, with its own station names and its engine-given reason.
    for (const route of ROUTES) {
      expect(screen.getByText(route.summary)).toBeInTheDocument()
      expect(screen.getByText(route.reason)).toBeInTheDocument()
    }
    // One distinct label per reason type.
    expect(screen.getByText("Station not accessible")).toBeInTheDocument()
    expect(screen.getByText("Too much walking or rolling")).toBeInTheDocument()
    expect(screen.getByText("Too crowded")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it("none-left: uses the singular for a single excluded route", () => {
    render(<ExcludedRoutes routes={[ROUTES[0]]} profileLabel="Stroller" variant="none-left" />)
    expect(screen.getByText(/found 1 possible route for this trip/i)).toBeInTheDocument()
  })

  it("some-left: is a collapsed disclosure that states how many routes were excluded", () => {
    const { container } = render(<ExcludedRoutes routes={ROUTES.slice(0, 2)} profileLabel="Wheelchair" variant="some-left" />)

    expect(screen.getByText(/2 other routes were excluded for your Wheelchair profile/i)).toBeInTheDocument()
    const details = container.querySelector("details")
    expect(details).not.toBeNull()
    expect(details!.open).toBe(false)
  })

  it("some-left: uses the singular for one excluded route", () => {
    render(<ExcludedRoutes routes={[ROUTES[1]]} profileLabel="Senior" variant="some-left" />)
    expect(screen.getByText(/1 other route was excluded for your Senior profile/i)).toBeInTheDocument()
  })
})

describe("excludedRoutesFromError", () => {
  it("returns the excluded routes carried on an API error", () => {
    const err = Object.assign(new Error("No accessible multimodal route found"), { details: { excludedRoutes: ROUTES } })
    expect(excludedRoutesFromError(err)).toEqual(ROUTES)
  })

  it("returns an empty list for errors without details, or with unexpected details", () => {
    expect(excludedRoutesFromError(new Error("Network Error"))).toEqual([])
    expect(excludedRoutesFromError(undefined)).toEqual([])
    expect(excludedRoutesFromError(Object.assign(new Error("x"), { details: { excludedRoutes: "nope" } }))).toEqual([])
    expect(excludedRoutesFromError(Object.assign(new Error("x"), { details: null }))).toEqual([])
  })
})

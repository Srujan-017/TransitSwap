import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import LandingPage from "./LandingPage"
import { LANDING_SEARCH_KEY } from "../components/landing/HeroSearch"

const auth = vi.hoisted(() => ({ value: { isAuthenticated: false } }))
vi.mock("../context/AuthContext", () => ({ useAuthContext: () => auth.value }))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  auth.value = { isAuthenticated: false }
  window.sessionStorage.clear()
})

describe("Landing page content", () => {
  it("has one h1 and the section headings of the redesign", () => {
    renderLanding()
    expect(screen.getByRole("heading", { level: 1, name: "Travel Smarter, Not Just Faster" })).toBeInTheDocument()
    for (const name of ["How TransitSwap works", "Built around the way Bengaluru moves", "One best option for every traveller", "Ready to travel smarter?"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument()
    }
  })

  it("explains the three steps, in order", () => {
    renderLanding()
    const steps = Array.from(document.querySelectorAll("#how-it-works ol > li"))
    expect(steps).toHaveLength(3)
    expect(steps.map((s) => s.querySelector("h3")!.textContent)).toEqual([
      "Step 1: Say where, and who is travelling",
      "Step 2: We apply the rules",
      "Step 3: Take the best option",
    ])
  })

  it("shows six features, each with a real photograph that has alt text and comes from this site", () => {
    renderLanding()
    const features = ["Accessibility-first, by default", "Buses with their numbers", "Autos for the first and last stretch", "Weather before you leave", "How busy it will be", "Live navigation"]
    for (const title of features) {
      const card = screen.getByRole("heading", { level: 3, name: title }).closest("li")!
      const img = within(card).getByRole("img")
      expect(img.getAttribute("alt")!.length).toBeGreaterThan(15)
      expect(img.getAttribute("src")).toMatch(/^\/images\/photos\//)
    }
  })

  it("describes each accessibility profile's real rules", () => {
    renderLanding()
    for (const name of ["Wheelchair", "Senior", "Pregnant", "Stroller", "Heavy luggage", "Reduced mobility"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument()
    }
    expect(screen.getByText(/at most 150 m of walking/)).toBeInTheDocument()
    expect(screen.getAllByText(/No buses/).length).toBe(2) // pregnant and stroller
  })

  it("keeps its claims honest: no internal phase labels, and the data sources are the real ones", () => {
    renderLanding()
    const text = document.body.textContent ?? ""
    expect(text).not.toMatch(/Phase \d/)
    expect(text).not.toMatch(/Google Maps/)
    expect(text).not.toMatch(/OpenWeatherMap/)
    expect(text).toMatch(/Open-Meteo/)
    expect(text).toMatch(/OpenStreetMap/)
    expect(text).toMatch(/demonstration data/)
  })

  it("links to the sections from the header and to the credits from the footer", () => {
    renderLanding()
    const sections = screen.getByRole("navigation", { name: "Sections" })
    for (const href of ["#how-it-works", "#features", "#travellers"]) {
      expect(within(sections).getAllByRole("link").map((l) => l.getAttribute("href"))).toContain(href)
      expect(document.getElementById(href.slice(1))).not.toBeNull()
    }
    expect(screen.getByRole("link", { name: "Photo credits" })).toHaveAttribute("href", "/credits")
  })
})

describe("header and calls to action", () => {
  it("a visitor is offered Sign In and Get Started", () => {
    renderLanding()
    expect(screen.getAllByRole("link", { name: "Sign In" })[0]).toHaveAttribute("href", "/login")
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/register")
    expect(screen.getByRole("link", { name: /Create Free Account/ })).toHaveAttribute("href", "/register")
  })

  it("a signed-in user is offered the app instead", () => {
    auth.value = { isAuthenticated: true }
    renderLanding()
    expect(screen.getByRole("link", { name: "Open TransitSwap" })).toHaveAttribute("href", "/dashboard")
    expect(screen.queryByRole("link", { name: "Get Started" })).toBeNull()
    expect(screen.getByRole("link", { name: /Plan a Journey/ })).toHaveAttribute("href", "/plan")
  })
})

describe("the 'Where to?' search", () => {
  it("labels both fields and starts on the Standard profile", () => {
    renderLanding()
    const form = screen.getByRole("form", { name: "Plan a journey" })
    expect(within(form).getByRole("textbox", { name: "From" })).toBeInTheDocument()
    expect(within(form).getByRole("textbox", { name: "To" })).toBeInTheDocument()
    expect(within(form).getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "true")
    expect(within(form).getByRole("button", { name: "Wheelchair" })).toHaveAttribute("aria-pressed", "false")
  })

  it("carries what a visitor typed and the chosen profile to sign-up, in the shape the planner reads", async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.type(screen.getByRole("textbox", { name: "From" }), "  Whitefield  ")
    await user.type(screen.getByRole("textbox", { name: "To" }), "MG Road")
    await user.click(screen.getByRole("button", { name: "Wheelchair" }))
    expect(screen.getByRole("button", { name: "Wheelchair" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "false")
    await user.click(screen.getByRole("button", { name: /Find Best Routes/ }))
    expect(JSON.parse(window.sessionStorage.getItem(LANDING_SEARCH_KEY)!)).toEqual({ origin: "Whitefield", destination: "MG Road", profile: "wheelchair" })
    expect(window.sessionStorage.getItem("ts_landing_search")).not.toBeNull() // the key PlanTripPage reads
    expect(screen.getByTestId("where")).toHaveTextContent("/register")
  })

  it("goes straight to the planner when already signed in", async () => {
    const user = userEvent.setup()
    auth.value = { isAuthenticated: true }
    renderLanding()
    await user.type(screen.getByRole("textbox", { name: "To" }), "Majestic")
    await user.click(screen.getByRole("button", { name: /Find Best Routes/ }))
    expect(screen.getByTestId("where")).toHaveTextContent("/plan")
    expect(JSON.parse(window.sessionStorage.getItem(LANDING_SEARCH_KEY)!).destination).toBe("Majestic")
  })

  it("stores nothing when both boxes are empty, and still moves on", async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.click(screen.getByRole("button", { name: /Find Best Routes/ }))
    expect(window.sessionStorage.getItem(LANDING_SEARCH_KEY)).toBeNull()
    expect(screen.getByTestId("where")).toHaveTextContent("/register")
  })
})

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./MainLayout"
import PageHeader from "../components/ui/PageHeader"

vi.mock("../context/AuthContext", () => ({
  useAuthContext: () => ({ isAuthenticated: true, user: { name: "Asha Rao", email: "asha@example.test", role: "user" }, logout: vi.fn() }),
}))

function renderLayout(path = "/plan") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/plan" element={<p>Plan page content</p>} />
          <Route path="/history" element={<p>History page content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe("MainLayout", () => {
  it("frames the page with a banner, main, footer and both navigations", () => {
    renderLayout()
    expect(screen.getByRole("banner")).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("Plan page content")
    expect(screen.getByRole("contentinfo")).toHaveTextContent("A student project")
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument()
  })

  it("the first thing a keyboard user reaches is a skip link to the page itself", async () => {
    const user = userEvent.setup()
    renderLayout()
    await user.tab()
    const skip = screen.getByRole("link", { name: "Skip to main content" })
    expect(document.activeElement).toBe(skip)
    expect(skip).toHaveAttribute("href", "#main-content")
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content")
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1")
  })

  it("links to the photo credits from the footer", () => {
    renderLayout()
    expect(screen.getByRole("link", { name: "Photo credits" })).toHaveAttribute("href", "/credits")
  })

  it("reserves room under the page so the phone's tab bar never covers the footer", () => {
    const { container } = renderLayout()
    const spacer = container.querySelector('div[aria-hidden="true"].md\\:hidden')
    expect(spacer).not.toBeNull()
    expect(spacer!.className).toContain("env(safe-area-inset-bottom)")
  })

  it("shows the page for the address it is on, and a new page when the address changes", async () => {
    const user = userEvent.setup()
    renderLayout("/plan")
    expect(screen.getByRole("main")).toHaveTextContent("Plan page content")
    await user.click(within_nav("History"))
    expect(screen.getByRole("main")).toHaveTextContent("History page content")
  })
})

function within_nav(name: string) {
  const nav = screen.getByRole("navigation", { name: "Main" })
  return Array.from(nav.querySelectorAll("a")).find((a) => a.textContent === name) as HTMLElement
}

describe("PageHeader", () => {
  it("has one h1, an optional eyebrow and subtitle, and actions", () => {
    render(<PageHeader eyebrow="Journeys" title="Travel History" subtitle="Everything you have saved." actions={<button>Refresh</button>} />)
    expect(screen.getByRole("heading", { level: 1, name: "Travel History" })).toBeInTheDocument()
    expect(screen.getByText("Journeys")).toBeInTheDocument()
    expect(screen.getByText("Everything you have saved.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument()
  })

  it("is just a title when that is all it is given", () => {
    const { container } = render(<PageHeader title="Saved Routes" />)
    expect(container.querySelectorAll("p")).toHaveLength(0)
    expect(screen.getByRole("heading", { level: 1, name: "Saved Routes" })).toBeInTheDocument()
  })
})

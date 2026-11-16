import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import Navbar from "./Navbar"
import BottomTabBar from "./BottomTabBar"

/**
 * The app shell's navigation (UI redesign Phase 3): the top bar with its main links and account menu, and the phone's bottom
 * tab bar. jsdom applies no CSS, so "desktop only" and "phone only" are checked through the classes that hide them.
 */

const auth = vi.hoisted(() => ({
  value: { isAuthenticated: true, user: { name: "Asha Rao", email: "asha@example.test", role: "user" } as { name: string; email: string; role: string }, logout: vi.fn() },
}))
vi.mock("../context/AuthContext", () => ({ useAuthContext: () => auth.value }))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderBar(path = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
      <BottomTabBar />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  auth.value = { isAuthenticated: true, user: { name: "Asha Rao", email: "asha@example.test", role: "user" }, logout: vi.fn() }
})

describe("top bar", () => {
  it("shows the main links on a desktop and hides them on a phone", () => {
    renderBar()
    const main = screen.getByRole("navigation", { name: "Main" })
    expect(main.className).toContain("hidden")
    expect(main.className).toContain("md:flex")
    const links = within(main).getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])
    expect(links).toEqual([
      ["Dashboard", "/dashboard"], ["Plan Trip", "/plan"], ["History", "/history"], ["Saved Routes", "/saved-routes"], ["Research", "/research"],
    ])
  })

  it("marks the current page", () => {
    renderBar("/plan")
    expect(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Plan Trip" })).toHaveAttribute("aria-current", "page")
    expect(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "History" })).not.toHaveAttribute("aria-current")
  })

  it("adds the Admin link for an admin and not for anyone else", () => {
    const { unmount } = renderBar()
    expect(within(screen.getByRole("navigation", { name: "Main" })).queryByRole("link", { name: "Admin" })).toBeNull()
    unmount()
    auth.value.user.role = "admin"
    renderBar()
    expect(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin")
  })

  it("the logo links to the dashboard when signed in", () => {
    renderBar()
    expect(screen.getByRole("link", { name: /TransitSwap/ })).toHaveAttribute("href", "/dashboard")
  })
})

describe("account menu", () => {
  it("is closed to begin with, opens on click and says so", async () => {
    const user = userEvent.setup()
    renderBar()
    const button = screen.getByRole("button", { name: "Account menu" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("asha@example.test")).toBeNull()
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Asha Rao")).toBeInTheDocument()
    expect(screen.getByText("asha@example.test")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Profile & Preferences/ })).toHaveAttribute("href", "/profile")
    expect(screen.getByRole("link", { name: /Travel History/ })).toHaveAttribute("href", "/history")
  })

  it("closes on Escape and puts focus back on its button", async () => {
    const user = userEvent.setup()
    renderBar()
    const button = screen.getByRole("button", { name: "Account menu" })
    await user.click(button)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByText("asha@example.test")).toBeNull()
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(document.activeElement).toBe(button)
  })

  it("closes when a link in it is followed", async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByRole("button", { name: "Account menu" }))
    await user.click(screen.getByRole("link", { name: /Profile & Preferences/ }))
    expect(screen.getByTestId("where")).toHaveTextContent("/profile")
    expect(screen.queryByText("asha@example.test")).toBeNull()
  })

  it("keeps Research and Admin for the phone, where the tab bar has no room for them", async () => {
    const user = userEvent.setup()
    auth.value.user.role = "admin"
    renderBar()
    await user.click(screen.getByRole("button", { name: "Account menu" }))
    for (const name of ["Research", "Admin"]) {
      const links = screen.getAllByRole("link", { name })
      const inMenu = links.find((l) => l.className.includes("md:hidden"))
      expect(inMenu, name).toBeDefined()
    }
  })

  it("signs out and goes home", async () => {
    const user = userEvent.setup()
    renderBar("/history")
    await user.click(screen.getByRole("button", { name: "Account menu" }))
    await user.click(screen.getByRole("button", { name: /Sign Out/ }))
    expect(auth.value.logout).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("where")).toHaveTextContent("/")
  })

  it("a signed-out visitor sees Sign In and Get Started instead", () => {
    auth.value = { isAuthenticated: false, user: undefined as never, logout: vi.fn() }
    renderBar("/")
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login")
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/register")
    expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Account menu" })).toBeNull()
  })
})

describe("bottom tab bar", () => {
  it("is the phone's navigation: five tabs, shown below 768 px only", () => {
    renderBar()
    const bar = screen.getByRole("navigation", { name: "Primary" })
    expect(bar.className).toContain("md:hidden")
    expect(bar.className).toContain("fixed")
    const tabs = within(bar).getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])
    expect(tabs).toEqual([["Home", "/dashboard"], ["Plan Trip", "/plan"], ["Saved", "/saved-routes"], ["History", "/history"], ["Profile", "/profile"]])
  })

  it("marks the current tab and gives every tab a touch target of at least 64 px", () => {
    renderBar("/saved-routes")
    const bar = screen.getByRole("navigation", { name: "Primary" })
    expect(within(bar).getByRole("link", { name: "Saved" })).toHaveAttribute("aria-current", "page")
    for (const link of within(bar).getAllByRole("link")) expect(link.className).toContain("min-h-16")
    expect(within(bar).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current")
  })

  it("goes where a tab points", async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "Plan Trip" }))
    expect(screen.getByTestId("where")).toHaveTextContent("/plan")
  })
})

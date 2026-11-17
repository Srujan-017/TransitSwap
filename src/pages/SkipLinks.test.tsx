import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import LandingPage from "./LandingPage"
import LoginPage from "./LoginPage"
import RegisterPage from "./RegisterPage"
import CreditsPage from "./CreditsPage"
import NotFoundPage from "./NotFoundPage"
import { AuthProvider } from "../context/AuthContext"

/** UI redesign Phase 10: every page has "Skip to main content" as its first link, pointing at a real, focusable main. */

const pages: Array<[string, React.ReactElement]> = [
  ["Landing", <LandingPage />],
  ["Sign in", <LoginPage />],
  ["Sign up", <RegisterPage />],
  ["Credits", <CreditsPage />],
  ["Not found", <NotFoundPage />],
]

describe.each(pages)("%s page", (_name, page) => {
  it("starts with a skip link that targets #main-content, and that target exists and can take focus", () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </AuthProvider>,
    )
    const links = container.querySelectorAll("a")
    expect(links[0]).toHaveTextContent("Skip to main content")
    expect(links[0]).toHaveAttribute("href", "#main-content")
    const main = container.querySelector("main#main-content")
    expect(main).not.toBeNull()
    expect(main).toHaveAttribute("tabindex", "-1")
    expect(screen.getAllByRole("main")).toHaveLength(1)
  })
})

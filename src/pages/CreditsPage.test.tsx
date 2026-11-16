import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import CreditsPage from "./CreditsPage"
import { PHOTO_LIST } from "../data/photoCredits"

describe("CreditsPage", () => {
  function setup() {
    return render(<MemoryRouter><CreditsPage /></MemoryRouter>)
  }

  it("says every picture is a real photograph and links back home", () => {
    setup()
    expect(screen.getByRole("heading", { level: 1, name: "Credits" })).toBeInTheDocument()
    expect(screen.getByText(/real photograph/)).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /Back to home/ })[0]).toHaveAttribute("href", "/")
  })

  it("credits every photo with its photographer, a link to its source page and a link to its licence", () => {
    setup()
    const list = screen.getByRole("list", { name: "Photographs and their credits" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(PHOTO_LIST.length)
    PHOTO_LIST.forEach((p, i) => {
      const item = within(items[i])
      expect(item.getByText(p.credit.author)).toBeInTheDocument()
      // Matched by address: for an Unsplash photo both "Unsplash" and "Unsplash License" are link names.
      const hrefs = item.getAllByRole("link").map((l) => l.getAttribute("href"))
      expect(hrefs, p.id).toContain(p.credit.sourceUrl)
      expect(hrefs, p.id).toContain(p.credit.licenseUrl)
      expect(item.getByRole("img", { name: p.alt })).toBeInTheDocument()
    })
  })

  it("opens outside links safely and says so", () => {
    setup()
    for (const link of screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("http"))) {
      expect(link).toHaveAttribute("target", "_blank")
      expect(link.getAttribute("rel")).toContain("noopener")
      expect(link.textContent).toContain("(opens in a new tab)")
    }
  })

  it("also credits the maps, weather, icons and fonts", () => {
    setup()
    expect(screen.getByText(/OpenStreetMap contributors/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open-Meteo\.com/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Lucide/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Inter and Plus Jakarta Sans/ })).toBeInTheDocument()
  })
})

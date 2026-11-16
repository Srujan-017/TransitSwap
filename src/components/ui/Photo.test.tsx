import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Photo from "./Photo"
import { PHOTOS } from "../../data/photoCredits"

describe("Photo", () => {
  it("shows the photo's own description as its alt text", () => {
    render(<Photo id="bmtc-bus" />)
    expect(screen.getByRole("img", { name: PHOTOS["bmtc-bus"].alt })).toBeInTheDocument()
  })

  it("lets the caller write a different alt text", () => {
    render(<Photo id="bmtc-bus" alt="The 335E to Whitefield" />)
    expect(screen.getByRole("img", { name: "The 335E to Whitefield" })).toBeInTheDocument()
  })

  it("can be decorative: empty alt and hidden from screen readers", () => {
    const { container } = render(<Photo id="tactile-platform" decorative />)
    const img = container.querySelector("img")!
    expect(img.getAttribute("alt")).toBe("")
    expect(img.getAttribute("aria-hidden")).toBe("true")
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("offers every size to the browser from this site's own files, with real dimensions to reserve the space", () => {
    const { container } = render(<Photo id="green-line-train" sizes="50vw" />)
    const img = container.querySelector("img")!
    const photo = PHOTOS["green-line-train"]
    for (const s of photo.sizes) expect(img.getAttribute("srcset")).toContain(`/images/photos/green-line-train-${s.width}.webp ${s.width}w`)
    expect(img.getAttribute("src")).toMatch(/^\/images\/photos\//)
    expect(img.getAttribute("sizes")).toBe("50vw")
    expect(Number(img.getAttribute("width"))).toBe(photo.sizes[photo.sizes.length - 1].width)
    expect(Number(img.getAttribute("height"))).toBe(photo.sizes[photo.sizes.length - 1].height)
    expect(img.style.backgroundColor).not.toBe("")
  })

  it("loads lazily by default and at once, at high priority, when it is above the fold", () => {
    const lazy = render(<Photo id="train-dusk" />).container.querySelector("img")!
    expect(lazy.getAttribute("loading")).toBe("lazy")
    expect(lazy.getAttribute("fetchpriority")).toBeNull()
    const hero = render(<Photo id="metro-sunset" priority />).container.querySelector("img")!
    expect(hero.getAttribute("loading")).toBe("eager")
    expect(hero.getAttribute("fetchpriority")).toBe("high")
  })
})

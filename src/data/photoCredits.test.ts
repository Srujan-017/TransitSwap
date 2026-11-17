import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { PHOTOS, PHOTO_LIST, photoUrl } from "./photoCredits"

/**
 * The photo register is the single source of truth for what pictures the site shows and who they must be credited to.
 * These checks fail if a photo is added without a credit or alt text, if a file is missing, or if any image is loaded
 * from another website instead of this site's own files.
 */

const ROOT = process.cwd()
const ALLOWED_LICENCES = new Set(["Unsplash License", "CC0", "CC BY 2.0", "CC BY-SA 2.0", "CC BY-SA 4.0"])

describe("photo register", () => {
  it("has the photographs the redesign uses", () => {
    expect(PHOTO_LIST.length).toBeGreaterThanOrEqual(11)
    expect(new Set(PHOTO_LIST.map((p) => p.id)).size).toBe(PHOTO_LIST.length)
    for (const [key, photo] of Object.entries(PHOTOS)) expect(photo.id).toBe(key)
  })

  it("gives every photo real alt text, a named photographer, a source page and a known licence", () => {
    for (const p of PHOTO_LIST) {
      expect(p.alt.trim().length, `${p.id} alt`).toBeGreaterThan(15)
      expect(p.usedFor.trim().length, `${p.id} usedFor`).toBeGreaterThan(0)
      expect(p.credit.author.trim().length, `${p.id} author`).toBeGreaterThan(1)
      expect(p.credit.sourceUrl, `${p.id} sourceUrl`).toMatch(/^https:\/\/(unsplash\.com\/photos\/|commons\.wikimedia\.org\/wiki\/File:)/)
      expect(ALLOWED_LICENCES.has(p.credit.license), `${p.id} licence ${p.credit.license}`).toBe(true)
      expect(p.credit.licenseUrl, `${p.id} licenseUrl`).toMatch(/^https:\/\//)
      expect(p.credit.changes.trim().length, `${p.id} changes`).toBeGreaterThan(0)
    }
  })

  it("marks the Creative Commons attribution licences as requiring a credit, and CC0 and Unsplash as not", () => {
    for (const p of PHOTO_LIST) {
      const needsCredit = /^CC BY/.test(p.credit.license)
      expect(p.credit.attributionRequired, p.id).toBe(needsCredit)
    }
  })

  it("has every size on disk, smallest first, and the hero within its size budget", () => {
    for (const p of PHOTO_LIST) {
      expect(p.sizes.length, p.id).toBeGreaterThanOrEqual(2)
      const widths = p.sizes.map((s) => s.width)
      expect(widths, p.id).toEqual([...widths].sort((a, b) => a - b))
      for (const s of p.sizes) {
        const file = path.join(ROOT, "public", photoUrl(p.id, s.width).split("?")[0])
        expect(fs.existsSync(file), `${p.id} ${s.width}w exists`).toBe(true)
        expect(s.height).toBeGreaterThan(0)
      }
    }
    const hero = PHOTOS["metro-sunset"]
    const heroBytes = fs.statSync(path.join(ROOT, "public", photoUrl(hero.id, hero.sizes[hero.sizes.length - 1].width).split("?")[0])).size
    expect(heroBytes).toBeLessThan(200 * 1024)
  })

  it("keeps every placeholder tiny", () => {
    for (const p of PHOTO_LIST) {
      expect(p.placeholder, p.id).toMatch(/^data:image\/jpeg;base64,/)
      expect(p.placeholder.length, p.id).toBeLessThan(2000)
    }
  })
})

describe("no image comes from another website", () => {
  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) return e.name === "imports" ? [] : sourceFiles(p)
      return /\.(ts|tsx|css)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : []
    })
  }

  it("no source file loads a photo from Unsplash, Pexels or Wikimedia (credit links to their pages are fine)", () => {
    const offenders: string[] = []
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      const text = fs.readFileSync(file, "utf8")
      if (/https?:\/\/(images\.unsplash\.com|plus\.unsplash\.com|images\.pexels\.com|upload\.wikimedia\.org)/.test(text)) offenders.push(path.relative(ROOT, file))
    }
    expect(offenders).toEqual([])
  })

  it("the page shell does not request Google Fonts", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })
})

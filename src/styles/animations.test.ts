import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

/**
 * A bug that reached the live site: the page's entrance animation ended with `transform: translateY(0)` and kept it (fill
 * mode `both`). Any element with a transform becomes the containing block of its `position: fixed` descendants, so the full-
 * screen live navigation and every dialog were sized to the page's content, not the window: a 140 px map and a cut-off
 * panel. The audit missed it because it runs with reduced motion on, which switches these animations off.
 * Rule: a one-shot entrance animation uses fill mode `backwards` and its last keyframe is `transform: none`.
 */

const css = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf8")

describe("entrance animations never leave a transform behind", () => {
  const rules = [...css.matchAll(/\.(animate-[\w-]+)\s*\{([^}]*)\}/g)].map((m) => ({ name: m[1], body: m[2] }))
  const oneShot = rules.filter((r) => /animation:/.test(r.body) && !/infinite/.test(r.body))

  it("finds the entrance animations", () => {
    expect(oneShot.map((r) => r.name)).toEqual(expect.arrayContaining(["animate-page-in", "animate-sheet-up", "animate-fade-slide-up"]))
  })

  for (const r of oneShot) {
    it(`.${r.name} does not keep its last frame (no fill mode "both" or "forwards")`, () => {
      expect(r.body).not.toMatch(/\b(both|forwards)\b/)
    })
  }

  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})+)\s*\}/g)) {
    const [, name, body] = m
    if (!/transform/.test(body) || /skeleton|pulse/.test(name)) continue
    it(`@keyframes ${name} ends on transform: none`, () => {
      const last = [...body.matchAll(/(from|to|100%)\s*\{([^}]*)\}/g)].pop()!
      expect(last[2]).toMatch(/transform:\s*none/)
    })
  }
})

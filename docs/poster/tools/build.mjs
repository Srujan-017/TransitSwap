// Builds every poster output from docs/poster/poster.html with headless Chromium (Playwright):
//   out/TransitSwap_Poster_A3.pdf               the whole poster on one A3 landscape page (vector text)
//   out/TransitSwap_Poster_A4_cutouts.pdf       assembly guide + A4 sheets with every piece at final size, with cut lines
//   out/TransitSwap_Poster_A3_preview.png       the whole poster as an image (200 dpi)
//   out/a4-sheets/sheet-N.png                   each A4 sheet as an image (300 dpi), for printers that want images
//   out/pieces/NN-name.png                      each piece alone (300 dpi, transparent corners)
// Run: node docs/poster/tools/build.mjs        (fails if any box's content does not fit)
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createRequire } from "node:module"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../../..")
const require = createRequire(path.join(root, "package.json"))
const { chromium } = require("playwright-core")

const posterDir = path.resolve(here, "..")
const OUT = path.join(posterDir, "out")
const url = (q) => `${pathToFileURL(path.join(posterDir, "poster.html")).href}?${q}`
const PX_PER_MM = 96 / 25.4

const PIECES = [
  "brand", "college", "qr", "title", "problem", "objectives", "method", "arch", "workflow", "models", "results", "app",
  "conclusion", "footer-a", "footer-b",
]
const NAMES = {
  brand: "transitswap-logo", college: "college-header", qr: "live-demo-qr", title: "title", problem: "problem-statement",
  objectives: "objectives", method: "methodology", arch: "system-architecture", workflow: "workflow", models: "ai-and-algorithms",
  results: "results", app: "application", conclusion: "conclusion", "footer-a": "team-1", "footer-b": "team-2",
}

async function open(browser, query, { widthMm, heightMm, dpi }) {
  const page = await browser.newPage({
    viewport: { width: Math.ceil(widthMm * PX_PER_MM), height: Math.ceil(heightMm * PX_PER_MM) },
    deviceScaleFactor: dpi / 96,
  })
  const errors = []
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()) })
  page.on("pageerror", (e) => errors.push(String(e)))
  await page.goto(url(query), { waitUntil: "load" })
  await page.waitForFunction(() => window.__ready === true)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => (img.complete ? 1 : new Promise((r) => { img.onload = img.onerror = r }))))
  })
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")))
  if (broken.length) throw new Error(`images failed to load: ${broken.join(", ")}`)
  const overflow = await page.evaluate(() => window.__overflow())
  return { page, errors, overflow }
}

async function main() {
  fs.mkdirSync(path.join(OUT, "a4-sheets"), { recursive: true })
  fs.mkdirSync(path.join(OUT, "pieces"), { recursive: true })
  const browser = await chromium.launch()
  const problems = []
  try {
    // A3 poster: PDF + preview image
    {
      const { page, errors, overflow } = await open(browser, "mode=a3", { widthMm: 420, heightMm: 297, dpi: 200 })
      problems.push(...overflow.map((o) => `A3 overflow: ${o}`), ...errors.map((e) => `A3 console: ${e}`))
      await page.pdf({ path: path.join(OUT, "TransitSwap_Poster_A3.pdf"), printBackground: true, preferCSSPageSize: true })
      await page.locator(".page").screenshot({ path: path.join(OUT, "TransitSwap_Poster_A3_preview.png") })
      await page.close()
    }
    // A4 cut-out sheets: PDF + one image per sheet
    {
      const { page, errors, overflow } = await open(browser, "mode=a4", { widthMm: 297, heightMm: 210, dpi: 300 })
      problems.push(...overflow.map((o) => `A4 overflow: ${o}`), ...errors.map((e) => `A4 console: ${e}`))
      await page.pdf({ path: path.join(OUT, "TransitSwap_Poster_A4_cutouts.pdf"), printBackground: true, preferCSSPageSize: true })
      const sheets = page.locator(".page.a4")
      const n = await sheets.count()
      for (let i = 0; i < n; i++) await sheets.nth(i).screenshot({ path: path.join(OUT, "a4-sheets", `sheet-${i + 1}.png`) })
      console.log(`A4 sheets: ${n}`)
      await page.close()
    }
    // each piece alone
    for (const [i, id] of PIECES.entries()) {
      const { page } = await open(browser, `mode=piece&id=${id}`, { widthMm: 300, heightMm: 120, dpi: 300 })
      const file = path.join(OUT, "pieces", `${String(i + 1).padStart(2, "0")}-${NAMES[id]}.png`)
      await page.locator(".piece").screenshot({ path: file, omitBackground: true })
      await page.close()
    }
  } finally {
    await browser.close()
  }
  if (problems.length) {
    console.error("PROBLEMS:\n  " + problems.join("\n  "))
    process.exit(1)
  }
  console.log("poster built: " + OUT)
}

main().catch((e) => { console.error(e); process.exit(1) })

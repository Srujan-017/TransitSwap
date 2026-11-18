// Renders guide.html to TransitSwap_Exhibition_Guide.pdf (A4, page numbers in the footer).
// Run from the repository root:  node docs/exhibition/build.mjs
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createRequire } from "node:module"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..", "..")
const require = createRequire(path.join(root, "package.json"))
const { chromium } = require("playwright-core")

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto(pathToFileURL(path.join(here, "guide.html")).href, { waitUntil: "load" })
  await page.evaluate(() => document.fonts.ready)
  const family = await page.evaluate(() => document.fonts.check('12px "Inter"'))
  if (!family) throw new Error("Inter font did not load")
  await page.pdf({
    path: path.join(here, "TransitSwap_Exhibition_Guide.pdf"),
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5pt;color:#7a8494;padding:0 15mm;display:flex;justify-content:space-between">' +
      "<span>TransitSwap · Exhibition guide</span><span><span class=\"pageNumber\"></span> / <span class=\"totalPages\"></span></span></div>",
  })
  console.log("Wrote", path.join(here, "TransitSwap_Exhibition_Guide.pdf"))
} finally {
  await browser.close()
}

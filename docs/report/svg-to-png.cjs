const path = require("path")
const fs = require("fs")
const { chromium } = require("playwright")

const files = [
  "fig-4.0-architecture.svg",
  "fig-4.1-use-case.svg",
  "fig-4.2-class.svg",
  "fig-4.3-sequence.svg",
  "fig-4.4-dfd.svg",
]

async function main() {
  const browser = await chromium.launch()
  for (const file of files) {
    const svgPath = path.join(__dirname, "figures", file)
    const svgContent = fs.readFileSync(svgPath, "utf8")
    const match = svgContent.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)
    const w = match ? Math.ceil(parseFloat(match[1])) : 800
    const h = match ? Math.ceil(parseFloat(match[2])) : 600
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 3 })
    await page.goto("file:///" + svgPath.replace(/\\/g, "/"))
    const outPath = svgPath.replace(/\.svg$/, ".png")
    await page.screenshot({ path: outPath, omitBackground: false })
    await page.close()
    console.log("wrote", outPath)
  }
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })

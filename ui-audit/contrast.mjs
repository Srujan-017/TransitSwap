// Checks WCAG contrast for the text/background pairs the design system uses.
//
//   node ui-audit/contrast.mjs        (also: npm run ui:contrast)
//
// Token colours are read from the @theme block of src/index.css, so this cannot drift from the real values. A few
// Tailwind built-in colours the components also use (amber, red) are written out as hex. Exit code 1 on any failure.
import fs from "node:fs"

const css = fs.readFileSync("src/index.css", "utf8")
const token = (name) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`token --color-${name} not found in src/index.css`)
  return m[1]
}
// Tailwind's own amber and red shades, as sRGB hex.
const BUILT_IN = { "amber-50": "#fffbeb", "amber-200": "#fde68a", "amber-700": "#b45309", "amber-800": "#92400e", "red-50": "#fef2f2", "red-800": "#991b1b", white: "#ffffff" }
const colour = (name) => BUILT_IN[name] ?? token(name)

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// [text, background, minimum ratio, where it is used]
const TEXT = [
  ["navy-900", "white", 4.5, "body text on cards"],
  ["navy-900", "navy-50", 4.5, "body text on the page background"],
  ["navy-700", "white", 4.5, "secondary text"],
  ["navy-600", "white", 4.5, "secondary text"],
  ["navy-500", "white", 4.5, "captions"],
  ["navy-500", "navy-50", 4.5, "captions on the page background"],
  ["navy-400", "white", 4.5, "muted text"],
  ["navy-400", "navy-50", 4.5, "muted text on the page background"],
  ["brand-500", "white", 4.5, "links and active text"],
  ["brand-600", "white", 4.5, "links"],
  ["brand-500", "brand-50", 4.5, "links on tinted panels"],
  ["brand-700", "brand-50", 4.5, "info badges"],
  ["brand-800", "brand-100", 4.5, "emphasis on tinted panels"],
  ["brand-700", "white", 4.5, "selected tab"],
  ["white", "brand-500", 4.5, "primary buttons, selected chips"],
  ["white", "brand-600", 4.5, "primary buttons (hover)"],
  ["white", "go-600", 4.5, "Start / Go buttons"],
  ["white", "go-700", 4.5, "Start / Go buttons (hover)"],
  ["white", "go-800", 4.5, "success toast"],
  ["white", "bus-600", 4.5, "bus number badge"],
  ["white", "navy-900", 4.5, "dark buttons, navigation banner"],
  ["white", "navy-700", 4.5, "avatar"],
  ["white", "brand-600", 4.5, "avatar"],
  ["white", "go-700", 4.5, "avatar"],
  ["white", "bus-700", 4.5, "avatar"],
  ["white", "danger", 4.5, "danger buttons"],
  ["white", "red-800", 4.5, "error toast"],
  ["go-800", "go-50", 4.5, "success badge, low-crowd pill"],
  ["go-700", "go-50", 4.5, "stat tile icon"],
  ["amber-800", "amber-50", 4.5, "warning badge, medium-crowd pill"],
  ["red-800", "red-50", 4.5, "danger badge, high-crowd pill"],
  ["navy-900", "auto-400", 4.5, "auto badge"],
  ["auto-700", "auto-50", 4.5, "auto note"],
  ["bus-700", "bus-50", 4.5, "bus note"],
  ["success", "white", 4.5, "password-strength word"],
  ["warning", "white", 4.5, "password-strength word"],
  ["danger", "white", 4.5, "error text"],
  ["brand-400", "navy-900", 4.5, "accent text on the dark hero and sign-in panel"],
]
// Non-text: focus ring and control borders need 3:1 against what they sit on.
const NON_TEXT = [
  ["brand-500", "white", 3, "focus ring on cards"],
  ["brand-500", "navy-50", 3, "focus ring on the page background"],
  ["navy-400", "white", 3, "icon colour on cards"],
]

let failed = 0
const row = (kind, [fg, bg, min, use]) => {
  const r = ratio(colour(fg), colour(bg))
  const ok = r >= min
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (need ${min})  ${kind}  ${fg} on ${bg}  — ${use}`)
}
TEXT.forEach((p) => row("text    ", p))
NON_TEXT.forEach((p) => row("non-text", p))
console.log(`\n${TEXT.length + NON_TEXT.length - failed}/${TEXT.length + NON_TEXT.length} pairs pass`)
process.exit(failed ? 1 : 0)

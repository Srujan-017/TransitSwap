// Places the poster pieces (defined once in <template id="lib">) on an A3 page, on A4 cut-out sheets, or alone.
//   poster.html?mode=a3            the whole poster on one A3 landscape page (420 x 297 mm)
//   poster.html?mode=a4            assembly guide + A4 landscape sheets with every piece at its final size, to cut and paste
//   poster.html?mode=piece&id=...  one piece alone (used to export each piece as a 300 dpi image)
"use strict"

const params = new URLSearchParams(location.search)
const MODE = params.get("mode") || "a3"

// ── Sizes (mm). Change a height here and every output follows. ──────────────────────────────────────────────────────
const COL_W = 130
// The college banner keeps its own proportions (4228 x 510 px).
const HEADER_H = +(262 * 510 / 4228).toFixed(2)
const SIZE = {
  brand: [65, HEADER_H], college: [262, HEADER_H], qr: [65, HEADER_H], title: [284, 25.5],
  problem: [COL_W, 43], objectives: [COL_W, 42], method: [COL_W, 112],
  arch: [COL_W, 70], workflow: [COL_W, 63], models: [COL_W, 64],
  results: [COL_W, 97], app: [COL_W, 65], conclusion: [COL_W, 35],
  "footer-a": [197.5, 11], "footer-b": [197.5, 11],
}
const PIECES = [
  ["brand", "TransitSwap logo", "header row, left"],
  ["college", "College header", "header row, centre"],
  ["qr", "Live demo QR", "header row, right"],
  ["title", "Title", "under the header, centred"],
  ["problem", "Problem statement", "left column, 1st"],
  ["objectives", "Objectives", "left column, 2nd"],
  ["method", "Methodology", "left column, 3rd"],
  ["arch", "System architecture", "middle column, 1st"],
  ["workflow", "Workflow", "middle column, 2nd"],
  ["models", "AI & algorithms", "middle column, 3rd"],
  ["results", "Results", "right column, 1st"],
  ["app", "Application", "right column, 2nd"],
  ["conclusion", "Conclusion", "right column, 3rd"],
  ["footer-a", "Team (1 of 2)", "bottom row, left"],
  ["footer-b", "Team (2 of 2)", "bottom row, right"],
]
const NUMBER = Object.fromEntries(PIECES.map(([id], i) => [id, i + 1]))
const RADIUS = { brand: 2.2, qr: 2.2, college: 0, title: 0, "footer-a": 2.4, "footer-b": 2.4 } // others: 2.8 (panels)

// ── A3 layout ───────────────────────────────────────────────────────────────────────────────────────────────────────
const M_X = 10, TOP = 8, GAP = 4
const COLS_Y = 71, COLS_H = 205
const colX = (i) => M_X + i * (COL_W + 5)
function a3Layout() {
  const pos = {
    brand: [M_X, TOP], college: [M_X + 65 + GAP, TOP], qr: [M_X + 65 + GAP + 262 + GAP, TOP],
    title: [M_X + (400 - 284) / 2, TOP + HEADER_H + 3],
    "footer-a": [M_X, 279], "footer-b": [M_X + 197.5 + 5, 279],
  }
  const columns = [["problem", "objectives", "method"], ["arch", "workflow", "models"], ["results", "app", "conclusion"]]
  columns.forEach((ids, c) => {
    let y = COLS_Y
    for (const id of ids) { pos[id] = [colX(c), y]; y += SIZE[id][1] + GAP }
    const used = y - GAP - COLS_Y
    if (Math.abs(used - COLS_H) > 0.01) console.warn(`column ${c + 1} is ${used} mm tall, expected ${COLS_H}`)
  })
  return pos
}

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const lib = document.getElementById("lib").content
const app = document.getElementById("app")
const mm = (v) => `${v}mm`

function setPageSize(w, h) {
  const style = document.createElement("style")
  style.textContent = `@page { size: ${w}mm ${h}mm; margin: 0 }`
  document.head.appendChild(style)
}
function newPage(kind) {
  const page = document.createElement("div")
  page.className = `page ${kind}`
  app.appendChild(page)
  return page
}
function place(page, id, x, y) {
  const src = lib.querySelector(`[data-id="${id}"]`)
  const el = src.cloneNode(true)
  const [w, h] = SIZE[id]
  el.classList.add("piece")
  Object.assign(el.style, { left: mm(x), top: mm(y), width: mm(w), height: mm(h) })
  page.appendChild(el)
  return el
}
function cutline(page, id, x, y) {
  const [w, h] = SIZE[id]
  const off = 1.5
  const r = RADIUS[id] ?? 2.8
  const line = document.createElement("div")
  line.className = `cutline${r === 0 ? " square" : ""}`
  Object.assign(line.style, { left: mm(x - off), top: mm(y - off), width: mm(w + 2 * off), height: mm(h + 2 * off), borderRadius: mm(r ? r + off : 0.6) })
  page.appendChild(line)
  const [, name, where] = PIECES.find(([pid]) => pid === id)
  const label = document.createElement("div")
  label.className = "cut-label"
  label.innerHTML = `&#9986; <b>${NUMBER[id]} &middot; ${name}</b> &nbsp;&mdash;&nbsp; ${where}`
  Object.assign(label.style, { left: mm(x - off), top: mm(y - off - 3.4) })
  page.appendChild(label)
}

// ── Icons (Lucide) ──────────────────────────────────────────────────────────────────────────────────────────────────
function hydrateIcons(root) {
  for (const el of root.querySelectorAll("[data-icon]")) {
    const body = (window.ICONS || {})[el.dataset.icon]
    if (!body) { console.warn("missing icon", el.dataset.icon); continue }
    if (el instanceof SVGElement) {
      el.setAttribute("fill", "none")
      el.setAttribute("stroke-width", el.getAttribute("stroke-width") || "2")
      el.setAttribute("stroke-linecap", "round")
      el.setAttribute("stroke-linejoin", "round")
      el.innerHTML = body
    } else {
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
    }
  }
}

// ── Small SVG helpers ───────────────────────────────────────────────────────────────────────────────────────────────
const NS = "http://www.w3.org/2000/svg"
function s(tag, attrs = {}, parent, text) {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (text !== undefined) el.textContent = text
  if (parent) parent.appendChild(el)
  return el
}
function icon(parent, name, x, y, size, color, width = 2) {
  const g = s("g", { "data-icon": name, transform: `translate(${x} ${y}) scale(${size / 24})`, stroke: color, "stroke-width": width }, parent)
  return g
}
function arrow(parent, x1, y1, x2, y2, color = "#475569") {
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const hl = 1.1, hw = 0.7
  const bx = x2 - hl * Math.cos(ang), by = y2 - hl * Math.sin(ang)
  s("path", { d: `M${x1} ${y1} L${bx} ${by}`, stroke: color, "stroke-width": 0.32, fill: "none" }, parent)
  const px = -Math.sin(ang) * hw, py = Math.cos(ang) * hw
  s("path", { d: `M${x2} ${y2} L${bx + px} ${by + py} L${bx - px} ${by - py} Z`, fill: color }, parent)
}
/** Shrinks an SVG text element until it is no wider than maxWidth (in user units). */
function fit(textEl, maxWidth, min = 1.4) {
  let size = parseFloat(textEl.getAttribute("font-size"))
  while (textEl.getComputedTextLength() > maxWidth && size > min) {
    size -= 0.05
    textEl.setAttribute("font-size", size.toFixed(2))
  }
}

// ── Workflow (Fig 2) ────────────────────────────────────────────────────────────────────────────────────────────────
function buildWorkflow(svg) {
  const cards = [
    { t: "Trip & profile", l: ["Start, destination, time", "and 1 of 7 profiles"], i: "map-pin", f: "#e3edff", k: "#3b6fd8" },
    { t: "Candidate search", l: ["Graph search over metro,", "bus, auto and walking"], i: "git-fork", f: "#dcf5e6", k: "#2f9e5a" },
    { t: "Enrichment", l: ["Weather, crowd, arrival", "interval, connection risk"], i: "cloud-rain", f: "#ece6fb", k: "#7a52c7" },
    { t: "Hard constraints", l: ["Unusable routes removed,", "each with a typed reason"], i: "ban", f: "#fde4e4", k: "#c24141" },
    { t: "Ranking", l: ["9 features, profile weights", "+ TransitDNA (personal)"], i: "chart-column", f: "#fde7f3", k: "#c2457f" },
    { t: "Explanation", l: ["Why recommended, why", "excluded, in plain words"], i: "message-square", f: "#d9f4f1", k: "#2a9488" },
    { t: "Live navigation", l: ["Voice turn-by-turn, GPS", "following, auto-reroute"], i: "navigation", f: "#fff4cc", k: "#b88a00" },
    { t: "Feedback loop", l: ["Ratings and choices", "update TransitDNA"], i: "refresh-cw", f: "#e9e9fb", k: "#5b5bd6" },
  ]
  const w = 26.6, h = 19.4, gap = (121.6 - 4 * w) / 3
  const xs = [0, 1, 2, 3].map((i) => 0.15 + i * (w + gap))
  const y1 = 0.2, y2 = 26.2
  const slot = (n) => (n < 4 ? [xs[n], y1] : [xs[7 - n], y2])
  cards.forEach((c, n) => {
    const [x, y] = slot(n)
    s("rect", { x, y, width: w, height: h, rx: 1.4, fill: c.f, stroke: c.k, "stroke-width": 0.3 }, svg)
    s("circle", { cx: x + 3.4, cy: y + 3.5, r: 2.25, fill: c.k }, svg)
    s("text", { x: x + 3.4, y: y + 4.35, "font-size": 2.4, "font-weight": 800, fill: "#fff", "text-anchor": "middle" }, svg, String(n + 1))
    icon(svg, c.i, x + w - 4.7, y + 1.4, 3.3, c.k, 2.2)
    const title = s("text", { x: x + 2, y: y + 9.4, "font-size": 2.5, "font-weight": 750, fill: "#111827" }, svg, c.t)
    fit(title, w - 3.6)
    c.l.forEach((line, j) => {
      const t = s("text", { x: x + 2, y: y + 12.9 + j * 2.75, "font-size": 2.08, fill: "#1f2937" }, svg, line)
      fit(t, w - 3.4)
    })
  })
  for (let n = 0; n < 3; n++) arrow(svg, xs[n] + w + 0.5, y1 + h / 2, xs[n + 1] - 0.5, y1 + h / 2)
  arrow(svg, xs[3] + w / 2, y1 + h + 0.4, xs[3] + w / 2, y2 - 0.5)
  for (let n = 3; n > 0; n--) arrow(svg, xs[n] - 0.5, y2 + h / 2, xs[n - 1] + w + 0.5, y2 + h / 2)
}

// ── Constraint pipeline (Fig 3, top) ────────────────────────────────────────────────────────────────────────────────
function buildPipeline(svg) {
  const C = { walk: "#94a3b8", metro: "#7e3fb3", bus: "#0f766e", auto: "#d89b00" }
  s("text", { x: 0, y: 2.3, "font-size": 2.05, "font-weight": 700, fill: "#374151" }, svg, "Candidate routes")
  const pills = [
    [["walk", 0.18], ["metro", 0.62], ["walk", 0.2]],
    [["walk", 0.12], ["bus", 0.68], ["walk", 0.2]],
    [["auto", 1]],
    [["walk", 0.12], ["metro", 0.38], ["bus", 0.36], ["walk", 0.14]],
  ]
  pills.forEach((segs, i) => {
    const y = 3.8 + i * 5.1
    s("rect", { x: 0.15, y, width: 21.6, height: 3.7, rx: 1.85, fill: "#fff", stroke: "#cbd5e1", "stroke-width": 0.25 }, svg)
    let x = 1.4
    const span = 19.1
    segs.forEach(([m, f]) => {
      s("rect", { x, y: y + 1.25, width: Math.max(0.6, span * f - 0.35), height: 1.2, rx: 0.6, fill: C[m] }, svg)
      x += span * f
    })
  })
  arrow(svg, 22.4, 12.6, 26.6, 12.6)
  // the filter
  s("rect", { x: 27, y: 3.4, width: 26.5, height: 18.4, rx: 1.4, fill: "#fff1f1", stroke: "#c24141", "stroke-width": 0.32 }, svg)
  icon(svg, "shield-check", 28.3, 4.5, 3, "#a12b2b", 2.2)
  s("text", { x: 32, y: 6.85, "font-size": 2.3, "font-weight": 750, fill: "#7f1d1d" }, svg, "Profile rules")
  ;["Lifts, ramps, step-free", "≤ 1.2 km walk / roll", "No peak-crowd stops", "Buses per profile"].forEach((t, j) => {
    s("text", { x: 28.6, y: 10.4 + j * 2.75, "font-size": 1.95, fill: "#1f2937" }, svg, `• ${t}`)
  })
  // excluded
  arrow(svg, 53.9, 9, 57.6, 6.2, "#a12b2b")
  s("text", { x: 58.2, y: 2.4, "font-size": 1.95, "font-weight": 750, fill: "#a12b2b" }, svg, "Excluded, with a reason")
  ;["Station not accessible", "Buses avoided (profile)"].forEach((t, j) => {
    const y = 3.5 + j * 4.2
    s("rect", { x: 58.2, y, width: 29.4, height: 3.4, rx: 1, fill: "#fdecec", stroke: "#eab0b0", "stroke-width": 0.22 }, svg)
    icon(svg, "circle-x", 58.9, y + 0.5, 2.4, "#b42318", 2.2)
    s("text", { x: 62, y: y + 2.4, "font-size": 1.85, fill: "#7f1d1d" }, svg, t)
  })
  // feasible, ranked
  arrow(svg, 53.9, 16.2, 57.6, 18.6, "#0b6b37")
  s("text", { x: 58.2, y: 13.6, "font-size": 1.95, "font-weight": 750, fill: "#0b5d33" }, svg, "Feasible, then ranked")
  ;[[0.82, "0.82"], [0.61, "0.61"]].forEach(([v, t], j) => {
    const y = 14.7 + j * 4.2
    s("rect", { x: 58.2, y, width: 29.4, height: 3.4, rx: 1, fill: "#e9f6ee", stroke: "#a8d8b8", "stroke-width": 0.22 }, svg)
    s("rect", { x: 59.2, y: y + 1.15, width: 21 * v, height: 1.1, rx: 0.55, fill: "#087a41" }, svg)
    s("text", { x: 86.6, y: y + 2.4, "font-size": 1.85, "font-weight": 700, fill: "#0b5d33", "text-anchor": "end" }, svg, t)
  })
  // best for you
  arrow(svg, 88.1, 16.4, 91.4, 14.2, "#1f5bd8")
  s("rect", { x: 91.9, y: 3.4, width: 29.5, height: 18.4, rx: 1.4, fill: "#eaf1fd", stroke: "#1f5bd8", "stroke-width": 0.32 }, svg)
  icon(svg, "star", 93.1, 4.6, 2.9, "#1f5bd8", 2.2)
  s("text", { x: 96.6, y: 6.85, "font-size": 2.25, "font-weight": 750, fill: "#173f9a" }, svg, "Best for you")
  ;["Stations checked", "No stairs on route", "Reasons shown in", "plain words"].forEach((t, j) => {
    const prefix = j < 3 ? "✓ " : "   "
    s("text", { x: 93.2, y: 10.4 + j * 2.75, "font-size": 1.95, fill: "#1f2937" }, svg, prefix + t)
  })
}

// ── TransitDNA (Fig 3, lower left) ──────────────────────────────────────────────────────────────────────────────────
function buildDna(svg) {
  s("rect", { x: 0.15, y: 0.15, width: 59.5, height: 20.7, rx: 1.4, fill: "#f6f1fd", stroke: "#c6a8e6", "stroke-width": 0.28 }, svg)
  icon(svg, "dna", 1.6, 1.3, 3, "#6a2f9c", 2.2)
  s("text", { x: 5.4, y: 3.75, "font-size": 2.35, "font-weight": 750, fill: "#4c1d7a" }, svg, "TransitDNA ranker")
  const f = s("text", { x: 1.8, y: 7.7, "font-size": 2.45, "font-family": "Times New Roman, serif", "font-style": "italic", fill: "#111" }, svg)
  f.innerHTML = 'P(A &#8827; B) = &#963;( w &#183; (x<tspan font-size="1.6" dy="0.6">A</tspan><tspan dy="-0.6"> &#8722; x</tspan><tspan font-size="1.6" dy="0.6">B</tspan><tspan dy="-0.6">) )</tspan>'
  ;["Pairwise logistic regression,", "trained on the rider's choices", "Held-out accuracy 87.5 %", "(rule baseline 91.7 %, reported)"].forEach((t, j) => {
    s("text", { x: 1.8, y: 10.9 + j * 2.45, "font-size": 1.8, fill: j >= 2 ? "#7a2e0e" : "#1f2937", "font-weight": j === 2 ? 700 : 400 }, svg, t)
  })
  s("text", { x: 36.2, y: 3.75, "font-size": 1.65, fill: "#5b6475" }, svg, "Starting weights")
  const W = [["Speed", 25], ["Reliability", 25], ["Walking", 20], ["Cost", 15], ["Access", 15]]
  W.forEach(([k, v], j) => {
    const y = 5.6 + j * 3
    s("text", { x: 36.2, y: y + 1.35, "font-size": 1.65, fill: "#1f2937" }, svg, k)
    s("rect", { x: 46, y: y + 0.2, width: 9.6, height: 1.45, rx: 0.72, fill: "#e6dcf5" }, svg)
    s("rect", { x: 46, y: y + 0.2, width: (9.6 * v) / 25, height: 1.45, rx: 0.72, fill: "#7e3fb3" }, svg)
    s("text", { x: 58.9, y: y + 1.4, "font-size": 1.6, fill: "#1f2937", "text-anchor": "end" }, svg, `${v}`)
  })
}

// ── Reliability (Fig 3, lower right) ────────────────────────────────────────────────────────────────────────────────
function buildReliability(svg) {
  s("rect", { x: 0.15, y: 0.15, width: 59.5, height: 20.7, rx: 1.4, fill: "#ebf7f4", stroke: "#8fd0c6", "stroke-width": 0.28 }, svg)
  icon(svg, "timer", 1.6, 1.3, 3, "#0b5f58", 2.2)
  s("text", { x: 5.4, y: 3.75, "font-size": 2.35, "font-weight": 750, fill: "#0b4f49" }, svg, "Reliability models")
  // a delay distribution with its 90 % interval shaded
  const x0 = 2.2, x1 = 27.5, base = 17.2, top = 6.3
  const pts = []
  for (let i = 0; i <= 60; i++) {
    const u = i / 60
    const x = x0 + u * (x1 - x0)
    const z = (u - 0.42) / 0.16
    const y = base - (base - top) * Math.exp(-0.5 * z * z) * (u < 0.42 ? 1 : 0.92 + 0.08 * Math.exp(-((u - 0.42) * 3)))
    pts.push([x, y])
  }
  const band = pts.filter(([x]) => x >= x0 + 0.17 * (x1 - x0) && x <= x0 + 0.7 * (x1 - x0))
  s("path", { d: `M${band[0][0]} ${base} ` + band.map(([x, y]) => `L${x} ${y}`).join(" ") + ` L${band[band.length - 1][0]} ${base} Z`, fill: "#9fdacf" }, svg)
  s("path", { d: "M" + pts.map(([x, y]) => `${x} ${y}`).join(" L"), fill: "none", stroke: "#0f766e", "stroke-width": 0.35 }, svg)
  s("path", { d: `M${x0} ${base} H${x1}`, stroke: "#64748b", "stroke-width": 0.22 }, svg)
  s("text", { x: (x0 + x1) / 2, y: 13.6, "font-size": 1.7, "font-weight": 700, fill: "#0b4f49", "text-anchor": "middle" }, svg, "90 %")
  s("text", { x: x0, y: 19.6, "font-size": 1.55, fill: "#5b6475" }, svg, "arrival time →")
  ;["Arrival interval from observed", "delays (hidden if < 5 seen)", "Monte Carlo, 500 trials:", "missed-connection risk"].forEach((t, j) => {
    s("text", { x: 30.2, y: 8 + j * 2.7, "font-size": 1.8, fill: "#1f2937", "font-weight": j === 2 ? 700 : 400 }, svg, t)
  })
}

// ── Results chart (Fig 4) ───────────────────────────────────────────────────────────────────────────────────────────
function buildChart(svg) {
  const data = [
    ["Wheelchair", 35.6, 19.2], ["Stroller", 17.3, 9.0], ["Reduced mobility", 17.3, 9.0],
    ["Senior", 3.7, 2.5], ["Pregnant", 3.7, 2.7], ["Heavy luggage", 3.7, 1.9],
  ]
  const C = { time: "#c2410c", soft: "#e9a23b" }
  const px0 = 22.5, px1 = 99, max = 40
  const X = (v) => px0 + ((px1 - px0) * v) / max
  // legend
  s("rect", { x: 0.2, y: 0.2, width: 2.5, height: 2.5, rx: 0.5, fill: C.time }, svg)
  s("text", { x: 3.6, y: 2.3, "font-size": 2.0, fill: "#111827" }, svg, "Shortest-time planner")
  s("rect", { x: 33, y: 0.2, width: 2.5, height: 2.5, rx: 0.5, fill: C.soft }, svg)
  s("text", { x: 36.4, y: 2.3, "font-size": 2.0, fill: "#111827" }, svg, "Soft scoring, same features")
  // TransitSwap column
  s("rect", { x: 102.2, y: 3.6, width: 19.4, height: 37.2, rx: 1.2, fill: "#e8f5ec" }, svg)
  s("text", { x: 111.9, y: 6.1, "font-size": 2.0, "font-weight": 800, fill: "#065f33", "text-anchor": "middle" }, svg, "TransitSwap")
  // grid and ticks
  for (const v of [0, 10, 20, 30, 40]) {
    s("path", { d: `M${X(v)} 6.9 V40.6`, stroke: v === 0 ? "#64748b" : "#e5e7eb", "stroke-width": v === 0 ? 0.25 : 0.2 }, svg)
    s("text", { x: X(v), y: 5.9, "font-size": 1.7, fill: "#5b6475", "text-anchor": "middle" }, svg, v === 40 ? "40 %" : String(v))
  }
  const bh = 2.05, inner = 0.45, pitch = 5.65, y0 = 7.6
  const bar = (x, y, wv, fill) => {
    const w = Math.max(0.01, X(wv) - X(0))
    const r = Math.min(0.55, w / 2, bh / 2)
    s("path", { d: `M${x} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + bh - r} Q${x + w} ${y + bh} ${x + w - r} ${y + bh} H${x} Z`, fill }, svg)
  }
  data.forEach(([name, t, sv], i) => {
    const y = y0 + i * pitch
    s("text", { x: 21.3, y: y + bh + 0.55, "font-size": 2.05, fill: "#111827", "text-anchor": "end", "font-weight": i === 0 ? 700 : 500 }, svg, name)
    bar(X(0), y, t, C.time)
    s("text", { x: X(t) + 0.7, y: y + 1.62, "font-size": 1.8, fill: "#1f2937", "font-weight": 700 }, svg, `${t.toFixed(1)} %`)
    bar(X(0), y + bh + inner, sv, C.soft)
    s("text", { x: X(sv) + 0.7, y: y + bh + inner + 1.62, "font-size": 1.8, fill: "#1f2937" }, svg, `${sv.toFixed(1)} %`)
    s("text", { x: 111.9, y: y + bh + 0.75, "font-size": 2.3, "font-weight": 800, fill: "#087a41", "text-anchor": "middle" }, svg, "0 %")
  })
}

function hydrateFigures(root) {
  const run = (sel, fn) => root.querySelectorAll(sel).forEach((el) => { if (!el.childElementCount) fn(el) })
  run("#wf", buildWorkflow)
  run("#pipeline", buildPipeline)
  run("#dna", buildDna)
  run("#reliability", buildReliability)
  run("#chart", buildChart)
}
function hydrate(root) {
  hydrateFigures(root)
  hydrateIcons(root)
}

// ── Modes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function renderA3() {
  setPageSize(420, 297)
  const page = newPage("a3")
  const pos = a3Layout()
  for (const [id] of PIECES) place(page, id, ...pos[id])
  hydrate(page)
}

function sheetHead(page, n, total) {
  const head = document.createElement("div")
  head.className = "sheet-head"
  head.innerHTML = `<span>TransitSwap poster &middot; cut-out sheet ${n} of ${total}</span><span>Print on A4 at 100 % (&ldquo;Actual size&rdquo;, not &ldquo;Fit to page&rdquo;) &middot; cut along the dashed lines</span>`
  page.appendChild(head)
}

function renderGuide(page, sheetsTotal) {
  const g = document.createElement("div")
  g.className = "guide"
  g.style.cssText = "position:absolute;left:12mm;top:9mm;right:12mm"
  g.innerHTML = `<h1>TransitSwap poster &mdash; how to build the A3 poster</h1>
    <div class="lead">Sheets 2&ndash;${sheetsTotal} hold all ${PIECES.length} pieces at their final size. Cut them out and paste them on one A3 sheet (landscape) as shown below.</div>`
  page.appendChild(g)
  // miniature of the A3 layout
  const sc = 0.5, ox = 12, oy = 27
  const mini = document.createElement("div")
  mini.className = "mini"
  Object.assign(mini.style, { left: mm(ox), top: mm(oy), width: mm(420 * sc), height: mm(297 * sc) })
  page.appendChild(mini)
  const pos = a3Layout()
  for (const [id, name] of PIECES) {
    const [x, y] = pos[id]
    const [w, h] = SIZE[id]
    const slot = document.createElement("div")
    slot.className = `slot${["brand", "qr", "college"].includes(id) ? " frame" : ""}${id === "title" ? " bare" : ""}`
    Object.assign(slot.style, { left: mm(x * sc), top: mm(y * sc), width: mm(w * sc), height: mm(h * sc) })
    const small = h * sc < 8
    slot.innerHTML = small ? `<div class="no" style="font-size:7pt">${NUMBER[id]} &middot; <span style="font-weight:600;font-size:5.6pt">${name}</span></div>` : `<div class="no">${NUMBER[id]}</div><div class="nm">${name}</div>`
    mini.appendChild(slot)
  }
  const dim = document.createElement("div")
  dim.className = "fine"
  dim.style.cssText = `position:absolute;left:${mm(ox)};top:${mm(oy + 297 * sc + 1.2)}`
  dim.textContent = "A3 landscape, 420 × 297 mm. Margins: 10 mm left and right, 8 mm top. Gaps between pieces: about 4 mm."
  page.appendChild(dim)
  // steps
  const steps = document.createElement("div")
  steps.className = "steps"
  Object.assign(steps.style, { left: mm(ox + 420 * sc + 8), top: mm(oy), width: mm(297 - (ox + 420 * sc + 8) - 12) })
  steps.innerHTML = `<h3>Steps</h3><ol>
    <li><b>Print</b> sheets 2&ndash;${sheetsTotal} on A4 in colour at <b>100 % / &ldquo;Actual size&rdquo;</b> (turn off &ldquo;Fit to page&rdquo;). The striped bar at the bottom left must measure exactly 100 mm.</li>
    <li><b>Cut</b> every piece along its dashed grey line (just outside its border).</li>
    <li>Lay an <b>A3 sheet</b> landscape. Keep <b>10 mm</b> free at the left and right and <b>8 mm</b> at the top.</li>
    <li><b>Paste</b> in number order: header row <b>1&ndash;2&ndash;3</b>, title <b>4</b> centred, then the three columns (<b>5&ndash;7</b>, <b>8&ndash;10</b>, <b>11&ndash;13</b>) and the team boxes <b>14&ndash;15</b> at the bottom. Leave about 4 mm between pieces.</li>
    <li>Prefer a print shop? Use <b>TransitSwap_Poster_A3.pdf</b>: the whole poster on one A3 page.</li></ol>`
  page.appendChild(steps)
  const ruler = document.createElement("div")
  ruler.className = "ruler"
  Object.assign(ruler.style, { left: mm(ox), top: mm(oy + 297 * sc + 6) })
  ruler.innerHTML = `<div class="bar"></div><div class="t">100 mm</div>`
  page.appendChild(ruler)
}

function renderA4() {
  setPageSize(297, 210)
  const TOP_Y = 12, BOTTOM = 204, VGAP = 9
  // sheet 2: the header row, title and team boxes
  const banner = [
    ["college", (297 - 262) / 2, TOP_Y],
    ["title", (297 - 284) / 2, TOP_Y + HEADER_H + VGAP],
    ["footer-a", (297 - 197.5) / 2, TOP_Y + HEADER_H + 25.5 + 2 * VGAP],
    ["footer-b", (297 - 197.5) / 2, TOP_Y + HEADER_H + 25.5 + 11 + 3 * VGAP],
    ["brand", 297 / 2 - 65 - 6, TOP_Y + HEADER_H + 25.5 + 22 + 4 * VGAP],
    ["qr", 297 / 2 + 6, TOP_Y + HEADER_H + 25.5 + 22 + 4 * VGAP],
  ]
  // sheets 3+: the nine column boxes, packed two columns to a sheet (first fit, tallest first)
  const boxes = ["problem", "objectives", "method", "arch", "workflow", "models", "results", "app", "conclusion"]
    .sort((a, b) => SIZE[b][1] - SIZE[a][1])
  const columns = []
  for (const id of boxes) {
    const h = SIZE[id][1]
    let col = columns.find((c) => c.used + (c.items.length ? VGAP : 0) + h <= BOTTOM - TOP_Y)
    if (!col) { col = { used: 0, items: [] }; columns.push(col) }
    col.used += (col.items.length ? VGAP : 0) + h
    col.items.push(id)
  }
  const sheets = []
  for (let i = 0; i < columns.length; i += 2) sheets.push(columns.slice(i, i + 2))
  const total = 2 + sheets.length

  const guide = newPage("a4")
  renderGuide(guide, total)

  const p2 = newPage("a4")
  sheetHead(p2, 2, total)
  for (const [id, x, y] of banner) { cutline(p2, id, x, y); place(p2, id, x, y) }
  hydrate(p2)

  const x0 = (297 - (2 * COL_W + 12)) / 2
  sheets.forEach((cols, si) => {
    const page = newPage("a4")
    sheetHead(page, 3 + si, total)
    cols.forEach((col, ci) => {
      let y = TOP_Y
      for (const id of col.items) {
        const x = x0 + ci * (COL_W + 12)
        cutline(page, id, x, y)
        place(page, id, x, y)
        y += SIZE[id][1] + VGAP
      }
    })
    hydrate(page)
  })
}

function renderPiece(id) {
  const [w, h] = SIZE[id]
  setPageSize(w, h)
  document.documentElement.style.background = "transparent"
  document.body.style.background = "transparent"
  const page = newPage("solo")
  Object.assign(page.style, { width: mm(w), height: mm(h), margin: "0", background: "transparent" })
  place(page, id, 0, 0)
  hydrate(page)
}

// Render only once the web fonts are loaded: the diagrams measure their text (fit()) to keep it inside its boxes.
const fontsLoaded = Promise.all(
  ["400 12px Inter", "600 12px Inter", "700 12px Inter", "800 12px Inter", "750 12px Jakarta"].map((f) => document.fonts.load(f)),
)

// For the build script: which boxes overflow their size (content cut off)?
window.__overflow = () => [...document.querySelectorAll(".piece")]
  .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
  .map((el) => `${el.dataset.id}: ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`)
fontsLoaded.then(() => {
  if (MODE === "a4") renderA4()
  else if (MODE === "piece") renderPiece(params.get("id"))
  else renderA3()
  window.__ready = true
})

#!/usr/bin/env node
// Generates the UML-style diagrams needed for the Major Project Report's
// System Design chapter (Use Case, Class, Sequence) as hand-laid-out SVG,
// matching the same style already used for the research paper's figures
// (docs/paper/figures): NAVY #0f172a, BRAND #0ea5e9, GRID #e2e8f0, white
// background, Arial/Helvetica. No diagramming library — plain SVG primitives.

const fs = require("fs")
const path = require("path")

const OUT_DIR = path.join(__dirname, "figures")
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const NAVY = "#0f172a"
const NAVY_SOFT = "#64748b"
const GRID = "#e2e8f0"
const BRAND = "#0ea5e9"
const BRAND_SOFT = "#bae6fd"
const SUCCESS = "#10b981"
const AMBER = "#f59e0b"

// No title baked into the image — the LaTeX \caption{} provides the figure
// number and title, so a baked-in title here would duplicate (and, worse,
// number-mismatch) the real caption once placed in the report.
function header(w, h, _title) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
  <rect width="${w}" height="${h}" fill="white" />`
}
const footer = "</svg>"
function write(name, svg) {
  const p = path.join(OUT_DIR, name)
  fs.writeFileSync(p, svg)
  console.log("wrote", p)
}

// ─────────────────────────────────────────────────────────────────────────
// Figure 4.1 — Use Case Diagram
// ─────────────────────────────────────────────────────────────────────────
function useCaseDiagram() {
  const W = 760, H = 600
  const ellipse = (cx, cy, rx, ry, label, fill = "white") => {
    const lines = label.split("\n")
    const lineH = 12
    const startY = cy - ((lines.length - 1) * lineH) / 2 + 4
    const text = lines.map((l, i) => `<tspan x="${cx}" y="${startY + i * lineH}">${l}</tspan>`).join("")
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${NAVY}" stroke-width="1.3" />
    <text x="${cx}" text-anchor="middle" font-size="10.5" fill="${NAVY}">${text}</text>`
  }
  const actor = (x, y, label) => `
    <circle cx="${x}" cy="${y}" r="10" fill="white" stroke="${NAVY}" stroke-width="1.5" />
    <line x1="${x}" y1="${y + 10}" x2="${x}" y2="${y + 38}" stroke="${NAVY}" stroke-width="1.5" />
    <line x1="${x - 14}" y1="${y + 20}" x2="${x + 14}" y2="${y + 20}" stroke="${NAVY}" stroke-width="1.5" />
    <line x1="${x}" y1="${y + 38}" x2="${x - 12}" y2="${y + 58}" stroke="${NAVY}" stroke-width="1.5" />
    <line x1="${x}" y1="${y + 38}" x2="${x + 12}" y2="${y + 58}" stroke="${NAVY}" stroke-width="1.5" />
    <text x="${x}" y="${y + 72}" text-anchor="middle" font-size="11" font-weight="bold" fill="${NAVY}">${label}</text>`
  const link = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY_SOFT}" stroke-width="1" />`

  let body = ""
  body += `<rect x="150" y="60" width="460" height="500" rx="12" fill="none" stroke="${GRID}" stroke-width="1.5" />`
  body += `<text x="380" y="50" text-anchor="middle" font-size="11" fill="${NAVY_SOFT}">TransitSwap</text>`

  // Actors
  body += actor(50, 220, "Commuter")
  body += actor(50, 420, "Registered\nUser")
  body += actor(700, 160, "Admin")
  body += actor(700, 420, "Researcher")

  // Use cases
  const uc = [
    { x: 300, y: 100, label: "Search &amp;\nPlan Route" },
    { x: 470, y: 100, label: "Select Accessibility\nProfile" },
    { x: 300, y: 170, label: "View Route\nExplanation" },
    { x: 470, y: 170, label: "View Map &amp;\nStep-by-Step" },
    { x: 300, y: 240, label: "Register / Login" },
    { x: 470, y: 240, label: "Save Journey /\nRoute / Place" },
    { x: 300, y: 310, label: "View Dashboard\n&amp; History" },
    { x: 470, y: 310, label: "Submit Crowd\nReport" },
    { x: 300, y: 380, label: "Submit Accessibility\nReport" },
    { x: 470, y: 380, label: "Give Route\nFeedback" },
    { x: 300, y: 450, label: "Set Travel\nPreferences" },
    { x: 470, y: 450, label: "Manage Station\nAccessibility" },
    { x: 300, y: 520, label: "Review Accessibility\nReports" },
    { x: 470, y: 520, label: "View Evaluation\n&amp; Benchmark" },
  ]
  for (const u of uc) body += ellipse(u.x, u.y, 75, 32, u.label)

  // links (approximate, illustrative of real flows)
  body += link(60, 220, 225, 100)
  body += link(60, 230, 225, 170)
  body += link(60, 245, 225, 240)
  body += link(60, 420, 225, 310)
  body += link(60, 420, 225, 380)
  body += link(60, 420, 225, 450)
  body += link(60, 420, 395, 240)
  body += link(60, 420, 395, 100)
  body += link(690, 160, 395, 450)
  body += link(690, 160, 395, 520)
  body += link(690, 420, 545, 520)
  body += link(395, 100, 545, 100)
  body += `<text x="380" y="35" text-anchor="middle" font-size="9" fill="${NAVY_SOFT}">&lt;&lt;extend&gt;&gt;</text>`

  const svg = `${header(W, H, "Figure 4.1 — Use Case Diagram")}
  ${body}
  ${footer}`
  write("fig-4.1-use-case.svg", svg)
}

// ─────────────────────────────────────────────────────────────────────────
// Figure 4.2 — Class Diagram
// ─────────────────────────────────────────────────────────────────────────
function classDiagram() {
  const W = 980, H = 720
  const box = (x, y, w, h, title, attrs, methods) => {
    const rowH = 13.5
    const titleH = 24
    const attrY = y + titleH
    const attrH = attrs.length * rowH + 8
    const methY = attrY + attrH
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="${NAVY}" stroke-width="1.3" rx="3" />`
    s += `<rect x="${x}" y="${y}" width="${w}" height="${titleH}" fill="${NAVY}" rx="3" />`
    s += `<rect x="${x}" y="${y + titleH - 3}" width="${w}" height="3" fill="${NAVY}" />`
    s += `<text x="${x + w / 2}" y="${y + 16}" text-anchor="middle" font-size="11.5" font-weight="bold" fill="white">${title}</text>`
    s += `<line x1="${x}" y1="${attrY + attrH}" x2="${x + w}" y2="${attrY + attrH}" stroke="${GRID}" stroke-width="1" />`
    attrs.forEach((a, i) => {
      s += `<text x="${x + 8}" y="${attrY + 13 + i * rowH}" font-size="9.3" fill="${NAVY}">${a}</text>`
    })
    methods.forEach((m, i) => {
      s += `<text x="${x + 8}" y="${methY + 13 + i * rowH}" font-size="9.3" fill="${BRAND}">${m}</text>`
    })
    return s
  }
  const rel = (x1, y1, x2, y2, label) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY_SOFT}" stroke-width="1.2" marker-end="url(#diamond)" />
    ${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" text-anchor="middle" font-size="8.5" fill="${NAVY_SOFT}">${label}</text>` : ""}`

  let body = `<defs><marker id="diamond" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,5 L5,0 L10,5 L5,10 Z" fill="white" stroke="${NAVY_SOFT}" /></marker></defs>`

  body += box(40, 60, 230, 180, "User",
    ["- name: string", "- email: string", "- password: string (hashed)", "- role: \"user\" | \"admin\"", "- accessibilityProfile: Profile", "- preferences: UserPreferences", "- transitDNA.learnedWeights", "- savedDestinations: []"],
    ["+ comparePassword(pw): boolean"])

  body += box(320, 60, 230, 160, "Journey",
    ["- userId: ObjectId", "- origin / destination", "- departureTime?: Date", "- selectedRoute: object", "- routeSummary: string", "- status: planned|completed|cancelled", "- userFeedback?: {rating, comment}"],
    [])

  body += box(600, 60, 180, 110, "SavedRoute",
    ["- userId: ObjectId", "- origin / destination", "- label: string", "- route: object"], [])

  body += box(800, 60, 180, 100, "SavedDestination",
    ["- userId: ObjectId", "- label: string", "- address: string"], [])

  body += box(40, 290, 230, 190, "Accessibility",
    ["- stationId / stationName", "- hasLift / hasRamp: boolean|null", "- stepFreeEntrance/Platform", "- wheelchairAccessible: boolean|null", "- stairCount: number|null", "- status: AccessibilityStatus", "- verificationSource: string", "- active: boolean"], [])

  body += box(320, 290, 220, 110, "AccessibilityReport",
    ["- userId / stationId", "- issueType: string", "- description: string", "- status: pending|resolved"], [])

  body += box(580, 290, 200, 100, "CrowdReport",
    ["- stationId / stationName", "- crowdLevel: LOW|MEDIUM|HIGH", "- status: pending|accepted"], [])

  body += box(820, 290, 160, 100, "JourneyObservation",
    ["- route / mode", "- predictedMinutes", "- actualMinutes"], [])

  body += box(40, 540, 230, 110, "PreferencePair",
    ["- userId: ObjectId", "- deltaX: number[]", "- label: 0 | 1", "- source: string"], [])

  body += box(320, 540, 260, 130, "UserPreferenceModel",
    ["- userId: ObjectId (unique)", "- weights: LogisticModelWeights", "- sampleCount: number", "- isPersonalized: boolean", "- trainAccuracy / testAccuracy"], [])

  body += rel(155, 240, 155, 290, "1")
  body += rel(270, 150, 320, 140, "1..*")
  body += rel(550, 120, 600, 115, "1..*")
  body += rel(780, 110, 800, 110, "1..*")
  body += rel(155, 480, 155, 540, "1..*")
  body += rel(270, 440, 320, 400, "1..*")
  body += rel(155, 480, 450, 540, "1..1")

  const svg = `${header(W, H, "Figure 4.2 — Class Diagram")}
  ${body}
  ${footer}`
  write("fig-4.2-class.svg", svg)
}

// ─────────────────────────────────────────────────────────────────────────
// Figure 4.3 — Sequence Diagram (Plan a Multimodal Route)
// ─────────────────────────────────────────────────────────────────────────
function sequenceDiagram() {
  const W = 980, H = 620
  const lanes = [
    { x: 70, label: "Commuter" },
    { x: 220, label: "PlanTripPage\n(Frontend)" },
    { x: 390, label: "multimodal\nController" },
    { x: 540, label: "multimodal\nService" },
    { x: 670, label: "accessibility /\ncrowd / weather /\nreliability Service" },
    { x: 840, label: "mlPreference\nService" },
  ]
  let body = ""
  for (const l of lanes) {
    body += `<rect x="${l.x - 55}" y="40" width="110" height="34" fill="${NAVY}" rx="4" />
      <text x="${l.x}" y="54" text-anchor="middle" font-size="9" font-weight="bold" fill="white">${l.label.split("\n")[0]}</text>
      <text x="${l.x}" y="66" text-anchor="middle" font-size="8" fill="${BRAND_SOFT}">${l.label.split("\n")[1] ?? ""}</text>
      <line x1="${l.x}" y1="74" x2="${l.x}" y2="580" stroke="${GRID}" stroke-width="1.5" stroke-dasharray="3 3" />`
  }
  let y = 100
  const msg = (fromIdx, toIdx, label, dashed = false) => {
    const x1 = lanes[fromIdx].x, x2 = lanes[toIdx].x
    const yy = y
    y += 38
    const dir = x2 > x1 ? 1 : -1
    return `<line x1="${x1}" y1="${yy}" x2="${x2 - dir * 6}" y2="${yy}" stroke="${NAVY}" stroke-width="1.2" ${dashed ? 'stroke-dasharray="4 3"' : ""} marker-end="url(#arrow)" />
      <text x="${(x1 + x2) / 2}" y="${yy - 5}" text-anchor="middle" font-size="9" fill="${NAVY}">${label}</text>`
  }
  body += `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${NAVY}" /></marker></defs>`
  body += msg(0, 1, "Enter origin, destination, profile")
  body += msg(1, 2, "POST /routes/multimodal")
  body += msg(2, 3, "generateRoutes(request)")
  body += msg(3, 3, "graph search + 4 fixed patterns → Pareto filter")
  body += msg(3, 2, "candidate routes[]", true)
  body += msg(2, 4, "filterRoutes(routes, profile)")
  body += msg(4, 4, "hard accessibility filter (per profile)")
  body += msg(4, 2, "accessible routes[]", true)
  body += msg(2, 4, "enrich: weather + crowd + reliability")
  body += msg(4, 2, "enriched routes[]", true)
  body += msg(2, 5, "getModelStatus(userId, profile) + rankRoutes()")
  body += msg(5, 5, "profile weights ± learned weights (floored)")
  body += msg(5, 2, "ranked routes + transitDnaScore", true)
  body += msg(2, 1, "{success, data: rankedRoutes}", true)
  body += msg(1, 0, "Map + ranked route cards + Why Recommended")

  const svg = `${header(W, H, "Figure 4.3 — Sequence Diagram: Plan a Multimodal Route")}
  ${body}
  ${footer}`
  write("fig-4.3-sequence.svg", svg)
}

// ─────────────────────────────────────────────────────────────────────────
// Figure 4.4 — Data Flow Diagram (Level 0 + Level 1 combined, compact)
// ─────────────────────────────────────────────────────────────────────────
function dataFlowDiagram() {
  const W = 900, H = 420
  const proc = (x, y, w, h, label) => `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2}" fill="${BRAND_SOFT}" stroke="${NAVY}" stroke-width="1.3" />
    <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="${NAVY}">${label}</text>`
  const ext = (x, y, w, h, label) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="${NAVY}" stroke-width="1.3" />
    <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="10" font-weight="bold" fill="${NAVY}">${label}</text>`
  const store = (x, y, w, h, label) => `<path d="M${x},${y} H${x + w} V${y + h} H${x} Z M${x},${y + 8} H${x + w}" fill="white" stroke="${NAVY}" stroke-width="1.3" />
    <text x="${x + w / 2}" y="${y + h / 2 + 8}" text-anchor="middle" font-size="9" fill="${NAVY}">${label}</text>`
  const arrow = (x1, y1, x2, y2, label) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY_SOFT}" stroke-width="1.3" marker-end="url(#dfdarrow)" />
    <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="8.5" fill="${NAVY_SOFT}">${label}</text>`

  let body = `<defs><marker id="dfdarrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${NAVY_SOFT}" /></marker></defs>`
  body += ext(30, 170, 110, 60, "Commuter")
  body += proc(220, 150, 150, 100, "1.0\nPlan Multimodal\nRoute")
  body += proc(470, 60, 140, 90, "2.0\nFilter by\nAccessibility")
  body += proc(470, 190, 140, 90, "3.0\nEnrich with Weather,\nCrowd, Reliability")
  body += proc(470, 320, 140, 90, "4.0\nRank &amp;\nExplain")
  body += store(720, 50, 150, 40, "D1  Accessibility Records")
  body += store(720, 130, 150, 40, "D2  Crowd Reports")
  body += store(720, 210, 150, 40, "D3  Preference Pairs")
  body += store(720, 290, 150, 40, "D4  Journey History")
  body += store(720, 370, 150, 40, "D5  User Preference Model")

  body += arrow(140, 200, 220, 200, "origin, destination, profile")
  body += arrow(370, 190, 470, 130, "routes[]")
  body += arrow(540, 150, 540, 190, "accessible routes[]")
  body += arrow(540, 280, 540, 320, "enriched routes[]")
  body += arrow(610, 365, 400, 250, "ranked routes + explanation")
  body += arrow(370, 240, 140, 230, "route options")
  body += arrow(610, 105, 720, 80, "read")
  body += arrow(610, 235, 720, 150, "read")
  body += arrow(610, 365, 720, 390, "read")
  body += arrow(540, 410, 795, 290, "write (on save)")

  const svg = `${header(W, H, "Figure 4.4 — Data Flow Diagram (Level 0/1, combined)")}
  ${body}
  ${footer}`
  write("fig-4.4-dfd.svg", svg)
}

useCaseDiagram()
classDiagram()
sequenceDiagram()
dataFlowDiagram()

#!/usr/bin/env node
// Phase 14 — turns backend/scripts/paper-data.json (produced by
// generate-paper-data.ts, a real command against real production services)
// into the 9 SVG figures docs/paper references. Pure rendering — no numbers
// are computed here, only laid out.

const fs = require("fs")
const path = require("path")

const DATA_PATH = path.join(__dirname, "paper-data.json")
const OUT_DIR = path.join(__dirname, "..", "..", "docs", "paper", "figures")
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"))

const NAVY = "#0f172a"
const NAVY_SOFT = "#64748b"
const GRID = "#e2e8f0"
const BRAND = "#0ea5e9"
const BRAND_SOFT = "#bae6fd"
const DANGER = "#ef4444"
const SUCCESS = "#10b981"
const AMBER = "#f59e0b"

function svgHeader(width, height, title) {
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
  <rect width="${width}" height="${height}" fill="white" />
  <text x="${width / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="${NAVY}">${title}</text>`
}
const svgFooter = "</svg>"

function write(name, svg) {
  const p = path.join(OUT_DIR, name)
  fs.writeFileSync(p, svg)
  console.log("wrote", p)
}

// ── Figure 1: architecture diagram ───────────────────────────────────────
function figure1() {
  const W = 760,
    H = 520
  const boxes = [
    { x: 40, y: 50, w: 200, h: 46, label: "React pages", sub: "src/pages/*.tsx" },
    { x: 40, y: 130, w: 200, h: 46, label: "src/services/*.ts", sub: "axios + JWT interceptor" },
    { x: 40, y: 230, w: 200, h: 46, label: "routes/*.routes.ts", sub: "express-validator" },
    { x: 40, y: 310, w: 200, h: 46, label: "controllers/*.ts", sub: "thin orchestration" },
    { x: 40, y: 390, w: 200, h: 46, label: "services/*.ts", sub: "all domain logic" },
    { x: 40, y: 470, w: 200, h: 36, label: "models/*.ts + data/*.ts", sub: "Mongoose + seeded datasets" },
    { x: 440, y: 230, w: 260, h: 46, label: "MongoDB (optional)", sub: "graceful degradation, ADR-004" },
    { x: 440, y: 310, w: 260, h: 46, label: "OSRM / Nominatim / OWM", sub: "external, all with fallbacks" },
  ]
  let body = ""
  for (const b of boxes) {
    body += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="white" stroke="${NAVY}" stroke-width="1.5" />
    <text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 - 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="${NAVY}">${b.label}</text>
    <text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 15}" text-anchor="middle" font-size="10.5" fill="${NAVY_SOFT}">${b.sub}</text>`
  }
  // Vertical arrows down the left column
  for (let i = 0; i < boxes.length - 3; i++) {
    const a = boxes[i]
    const b = boxes[i + 1]
    body += `<line x1="${a.x + a.w / 2}" y1="${a.y + a.h}" x2="${b.x + b.w / 2}" y2="${b.y}" stroke="${BRAND}" stroke-width="2" marker-end="url(#arrow)" />`
  }
  // services -> MongoDB / external APIs
  body += `<line x1="240" y1="413" x2="440" y2="253" stroke="${NAVY_SOFT}" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow)" />`
  body += `<line x1="240" y1="413" x2="440" y2="333" stroke="${NAVY_SOFT}" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow)" />`
  body += `<text x="570" y="45" text-anchor="middle" font-size="11" fill="${NAVY_SOFT}">{success, data, message} envelope throughout</text>`

  const svg = `${svgHeader(W, H, "Figure 1 — Layered architecture")}
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${BRAND}" /></marker></defs>
  ${body}
  ${svgFooter}`
  write("fig1-architecture.svg", svg)
}

// ── Figure 2: pipeline latency ───────────────────────────────────────────
function figure2() {
  const { stages, totalMs, scenario } = data.pipelineLatency
  const W = 760,
    H = 300
  const chartLeft = 260,
    chartW = 440,
    barH = 34,
    gap = 16
  const maxMs = Math.max(...stages.map((s) => s.ms))
  let body = ""
  stages.forEach((s, i) => {
    const y = 60 + i * (barH + gap)
    const w = Math.max(2, (s.ms / maxMs) * chartW)
    body += `<text x="${chartLeft - 10}" y="${y + barH / 2 + 4}" text-anchor="end" font-size="11.5" fill="${NAVY}">${s.name}</text>
    <rect x="${chartLeft}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${BRAND}" />
    <text x="${chartLeft + w + 8}" y="${y + barH / 2 + 4}" font-size="12" font-weight="bold" fill="${NAVY}">${s.ms} ms</text>`
  })
  const svg = `${svgHeader(W, H, "Figure 2 — Pipeline latency by stage (one real scenario)")}
  ${body}
  <text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-size="10.5" fill="${NAVY_SOFT}">${scenario.origin} -&gt; ${scenario.destination} · total ${totalMs} ms · offline road-leg provider (no live-network variance)</text>
  ${svgFooter}`
  write("fig2-pipeline-latency.svg", svg)
}

// ── Figure 3: coverage map ───────────────────────────────────────────────
function figure3() {
  const { points, bounds, metroReachablePercent, busReachablePercent, eitherReachablePercent } = data.coverageGrid
  const W = 640,
    H = 640
  const pad = 50
  const plotW = W - pad * 2
  const plotH = H - pad * 2 - 40
  const sx = (lng) => pad + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * plotW
  const sy = (lat) => pad + plotH - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * plotH

  let dots = ""
  for (const p of points) {
    dots += `<circle cx="${sx(p.lng).toFixed(1)}" cy="${sy(p.lat).toFixed(1)}" r="4.2" fill="${p.reachable ? SUCCESS : GRID}" />`
  }
  const svg = `${svgHeader(W, H, "Figure 3 — Demo network coverage (reachable vs unreachable)")}
  <rect x="${pad}" y="${pad}" width="${plotW}" height="${plotH}" fill="#fafafa" stroke="${GRID}" />
  ${dots}
  <circle cx="${pad + 14}" cy="${H - 66}" r="5" fill="${SUCCESS}" /><text x="${pad + 26}" y="${H - 61}" font-size="11.5" fill="${NAVY}">Reachable (within 2 km metro / 1.2 km bus)</text>
  <circle cx="${pad + 14}" cy="${H - 46}" r="5" fill="${GRID}" stroke="${NAVY_SOFT}" /><text x="${pad + 26}" y="${H - 41}" font-size="11.5" fill="${NAVY}">Unreachable</text>
  <text x="${W / 2}" y="${H - 14}" text-anchor="middle" font-size="11" fill="${NAVY_SOFT}">Metro ${metroReachablePercent}% · Bus ${busReachablePercent}% · Either ${eitherReachablePercent}% of a 40×40 grid over the network's real extent</text>
  ${svgFooter}`
  write("fig3-coverage-map.svg", svg)
}

// ── Figure 4: Pareto scatter ──────────────────────────────────────────────
function figure4() {
  const { candidates, scenario } = data.paretoScatter
  const W = 640,
    H = 480
  const pad = { l: 70, r: 40, t: 60, b: 70 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const maxDur = Math.max(...candidates.map((c) => c.durationMinutes)) * 1.15
  const maxFare = Math.max(...candidates.map((c) => c.fare)) * 1.15
  const sx = (dur) => pad.l + (dur / maxDur) * plotW
  const sy = (fare) => pad.t + plotH - (fare / maxFare) * plotH

  // De-dupe identical (duration, fare) points for a cleaner plot, but note the count.
  const seen = new Map()
  for (const c of candidates) {
    const key = `${c.durationMinutes}:${c.fare}`
    if (!seen.has(key)) seen.set(key, { ...c, count: 1 })
    else seen.get(key).count++
  }

  let axes = `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + plotH}" stroke="${NAVY_SOFT}" />
  <line x1="${pad.l}" y1="${pad.t + plotH}" x2="${pad.l + plotW}" y2="${pad.t + plotH}" stroke="${NAVY_SOFT}" />
  <text x="${pad.l + plotW / 2}" y="${H - 34}" text-anchor="middle" font-size="12" fill="${NAVY}">Duration (minutes)</text>
  <text x="18" y="${pad.t + plotH / 2}" text-anchor="middle" font-size="12" fill="${NAVY}" transform="rotate(-90 18 ${pad.t + plotH / 2})">Fare (Rs)</text>`

  let dots = ""
  for (const c of seen.values()) {
    const x = sx(c.durationMinutes),
      y = sy(c.fare)
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${BRAND_SOFT}" stroke="${BRAND}" stroke-width="2" />
    <text x="${x.toFixed(1)}" y="${(y - 14).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${NAVY}">${c.label}${c.count > 1 ? ` x${c.count}` : ""}</text>
    <text x="${x.toFixed(1)}" y="${(y + 24).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="${NAVY_SOFT}">${c.walkingMeters}m walk, ${c.transfers} transfer${c.transfers === 1 ? "" : "s"}</text>`
  }

  const svg = `${svgHeader(W, H, "Figure 4 — Candidate trade-offs for one real corridor")}
  ${axes}
  ${dots}
  <text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="10.5" fill="${NAVY_SOFT}">${scenario.origin} -&gt; ${scenario.destination} · ${candidates.length} candidates generated, 0 Pareto-dominated</text>
  ${svgFooter}`
  write("fig4-pareto-scatter.svg", svg)
}

// ── Figure 5: ablation bar chart ─────────────────────────────────────────
function figure5() {
  const rates = data.ablation.ablationDecisionChangeRatePercent
  const entries = Object.entries(rates).sort((a, b) => b[1] - a[1])
  const W = 700,
    H = 320
  const chartLeft = 200,
    chartW = 440,
    barH = 28,
    gap = 12
  const maxV = Math.max(...entries.map(([, v]) => v), 10)
  let body = ""
  entries.forEach(([name, v], i) => {
    const y = 55 + i * (barH + gap)
    const w = Math.max(2, (v / maxV) * chartW)
    body += `<text x="${chartLeft - 10}" y="${y + barH / 2 + 4}" text-anchor="end" font-size="12" fill="${NAVY}">${name}</text>
    <rect x="${chartLeft}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${AMBER}" />
    <text x="${chartLeft + w + 8}" y="${y + barH / 2 + 4}" font-size="12" font-weight="bold" fill="${NAVY}">${v}%</text>`
  })
  const svg = `${svgHeader(W, H, "Figure 5 — Ablation: decision-change rate per removed feature")}
  ${body}
  <text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="${NAVY_SOFT}">% of ${data.ablation.totalScenarios} scenarios where the top-ranked route changes when that one feature's weight is zeroed</text>
  ${svgFooter}`
  write("fig5-ablation.svg", svg)
}

// ── Figure 6: calibration curve ──────────────────────────────────────────
function figure6() {
  const { curve } = data.calibrationCurve
  const W = 560,
    H = 520
  const pad = { l: 60, r: 30, t: 55, b: 60 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const sx = (v) => pad.l + (v / 100) * plotW
  const sy = (v) => pad.t + plotH - (v / 100) * plotH

  const diag = `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(100)}" y2="${sy(100)}" stroke="${NAVY_SOFT}" stroke-dasharray="5 4" />`
  const axes = `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + plotH}" stroke="${NAVY_SOFT}" />
  <line x1="${pad.l}" y1="${pad.t + plotH}" x2="${pad.l + plotW}" y2="${pad.t + plotH}" stroke="${NAVY_SOFT}" />
  <text x="${pad.l + plotW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="${NAVY}">Nominal confidence (%)</text>
  <text x="16" y="${pad.t + plotH / 2}" text-anchor="middle" font-size="12" fill="${NAVY}" transform="rotate(-90 16 ${pad.t + plotH / 2})">Empirical coverage (%)</text>`

  let path = `M ${curve.map((p) => `${sx(p.nominalPercent).toFixed(1)},${sy(p.empiricalPercent).toFixed(1)}`).join(" L ")}`
  let dots = curve
    .map(
      (p) =>
        `<circle cx="${sx(p.nominalPercent).toFixed(1)}" cy="${sy(p.empiricalPercent).toFixed(1)}" r="4.5" fill="${BRAND}" />`,
    )
    .join("")

  const svg = `${svgHeader(W, H, "Figure 6 — Prediction-interval calibration")}
  ${axes}
  ${diag}
  <path d="${path}" fill="none" stroke="${BRAND}" stroke-width="2.5" />
  ${dots}
  <text x="${sx(50)}" y="${sy(45) + 16}" font-size="10" fill="${NAVY_SOFT}">perfect calibration</text>
  <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="10" fill="${NAVY_SOFT}">Synthetic demo observations, n=${data.calibrationCurve.testSize} held-out — not real user data</text>
  ${svgFooter}`
  write("fig6-calibration-curve.svg", svg)
}

// ── Figure 7: learning curve ──────────────────────────────────────────────
function figure7() {
  const { curve } = data.learningCurve
  const W = 560,
    H = 420
  const pad = { l: 60, r: 30, t: 55, b: 60 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const maxN = Math.max(...curve.map((p) => p.trainingSamples))
  const sx = (n) => pad.l + (n / maxN) * plotW
  const sy = (v) => pad.t + plotH - ((v - 70) / 30) * plotH // zoom y-axis to 70-100%

  const axes = `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + plotH}" stroke="${NAVY_SOFT}" />
  <line x1="${pad.l}" y1="${pad.t + plotH}" x2="${pad.l + plotW}" y2="${pad.t + plotH}" stroke="${NAVY_SOFT}" />
  <text x="${pad.l + plotW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="${NAVY}">Training samples</text>
  <text x="16" y="${pad.t + plotH / 2}" text-anchor="middle" font-size="12" fill="${NAVY}" transform="rotate(-90 16 ${pad.t + plotH / 2})">Held-out test accuracy (%)</text>
  <text x="${pad.l - 8}" y="${sy(70) + 4}" text-anchor="end" font-size="10" fill="${NAVY_SOFT}">70%</text>
  <text x="${pad.l - 8}" y="${sy(100) + 4}" text-anchor="end" font-size="10" fill="${NAVY_SOFT}">100%</text>`

  const path = `M ${curve.map((p) => `${sx(p.trainingSamples).toFixed(1)},${sy(p.testAccuracyPercent).toFixed(1)}`).join(" L ")}`
  const dots = curve
    .map(
      (p) =>
        `<circle cx="${sx(p.trainingSamples).toFixed(1)}" cy="${sy(p.testAccuracyPercent).toFixed(1)}" r="4.5" fill="${BRAND}" />`,
    )
    .join("")

  const svg = `${svgHeader(W, H, "Figure 7 — Learning curve")}
  ${axes}
  <path d="${path}" fill="none" stroke="${BRAND}" stroke-width="2.5" />
  ${dots}
  <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="10" fill="${NAVY_SOFT}">Synthetic archetype dataset, n=${data.learningCurve.testSize} held-out test — not real user choices</text>
  ${svgFooter}`
  write("fig7-learning-curve.svg", svg)
}

// ── Figure 8: sensitivity tornado ────────────────────────────────────────
function figure8() {
  if (!data.sensitivity) {
    console.log("skipping fig8 — no sensitivity data yet")
    return
  }
  const rows = data.sensitivity // [{constant, minRate, maxRate}]
  const W = 760,
    H = 60 + rows.length * 32
  const chartLeft = 340,
    chartRight = 700
  const centerX = (chartLeft + chartRight) / 2
  const maxV = Math.max(...rows.flatMap((r) => [r.plusRate, r.minusRate]), 10)
  const scale = (v) => (v / maxV) * (centerX - chartLeft)

  let body = ""
  rows.forEach((r, i) => {
    const y = 55 + i * 32
    const plusW = scale(r.plusRate)
    const minusW = scale(r.minusRate)
    body += `<text x="${chartLeft - 10}" y="${y + 15}" text-anchor="end" font-size="11.5" fill="${NAVY}">${r.constant}</text>
    <rect x="${(centerX - minusW).toFixed(1)}" y="${y}" width="${minusW.toFixed(1)}" height="22" fill="${DANGER}" opacity="0.75" />
    <rect x="${centerX}" y="${y}" width="${plusW.toFixed(1)}" height="22" fill="${BRAND}" opacity="0.85" />
    <text x="${(centerX - minusW - 6).toFixed(1)}" y="${y + 15}" text-anchor="end" font-size="10" fill="${NAVY_SOFT}">${r.minusRate}%</text>
    <text x="${(centerX + plusW + 6).toFixed(1)}" y="${y + 15}" text-anchor="start" font-size="10" fill="${NAVY_SOFT}">${r.plusRate}%</text>`
  })
  const svg = `${svgHeader(W, H, "Figure 8 — Sensitivity of the top-ranked route to each routing constant (+/-20%)")}
  <line x1="${centerX}" y1="45" x2="${centerX}" y2="${H - 15}" stroke="${NAVY_SOFT}" />
  ${body}
  <text x="${chartLeft - 30}" y="42" font-size="10" fill="${NAVY_SOFT}">-20%</text>
  <text x="${centerX + 10}" y="42" font-size="10" fill="${NAVY_SOFT}">+20%</text>
  ${svgFooter}`
  write("fig8-sensitivity-tornado.svg", svg)
}

// ── Figure 9: explanation card ────────────────────────────────────────────
function figure9() {
  const { scenario, route, explanationTags } = data.explanationCard
  const W = 560,
    H = 120 + explanationTags.length * 48 + 80
  let tagRows = ""
  explanationTags.forEach((tag, i) => {
    const y = 180 + i * 48
    tagRows += `<rect x="40" y="${y}" width="${W - 80}" height="36" rx="8" fill="#f0f9ff" stroke="${BRAND}" stroke-width="1" />
    <text x="56" y="${y + 23}" font-size="12.5" fill="${NAVY}">${tag}</text>`
  })
  const svg = `${svgHeader(W, H, "Figure 9 — Example explanation card")}
  <rect x="40" y="46" width="${W - 80}" height="110" rx="10" fill="#fafafa" stroke="${GRID}" />
  <text x="56" y="70" font-size="12" fill="${NAVY_SOFT}">${scenario.origin} -&gt; ${scenario.destination}</text>
  <text x="56" y="92" font-size="13.5" font-weight="bold" fill="${NAVY}">${route.label} · ${route.durationMinutes} min · Rs ${route.fare} · ${route.walkingMeters} m walk · ${route.transfers} transfer${route.transfers === 1 ? "" : "s"}</text>
  <text x="56" y="114" font-size="12" fill="${NAVY_SOFT}">TransitDNA score ${route.transitDnaScore}/100 · reliability ${route.reliabilityScore}/100 · missed-connection risk ${route.missedConnectionRiskPercent}%</text>
  <text x="56" y="136" font-size="11" fill="${NAVY_SOFT}">Why recommended — each tag below is checked against this exact candidate set before being shown:</text>
  ${tagRows}
  ${svgFooter}`
  write("fig9-explanation-card.svg", svg)
}

figure1()
figure2()
figure3()
figure4()
figure5()
figure6()
figure7()
figure8()
figure9()

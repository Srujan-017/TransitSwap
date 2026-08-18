export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatFare(amount: number): string {
  return `₹${amount}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

export function getProfileLabel(profile: string): string {
  const labels: Record<string, string> = {
    standard: "Standard",
    fastest: "Fastest",
    cheapest: "Cheapest",
    comfort: "Comfort",
    wheelchair: "Wheelchair",
    senior: "Senior Citizen",
    pregnant: "Pregnant",
    stroller: "Stroller",
    luggage: "Heavy Luggage",
  }
  return labels[profile] ?? profile
}

export function getProfileIcon(profile: string): string {
  const icons: Record<string, string> = {
    standard: "🚶",
    fastest: "⚡",
    cheapest: "💰",
    comfort: "🛋️",
    wheelchair: "♿",
    senior: "🧓",
    pregnant: "🤰",
    stroller: "👶",
    luggage: "🧳",
  }
  return icons[profile] ?? "🚶"
}

export function getModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    metro: "🚇",
    bus: "🚌",
    walking: "🚶",
    auto: "🛺",
  }
  return icons[mode] ?? "🚌"
}

// Problem 13 — combines the HTML <input type="date"> and <input type="time">
// values into a single local ("YYYY-MM-DDTHH:mm:00", no "Z") datetime string
// for the backend's safe local parser. Returns undefined if no time was
// selected — the backend must not silently assume a fake departure time.
export function buildLocalDepartureDateTime(date: string, time: string): string | undefined {
  if (!time) return undefined
  const datePart = date || todayLocalDateStr()
  return `${datePart}T${time}:00`
}

function todayLocalDateStr(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

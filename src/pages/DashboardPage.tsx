import { useState, useEffect, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  MapPin, Navigation, TrendingUp, Zap, ArrowRight, ChevronRight, Footprints, Dna, Bus,
  Star, Bookmark, Leaf, User as UserIcon, History as HistoryIcon, Search,
} from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import {
  tripService,
  type JourneyRecord,
  type SavedDestinationRecord,
  type SavedRouteRecord,
} from "../services/tripService"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import ProfileIcon from "../components/ui/ProfileIcon"
import ModeIcon from "../components/ui/ModeIcon"
import Photo from "../components/ui/Photo"
import StatTile from "../components/ui/StatTile"
import WeightBar from "../components/ui/WeightBar"
import Skeleton from "../components/ui/Skeleton"
import RouteEnds from "../components/ui/RouteEnds"
import { ModeChips } from "../components/ui/ModeStrip"
import { RadialGauge } from "../components/dashboard/DashboardIllustrations"
import { formatDate, formatTime } from "../utils/formatters"

// Each hub carries its own coordinates, so a tap opens Plan Trip with it already chosen as the destination.
const QUICK_DESTINATIONS = [
  { label: "MG Road Metro Station", address: "MG Road, Bengaluru", mode: "metro", latitude: 12.9757, longitude: 77.6079 },
  { label: "Majestic Metro Station", address: "Kempegowda Bus Station, Bengaluru", mode: "metro", latitude: 12.9767, longitude: 77.5713 },
  { label: "Shivajinagar Bus Stand", address: "Shivajinagar, Bengaluru", mode: "bus", latitude: 12.9868, longitude: 77.6047 },
]

// The words (and icons) shown in the Mobility Profile card.
const PROFILE_BADGE: Record<string, string> = {
  wheelchair: "Wheelchair", senior: "Senior", pregnant: "Pregnant", stroller: "Stroller", luggage: "Heavy Luggage", reduced_mobility: "Reduced Mobility",
}
const MODE_BADGE: Record<string, string> = { metro: "Metro", bus: "Bus", walking: "Walking", auto: "Auto" }
const PRIORITY_BADGE: Record<string, string> = { speed: "Speed", comfort: "Comfort", accessibility: "Accessibility", reliability: "Reliability" }

const QUICK_ACTIONS: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: "/plan", label: "Plan Journey", icon: <Navigation className="h-5 w-5" aria-hidden="true" /> },
  { to: "/history", label: "View History", icon: <HistoryIcon className="h-5 w-5" aria-hidden="true" /> },
  { to: "/saved-routes", label: "Saved Routes", icon: <Bookmark className="h-5 w-5" aria-hidden="true" /> },
  { to: "/profile", label: "Profile", icon: <UserIcon className="h-5 w-5" aria-hidden="true" /> },
]

/** A section title with an optional "View all" link on the right: the same pattern in every card on this page. */
function CardHeading({ title, hint, to, linkLabel = "View all", icon }: { title: string; hint?: string; to?: string; linkLabel?: string; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-900">
          {icon}
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-navy-600">{hint}</p>}
      </div>
      {to && (
        <Link to={to} className="flex-shrink-0 rounded-control px-1 py-1 text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthContext()
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")
  const [journeys, setJourneys] = useState<JourneyRecord[]>([])
  const [journeysLoading, setJourneysLoading] = useState(true)
  const [journeysError, setJourneysError] = useState("")

  // Problem 16 — Saved destinations & saved routes summaries for the dashboard.
  const [destinations, setDestinations] = useState<SavedDestinationRecord[]>([])
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [destinationsError, setDestinationsError] = useState("")
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteRecord[]>([])
  const [savedRoutesLoading, setSavedRoutesLoading] = useState(true)
  const [savedRoutesError, setSavedRoutesError] = useState("")

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/health`)
        const data = await res.json()
        setApiStatus(data.success ? "online" : "offline")
      } catch {
        setApiStatus("offline")
      }
    }
    checkHealth()
  }, [])

  // Journey history
  useEffect(() => {
    let cancelled = false
    async function loadJourneys() {
      setJourneysLoading(true)
      setJourneysError("")
      try {
        const data = await tripService.getHistory()
        if (!cancelled) setJourneys(data)
      } catch (err) {
        if (!cancelled) setJourneysError(err instanceof Error ? err.message : "Could not load journey history.")
      } finally {
        if (!cancelled) setJourneysLoading(false)
      }
    }
    loadJourneys()
    return () => {
      cancelled = true
    }
  }, [])

  // Problem 16 — Saved destinations (reuses existing saved-destination API).
  useEffect(() => {
    let cancelled = false
    async function loadDestinations() {
      setDestinationsLoading(true)
      setDestinationsError("")
      try {
        const data = await tripService.getDestinations()
        if (!cancelled) setDestinations(data)
      } catch (err) {
        if (!cancelled) setDestinationsError(err instanceof Error ? err.message : "Could not load saved destinations.")
      } finally {
        if (!cancelled) setDestinationsLoading(false)
      }
    }
    loadDestinations()
    return () => {
      cancelled = true
    }
  }, [])

  // Problem 16 — Saved routes summary (reuses existing Saved Routes API).
  useEffect(() => {
    let cancelled = false
    async function loadSavedRoutes() {
      setSavedRoutesLoading(true)
      setSavedRoutesError("")
      try {
        const data = await tripService.getSavedRoutes()
        if (!cancelled) setSavedRoutes(data)
      } catch (err) {
        if (!cancelled) setSavedRoutesError(err instanceof Error ? err.message : "Could not load saved routes.")
      } finally {
        if (!cancelled) setSavedRoutesLoading(false)
      }
    }
    loadSavedRoutes()
    return () => {
      cancelled = true
    }
  }, [])

  const recentJourneys = journeys.slice(0, 3)
  const now = new Date()
  // Problem 22 fix — prefer the journey's actual selected departureTime (when the
  // user picked one) over createdAt for "which month did I travel" grouping;
  // createdAt is only when the record was saved, not necessarily when travelled.
  const journeyDate = (j: JourneyRecord) => new Date(j.departureTime || j.createdAt)
  const journeysThisMonth = journeys.filter((j) => {
    const d = journeyDate(j)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  // Problem 22 fix — "Trips Completed" must reflect journey.status, not every
  // saved/planned journey. A journey only becomes "completed" once the user
  // has submitted feedback for it.
  const completedJourneys = journeys.filter((j) => j.status === "completed")
  const completedThisMonth = journeysThisMonth.filter((j) => j.status === "completed")
  const totalFareThisMonth = journeysThisMonth.reduce((sum, j) => sum + (j.estimatedFare ?? 0), 0)
  const totalWalkingThisMonth = journeysThisMonth.reduce((sum, j) => sum + (j.walkingDistanceMeters ?? 0), 0)

  const STATS: Array<{ label: string; value: string; icon: ReactNode; tone: "brand" | "warn" | "go" }> = [
    { label: "Trips Completed", value: String(completedThisMonth.length), icon: <Bus className="h-4 w-4" />, tone: "brand" },
    { label: "Est. Fare Spent", value: `₹${totalFareThisMonth}`, icon: <TrendingUp className="h-4 w-4" />, tone: "warn" },
    { label: "Walking Distance", value: `${(totalWalkingThisMonth / 1000).toFixed(1)} km`, icon: <Footprints className="h-4 w-4" />, tone: "go" },
  ]

  // Problem 16 — Travel statistics computed client-side from actual journey
  // history (existing tripService.getHistory() data). No fabricated numbers —
  // every value is derived, and falls back to an honest 0 when there is no data.
  const totalTrips = journeys.length
  const totalDurationSecondsAll = journeys.reduce((sum, j) => sum + (j.totalDurationSeconds ?? 0), 0)
  const totalFareAll = journeys.reduce((sum, j) => sum + (j.estimatedFare ?? 0), 0)
  const totalWalkingAll = journeys.reduce((sum, j) => sum + (j.walkingDistanceMeters ?? 0), 0)
  const totalTransfersAll = journeys.reduce((sum, j) => sum + (j.transferCount ?? 0), 0)
  const avgDurationMinutes = totalTrips > 0 ? Math.round(totalDurationSecondsAll / totalTrips / 60) : 0
  const avgFare = totalTrips > 0 ? Math.round(totalFareAll / totalTrips) : 0
  const avgWalkingMeters = totalTrips > 0 ? Math.round(totalWalkingAll / totalTrips) : 0
  const avgTransfers = totalTrips > 0 ? Number((totalTransfersAll / totalTrips).toFixed(1)) : 0

  const TRAVEL_STATS = [
    { label: "Trips Completed", value: String(completedJourneys.length) },
    { label: "Avg Travel Time", value: totalTrips > 0 ? `${avgDurationMinutes} min` : "—" },
    { label: "Total Est. Fare", value: `₹${totalFareAll}` },
    { label: "Avg Est. Fare", value: totalTrips > 0 ? `₹${avgFare}` : "—" },
    { label: "Total Walking", value: `${(totalWalkingAll / 1000).toFixed(1)} km` },
    { label: "Avg Walking", value: totalTrips > 0 ? `${avgWalkingMeters} m` : "—" },
    { label: "Total Transfers", value: String(totalTransfersAll) },
    { label: "Avg Transfers", value: totalTrips > 0 ? String(avgTransfers) : "—" },
  ]

  // Problem 16 — Sustainability summary, using only the existing relative
  // sustainabilityScore already stored on each journey's selected route
  // (Problem 9). No new environmental calculation is introduced.
  const journeysWithSustainability = journeys.filter(
    (j) => typeof (j.selectedRoute as { sustainabilityScore?: number } | undefined)?.sustainabilityScore === "number",
  )
  const avgSustainabilityScore =
    journeysWithSustainability.length > 0
      ? Math.round(
          journeysWithSustainability.reduce(
            (sum, j) => sum + ((j.selectedRoute as { sustainabilityScore?: number }).sustainabilityScore ?? 0),
            0,
          ) / journeysWithSustainability.length,
        )
      : null

  const weights = user?.transitDNA?.learnedWeights || {
    time: 0.25,
    cost: 0.15,
    walking: 0.2,
    reliability: 0.25,
    accessibility: 0.15,
  }
  // Problem 22 fix — TransitDNA weights must not be presented as "learned" when
  // no learning has actually occurred yet. totalTrips is incremented only when
  // the pairwise ML model actually updates from a route choice (Problem 8).
  const hasLearnedWeights = (user?.transitDNA?.totalTrips ?? 0) > 0

  // Problem 22 — Sections 31/32: feedback + continuous-improvement summary,
  // computed entirely from the journeys already loaded above (no new API).
  // A journey has feedback only once it has a rating: the server returns `userFeedback: { issues: [] }` for journeys that
  // never got any (the same quirk History handles), so a plain truthiness check counted every journey as rated.
  const hasFeedback = (j: JourneyRecord) => j.userFeedback?.rating != null
  const feedbackJourneys = journeys.filter(hasFeedback)
  const avgRating =
    feedbackJourneys.length > 0
      ? Math.round((feedbackJourneys.reduce((sum, j) => sum + (j.userFeedback?.rating ?? 0), 0) / feedbackJourneys.length) * 10) / 10
      : null
  // Problem 21 — a journey only contributes a JourneyObservation once the user
  // has supplied an actual travel duration alongside their feedback.
  const observationsContributed = journeys.filter((j) => j.userFeedback?.actualDurationMinutes !== undefined).length

  const apiLabel = apiStatus === "checking" ? "Connecting..." : apiStatus === "online" ? "Online" : "Demo Mode"

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header: the greeting over a real photograph, with the one question every trip starts with. */}
      <section aria-labelledby="dashboard-heading" className="animate-fade-slide-up relative overflow-hidden rounded-sheet bg-navy-900 shadow-card">
        <Photo id="streets-of-bangalore" decorative priority sizes="(min-width: 1280px) 80rem, 100vw" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/70 to-navy-950/30" />
        <div className="relative flex flex-col gap-6 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{getGreeting()},</p>
              <h1 id="dashboard-heading" className="mt-0.5 font-display text-3xl font-bold text-white sm:text-4xl">
                {user?.name?.split(" ")[0] ?? "Commuter"}
              </h1>
              <p className="mt-2 max-w-md text-sm text-white">Travel Smarter, Safer, and More Reliably with TransitSwap Intelligence.</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-card">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${apiStatus === "online" ? "animate-pulse bg-go-500" : apiStatus === "offline" ? "bg-danger" : "animate-pulse bg-amber-500"}`}
              />
              <span className="text-xs font-semibold text-navy-800">API {apiLabel}</span>
            </div>
          </div>

          {/* The search bar: the trip itself is planned on the Plan Trip map, so the whole bar opens it. */}
          <Link
            to="/plan"
            aria-label="Plan Journey: choose where to go"
            className="group flex flex-col gap-3 rounded-panel bg-white p-3 shadow-float sm:flex-row sm:items-center sm:gap-4 sm:p-2 sm:pl-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-navy-700">
                <span aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand-500 ring-4 ring-brand-100" />
                <span className="truncate"><span className="font-semibold text-navy-900">From</span> Current Location</span>
              </span>
              <span aria-hidden="true" className="hidden h-6 w-px bg-navy-200 sm:block" />
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-navy-700">
                <MapPin className="h-4 w-4 flex-shrink-0 text-go-700" aria-hidden="true" />
                <span className="truncate"><span className="font-semibold text-navy-900">To</span> Where to? Enter a destination in Plan Trip</span>
              </span>
            </div>
            <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-go-600 px-5 text-sm font-semibold text-white transition-colors group-hover:bg-go-700">
              <Search className="h-4 w-4" aria-hidden="true" />
              Explore Routes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      {/* Problem 16 — Quick Actions */}
      <nav aria-label="Quick actions" className="animate-fade-slide-up grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex min-h-14 items-center gap-3 rounded-panel border border-navy-100 bg-white px-4 py-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-700">{a.icon}</span>
            <span className="text-sm font-semibold text-navy-900">{a.label}</span>
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="animate-fade-slide-up space-y-6 lg:col-span-2">
          {/* Recent Journeys */}
          <Card padding="none">
            <div className="px-5 pt-5">
              <CardHeading title="Recent Journeys" to="/history" />
            </div>
            <div className="px-2 pb-2">
              {journeysLoading && (
                <div className="px-3 pb-4"><ListSkeleton label="Loading your journeys..." /></div>
              )}
              {!journeysLoading && journeysError && (
                <p className="px-3 pb-4 text-sm text-danger" role="alert">{journeysError}</p>
              )}
              {!journeysLoading && !journeysError && recentJourneys.length === 0 && (
                <div className="px-3 pb-6 text-center">
                  <p className="text-sm text-navy-600">No journeys saved yet.</p>
                  <Link to="/plan" className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:underline">
                    Plan your first trip →
                  </Link>
                </div>
              )}
              {!journeysLoading && !journeysError && recentJourneys.length > 0 && (
                <ul>
                  {recentJourneys.map((j) => (
                    <li key={j._id}>
                      <Link to="/history" className="flex items-start gap-3 rounded-panel px-3 py-3 transition-colors hover:bg-navy-50">
                        <div className="min-w-0 flex-1">
                          <RouteEnds origin={j.origin.name} destination={j.destination.name} />
                          <p className="mt-0.5 text-xs text-navy-600">
                            {formatDate(j.createdAt)} · {formatTime(j.createdAt)}
                          </p>
                          <ModeChips modes={j.transportModes} className="mt-2" />
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-display text-base font-bold tabular-nums text-navy-900">₹{j.estimatedFare}</p>
                          <p className="text-xs tabular-nums text-navy-600">{Math.round(j.totalDurationSeconds / 60)} min</p>
                          {hasFeedback(j) ? (
                            <Badge variant="success" size="sm" className="mt-1">
                              <Star className="h-3 w-3 fill-current" aria-hidden="true" /> {j.userFeedback?.rating}/5
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm" className="mt-1">Awaiting feedback</Badge>
                          )}
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-navy-400" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* TransitDNA Intelligence Profile Card */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardHeading title="Personalized TransitDNA (ML Engine)" icon={<Dna className="h-5 w-5 text-brand-700" aria-hidden="true" />} />
              <Badge variant="info">Pairwise Logistic Regression Active</Badge>
            </div>
            <p className="-mt-2 mb-4 text-sm text-navy-600">
              Learns your preference weights via Pairwise Logistic Regression from your route choices & feedback ratings.
            </p>
            {!hasLearnedWeights && (
              <p className="mb-4 rounded-control bg-amber-50 px-3 py-2 text-sm text-amber-900">
                TransitDNA is using your initial preference profile — it hasn't learned from any route choices yet.
              </p>
            )}

            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <WeightBar label="Speed" value={weights.time} barClass="bg-brand-500" />
              <WeightBar label="Cost" value={weights.cost} barClass="bg-go-600" />
              <WeightBar label="Walking" value={weights.walking} barClass="bg-bus-600" />
              <WeightBar label="Reliability" value={weights.reliability} barClass="bg-navy-700" />
              <WeightBar label="Access" value={weights.accessibility} barClass="bg-auto-500" />
            </div>
          </Card>

          {/* Problem 16 — Travel Statistics (derived from actual journey history) */}
          <Card>
            <CardHeading title="Travel Statistics" hint="Calculated from your saved journey history" />
            {journeysLoading ? (
              <ListSkeleton label="Loading statistics..." />
            ) : totalTrips === 0 ? (
              <p className="py-4 text-center text-sm text-navy-600">
                No journeys yet. <Link to="/plan" className="font-semibold text-brand-700 hover:underline">Plan your first journey.</Link>
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TRAVEL_STATS.map((s) => (
                    <div key={s.label} className="rounded-panel bg-navy-50 p-3">
                      <p className="font-display text-xl font-bold tabular-nums text-navy-900">{s.value}</p>
                      <p className="mt-0.5 text-xs font-medium text-navy-600">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Problem 22 — Sections 31/32: feedback + continuous-improvement
                    summary, derived from existing journey data only. */}
                <p className="mt-3 text-sm text-navy-600">
                  {feedbackJourneys.length > 0
                    ? `${feedbackJourneys.length} feedback submitted${avgRating !== null ? ` · avg rating ${avgRating}/5` : ""}.`
                    : "No feedback yet."}
                  {observationsContributed > 0 &&
                    ` ${observationsContributed} of your journeys have contributed actual-duration observations to reliability estimates.`}
                </p>
              </>
            )}
          </Card>

          {/* Quick Destinations — demo hubs, distinct from the user's personal Saved Destinations */}
          <Card>
            <CardHeading title="Demo / Quick Transit Hubs" hint="Sample transit hubs for route evaluation — not your saved destinations" />
            <ul className="-mx-2 space-y-1">
              {QUICK_DESTINATIONS.map((d) => (
                <li key={d.label}>
                  <Link
                    to="/plan"
                    state={{ useRouteDestination: { name: d.label, address: d.address, latitude: d.latitude, longitude: d.longitude } }}
                    className="group flex min-h-14 items-center gap-3 rounded-panel px-2 py-2 transition-colors hover:bg-navy-50"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-700">
                      <ModeIcon mode={d.mode} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-navy-900">{d.label}</span>
                      <span className="block truncate text-xs text-navy-600">{d.address}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-navy-400 transition-colors group-hover:text-brand-600" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="animate-fade-slide-up space-y-6">
          {/* Monthly Stats */}
          <Card>
            <CardHeading title="This Month" />
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 lg:grid-cols-1">
              {STATS.map((s) => (
                <StatTile key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} className="shadow-none" />
              ))}
            </div>
          </Card>

          {/* Profile Summary */}
          <Card>
            <CardHeading title="Mobility Profile" />
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-navy-700">Accessibility</dt>
                <dd>
                  <Badge variant="info">
                    <ProfileIcon id={user?.accessibilityProfile ?? "standard"} className="h-3.5 w-3.5" />
                    {PROFILE_BADGE[user?.accessibilityProfile ?? ""] ?? "Standard"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-navy-700">TransitDNA</dt>
                <dd>
                  <Badge variant={hasLearnedWeights ? "success" : "outline"} dot={hasLearnedWeights}>
                    {hasLearnedWeights ? `Learning (${user?.transitDNA?.totalTrips} Trips)` : "Not learned yet"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-navy-700">Preferred Mode</dt>
                <dd>
                  <Badge>
                    <ModeIcon mode={MODE_BADGE[user?.preferences?.preferredMode ?? ""] ? user!.preferences!.preferredMode : "any"} className="h-3.5 w-3.5" />
                    {MODE_BADGE[user?.preferences?.preferredMode ?? ""] ?? "Any"}
                  </Badge>
                </dd>
              </div>
              {/* Problem 22 — Section 11: Walking Tolerance (was missing from the dashboard). */}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-navy-700">Walking Tolerance</dt>
                <dd>
                  <Badge variant="outline">
                    {user?.preferences?.walkingTolerance === "low" ? "Low (<300 m)" :
                     user?.preferences?.walkingTolerance === "high" ? "High (>800 m)" :
                     user?.preferences?.walkingTolerance === "medium" ? "Medium (300–800 m)" : "Not set"}
                  </Badge>
                </dd>
              </div>
              {/* Problem 22 — Section 12: Budget preference (was missing from the dashboard). */}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-navy-700">Budget</dt>
                <dd>
                  <Badge variant="outline">
                    {user?.preferences?.budgetPreference === "cheapest" ? "Cheapest" :
                     user?.preferences?.budgetPreference === "comfort" ? "Comfort-first" :
                     user?.preferences?.budgetPreference === "balanced" ? "Balanced" : "Not set"}
                  </Badge>
                </dd>
              </div>
              {/* Problem 22 — Section 13: Priority (was missing from the dashboard). */}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-navy-700">Priority</dt>
                <dd>
                  <Badge variant="outline">
                    {PRIORITY_BADGE[user?.preferences?.prioritize ?? ""] ? (
                      <>
                        <ProfileIcon id={user!.preferences!.prioritize!} className="h-3.5 w-3.5" />
                        {PRIORITY_BADGE[user!.preferences!.prioritize!]}
                      </>
                    ) : "Not set"}
                  </Badge>
                </dd>
              </div>
            </dl>
            <Link to="/profile" className="mt-4 block rounded-control text-center text-sm font-semibold text-brand-700 hover:underline">
              Edit preferences & profile →
            </Link>
          </Card>

          {/* Problem 16 — Saved Destinations */}
          <Card>
            <CardHeading title="Saved Destinations" icon={<Bookmark className="h-4 w-4 text-navy-500" aria-hidden="true" />} />
            {destinationsLoading && <ListSkeleton label="Loading..." />}
            {!destinationsLoading && destinationsError && (
              <p className="text-sm text-danger" role="alert">{destinationsError}</p>
            )}
            {!destinationsLoading && !destinationsError && destinations.length === 0 && (
              <p className="text-sm text-navy-600">No saved destinations yet.</p>
            )}
            {!destinationsLoading && !destinationsError && destinations.length > 0 && (
              <ul className="-mx-2 space-y-1">
                {destinations.slice(0, 4).map((d) => (
                  <li key={d._id}>
                    <Link
                      to="/plan"
                      state={{ useRouteDestination: { name: d.name, address: d.address, latitude: d.latitude, longitude: d.longitude } }}
                      className="flex min-h-12 items-center justify-between gap-2 rounded-control px-2 py-1.5 transition-colors hover:bg-navy-50"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <MapPin className="h-4 w-4 flex-shrink-0 text-brand-600" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-navy-900">{d.name}</span>
                          <span className="block truncate text-xs text-navy-600">{d.address}</span>
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-navy-400" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Problem 16 — Saved Routes summary */}
          <Card>
            <CardHeading title="Saved Routes" to="/saved-routes" />
            {savedRoutesLoading && <ListSkeleton label="Loading..." />}
            {!savedRoutesLoading && savedRoutesError && (
              <p className="text-sm text-danger" role="alert">{savedRoutesError}</p>
            )}
            {!savedRoutesLoading && !savedRoutesError && savedRoutes.length === 0 && (
              <p className="text-sm text-navy-600">No saved routes yet.</p>
            )}
            {!savedRoutesLoading && !savedRoutesError && savedRoutes.length > 0 && (
              <>
                <p className="mb-2 text-sm text-navy-700">
                  <span className="font-bold text-navy-900">{savedRoutes.length}</span> route{savedRoutes.length === 1 ? "" : "s"} saved
                </p>
                <ul className="-mx-2 space-y-1">
                  {savedRoutes.slice(0, 3).map((r) => (
                    <li key={r._id}>
                      <Link to="/saved-routes" className="flex min-h-11 items-center justify-between gap-2 rounded-control px-2 py-1.5 transition-colors hover:bg-navy-50">
                        <span className="truncate text-sm font-semibold text-navy-900">{r.name}</span>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-navy-400" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {/* Problem 16 — Sustainability summary (existing relative score only) */}
          <Card>
            <CardHeading title="Sustainability" icon={<Leaf className="h-4 w-4 text-go-700" aria-hidden="true" />} />
            {avgSustainabilityScore !== null ? (
              <div className="flex items-center gap-4">
                <RadialGauge value={avgSustainabilityScore} fillColor="#087a41" label="/ 100" />
                <p className="text-sm text-navy-600">
                  Average relative sustainability score across your saved journeys — higher favors walking and public transport over road-based private transport.
                </p>
              </div>
            ) : (
              <p className="text-sm text-navy-600">
                No relative sustainability data yet. It will appear once you save journeys with route details.
              </p>
            )}
          </Card>

          {/* Smart Tip */}
          <Card className="border-brand-100 bg-brand-50">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-control bg-brand-600 text-white">
                <Zap className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-brand-900">Smart Mobility Tip</p>
                <p className="mt-1 text-sm leading-relaxed text-brand-900">
                  During rain, TransitSwap automatically penalizes long walking distances and prioritizes metro connections with short transfer buffers.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

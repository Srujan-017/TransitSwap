import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  MapPin, Navigation, TrendingUp, Zap, ArrowRight,
  Bus, Footprints, FlaskConical, Dna, BarChart3, CheckCircle2, ShieldCheck,
  Star, Bookmark, Leaf, User as UserIcon, History as HistoryIcon,
} from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import {
  tripService,
  type JourneyRecord,
  type SavedDestinationRecord,
  type SavedRouteRecord,
} from "../services/tripService"
import { intelligenceService, type EvaluationMetrics } from "../services/intelligenceService"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"

const QUICK_DESTINATIONS = [
  { label: "Andheri Metro Station", address: "Andheri West, Mumbai", icon: "🚇" },
  { label: "Ghatkopar Station", address: "Ghatkopar East, Mumbai", icon: "🏢" },
  { label: "Bandra Bus Depot", address: "Bandra West, Mumbai", icon: "🚌" },
]

export default function DashboardPage() {
  const { user } = useAuthContext()
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")
  const [journeys, setJourneys] = useState<JourneyRecord[]>([])
  const [journeysLoading, setJourneysLoading] = useState(true)
  const [journeysError, setJourneysError] = useState("")
  const [evaluation, setEvaluation] = useState<EvaluationMetrics | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)

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

  // Load Research Evaluation metrics for viva demo
  useEffect(() => {
    async function loadEval() {
      setEvalLoading(true)
      try {
        const data = await intelligenceService.getEvaluationMetrics()
        setEvaluation(data)
      } catch {
        // Fallback for offline demo mode
      } finally {
        setEvalLoading(false)
      }
    }
    loadEval()
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

  const STATS = [
    { label: "Trips Completed", value: String(completedThisMonth.length), icon: <Bus className="w-5 h-5" />, color: "text-brand-600 bg-brand-50" },
    { label: "Est. Fare Spent", value: `\u20b9${totalFareThisMonth}`, icon: <TrendingUp className="w-5 h-5" />, color: "text-amber-600 bg-amber-50" },
    { label: "Walking Distance", value: `${(totalWalkingThisMonth / 1000).toFixed(1)} km`, icon: <Footprints className="w-5 h-5" />, color: "text-purple-600 bg-purple-50" },
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
    { label: "Total Est. Fare", value: `\u20b9${totalFareAll}` },
    { label: "Avg Est. Fare", value: totalTrips > 0 ? `\u20b9${avgFare}` : "—" },
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
  const feedbackJourneys = journeys.filter((j) => j.userFeedback)
  const avgRating =
    feedbackJourneys.length > 0
      ? Math.round((feedbackJourneys.reduce((sum, j) => sum + (j.userFeedback?.rating ?? 0), 0) / feedbackJourneys.length) * 10) / 10
      : null
  // Problem 21 — a journey only contributes a JourneyObservation once the user
  // has supplied an actual travel duration alongside their feedback.
  const observationsContributed = journeys.filter((j) => j.userFeedback?.actualDurationMinutes !== undefined).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-navy-500 text-sm font-medium">{getGreeting()},</p>
          <h1 className="font-display text-2xl font-bold text-navy-900 mt-0.5">
            {user?.name?.split(" ")[0] ?? "Commuter"} 👋
          </h1>
          <p className="text-navy-500 text-sm mt-1">Travel Smarter, Safer, and More Reliably with TransitSwap Intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-navy-200 rounded-xl px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${
              apiStatus === "online" ? "bg-emerald-500 animate-pulse" :
              apiStatus === "offline" ? "bg-rose-500" : "bg-amber-400 animate-pulse"
            }`} />
            <span className="text-xs font-medium text-navy-600">
              API {apiStatus === "checking" ? "Connecting..." : apiStatus === "online" ? "Online" : "Demo Mode"}
            </span>
          </div>
          <Link to="/plan">
            <Button icon={<Navigation className="w-4 h-4" />}>Plan Journey</Button>
          </Link>
        </div>
      </div>

      {/* Problem 16 — Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/plan">
          <Card hover padding="sm" className="flex items-center gap-2.5">
            <Navigation className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-navy-800">Plan Journey</span>
          </Card>
        </Link>
        <Link to="/history">
          <Card hover padding="sm" className="flex items-center gap-2.5">
            <HistoryIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-navy-800">View History</span>
          </Card>
        </Link>
        <Link to="/saved-routes">
          <Card hover padding="sm" className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-navy-800">Saved Routes</span>
          </Card>
        </Link>
        <Link to="/profile">
          <Card hover padding="sm" className="flex items-center gap-2.5">
            <UserIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-navy-800">Profile</span>
          </Card>
        </Link>
      </div>

      {/* Quick Search Card */}
      <Card className="bg-gradient-to-r from-navy-900 via-navy-800 to-brand-950 border-navy-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white/30 ring-2 ring-brand-500/50" />
            <input
              type="text"
              readOnly
              value="Origin: Current Location"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none"
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              readOnly
              value="Destination: Enter target location in Plan Trip"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white/70 text-sm focus:outline-none"
            />
          </div>
          <Link to="/plan">
            <Button className="w-full sm:w-auto whitespace-nowrap" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              Explore Routes
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* TransitDNA Intelligence Profile Card */}
          <Card className="border-brand-200 bg-gradient-to-br from-white via-brand-50/20 to-sky-50/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dna className="w-5 h-5 text-brand-600" />
                <h2 className="font-display font-bold text-navy-900">Personalized TransitDNA (ML Engine)</h2>
              </div>
              <Badge variant="brand">Pairwise Logistic Regression Active</Badge>
            </div>
            <p className="text-xs text-navy-500 mb-4">
              Learns your preference weights via Pairwise Logistic Regression from your route choices & feedback ratings.
            </p>
            {!hasLearnedWeights && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                TransitDNA is using your initial preference profile — it hasn't learned from any route choices yet.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-navy-100 shadow-2xs">
                <p className="text-[11px] font-semibold text-navy-500 uppercase">Speed</p>
                <p className="text-base font-bold text-brand-700">{Math.round(weights.time * 100)}%</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-navy-100 shadow-2xs">
                <p className="text-[11px] font-semibold text-navy-500 uppercase">Cost</p>
                <p className="text-base font-bold text-emerald-700">{Math.round(weights.cost * 100)}%</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-navy-100 shadow-2xs">
                <p className="text-[11px] font-semibold text-navy-500 uppercase">Walking</p>
                <p className="text-base font-bold text-purple-700">{Math.round(weights.walking * 100)}%</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-navy-100 shadow-2xs">
                <p className="text-[11px] font-semibold text-navy-500 uppercase">Reliability</p>
                <p className="text-base font-bold text-sky-700">{Math.round(weights.reliability * 100)}%</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-navy-100 shadow-2xs">
                <p className="text-[11px] font-semibold text-navy-500 uppercase">Access</p>
                <p className="text-base font-bold text-amber-700">{Math.round(weights.accessibility * 100)}%</p>
              </div>
            </div>
          </Card>

          {/* Research Evaluation Metrics Card (Phase 16 - Viva Paper Support) */}
          {evaluation && (
            <Card className="border-navy-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-display font-bold text-navy-900">Research Paper Benchmark Metrics (Phase 16)</h2>
                </div>
                <Badge variant="info">Simulated Benchmark</Badge>
              </div>
              <p className="text-xs text-navy-500 mb-4">
                Comparison of TransitSwap Multi-Criteria Engine vs Shortest-Time and Lowest-Cost Baselines across evaluated scenarios.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                  <p className="text-[11px] font-medium text-navy-500">Shortest-Time Agreement</p>
                  <p className="text-lg font-bold text-navy-900">{evaluation.agreementRateWithShortestTimePercent}%</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[11px] font-medium text-emerald-800">TransitSwap Reliability</p>
                  <p className="text-lg font-bold text-emerald-900">{evaluation.transitSwapAverageReliability}/100</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[11px] font-medium text-amber-800">Shortest-Time Reliability</p>
                  <p className="text-lg font-bold text-amber-900">{evaluation.baselineShortestTimeAverageReliability}/100</p>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                  <p className="text-[11px] font-medium text-sky-800">CI 90% Empirical Coverage</p>
                  <p className="text-xs font-bold text-sky-900 mt-1">
                    {evaluation.confidenceIntervalCoveragePercent !== null
                      ? `${evaluation.confidenceIntervalCoveragePercent}%`
                      : "Not empirically validated — simulated prototype"}
                  </p>
                </div>
              </div>

              {evaluation.benchmarkDisclaimer && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <strong>Disclaimer:</strong> {evaluation.benchmarkDisclaimer}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-navy-700">
                  <thead className="bg-navy-50 text-navy-500 uppercase font-semibold">
                    <tr>
                      <th className="p-2 rounded-l-lg">Origin → Destination</th>
                      <th className="p-2">TransitSwap Selected</th>
                      <th className="p-2">Shortest Baseline</th>
                      <th className="p-2 rounded-r-lg">Reliability Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {evaluation.scenarios.map((s, idx) => (
                      <tr key={idx} className="hover:bg-navy-50/50">
                        <td className="p-2 font-medium">{s.originName} → {s.destinationName}</td>
                        <td className="p-2"><Badge variant="brand">{s.transitSwapChosenLabel}</Badge></td>
                        <td className="p-2"><Badge variant="outline">{s.shortestTimeChosenLabel}</Badge></td>
                        <td className="p-2 font-bold text-emerald-600">
                          +{(s.reliabilityDifferenceVsShortestPercent ?? s.reliabilityImprovementPercent ?? 0)}% Score
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Quick Destinations — demo hubs, distinct from the user's personal Saved Destinations below */}
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-1">Demo / Quick Transit Hubs</h2>
            <p className="text-xs text-navy-400 mb-4">Sample transit hubs for route evaluation — not your saved destinations</p>
            <div className="space-y-2">
              {QUICK_DESTINATIONS.map((d) => (
                <Link
                  key={d.label}
                  to="/plan"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-navy-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center text-lg flex-shrink-0">
                    {d.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{d.label}</p>
                    <p className="text-xs text-navy-500 truncate">{d.address}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-navy-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </Card>

          {/* Recent Journeys */}
          <Card padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
              <h2 className="font-display font-semibold text-navy-900">Recent Journeys</h2>
              <Link to="/history" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-navy-50">
              {journeysLoading && (
                <p className="px-5 py-6 text-sm text-navy-400 text-center">Loading your journeys...</p>
              )}
              {!journeysLoading && journeysError && (
                <p className="px-5 py-6 text-sm text-danger text-center">{journeysError}</p>
              )}
              {!journeysLoading && !journeysError && recentJourneys.length === 0 && (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-navy-500">No journeys saved yet.</p>
                  <Link to="/plan" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Plan your first trip →
                  </Link>
                </div>
              )}
              {!journeysLoading && !journeysError && recentJourneys.map((j) => (
                <div key={j._id} className="flex items-start gap-4 px-5 py-4 hover:bg-navy-50/50 transition-colors">
                  <div className="flex -space-x-1 flex-shrink-0 mt-0.5">
                    {j.transportModes.map((m, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-[10px] font-semibold uppercase text-navy-600 border-2 border-white">
                        {m.slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-navy-900 truncate">{j.origin.name}</p>
                      <ArrowRight className="w-3 h-3 text-navy-400 flex-shrink-0" />
                      <p className="text-sm font-semibold text-navy-900 truncate">{j.destination.name}</p>
                    </div>
                    <p className="text-xs text-navy-500 mt-0.5">
                      {new Date(j.createdAt).toLocaleDateString()} · {new Date(j.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-navy-900">₹{j.estimatedFare}</p>
                    <p className="text-xs text-navy-500">{Math.round(j.totalDurationSeconds / 60)} min</p>
                    {j.userFeedback ? (
                      <Badge variant="success" size="sm" className="mt-1 inline-flex items-center gap-1">
                        <Star className="w-3 h-3" /> {j.userFeedback.rating}/5
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm" className="mt-1">Awaiting feedback</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Problem 16 — Travel Statistics (derived from actual journey history) */}
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-1">Travel Statistics</h2>
            <p className="text-xs text-navy-400 mb-4">Calculated from your saved journey history</p>
            {journeysLoading ? (
              <p className="text-sm text-navy-400 text-center py-4">Loading statistics...</p>
            ) : totalTrips === 0 ? (
              <p className="text-sm text-navy-500 text-center py-4">
                No journeys yet. <Link to="/plan" className="text-brand-600 font-semibold">Plan your first journey.</Link>
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TRAVEL_STATS.map((s) => (
                    <div key={s.label} className="bg-navy-50 rounded-xl p-3 border border-navy-100">
                      <p className="text-lg font-bold text-navy-900">{s.value}</p>
                      <p className="text-[11px] text-navy-500 mt-0.5 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Problem 22 — Sections 31/32: feedback + continuous-improvement
                    summary, derived from existing journey data only. */}
                <p className="text-xs text-navy-400 mt-3">
                  {feedbackJourneys.length > 0
                    ? `${feedbackJourneys.length} feedback submitted${avgRating !== null ? ` · avg rating ${avgRating}/5` : ""}.`
                    : "No feedback yet."}
                  {observationsContributed > 0 &&
                    ` ${observationsContributed} of your journeys have contributed actual-duration observations to reliability estimates.`}
                </p>
              </>
            )}
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Monthly Stats */}
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-4">This Month</h2>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className={`rounded-xl p-3 ${s.color.split(" ")[1]}`}>
                  <div className={s.color.split(" ")[0]}>{s.icon}</div>
                  <p className={`font-display font-bold text-xl mt-2 ${s.color.split(" ")[0]}`}>{s.value}</p>
                  <p className="text-xs text-navy-500 mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Profile Summary */}
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-4">Mobility Profile</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-600">Accessibility</span>
                <Badge variant="info">
                  {user?.accessibilityProfile === "wheelchair" ? "♿ Wheelchair" :
                   user?.accessibilityProfile === "senior" ? "🧓 Senior" :
                   user?.accessibilityProfile === "pregnant" ? "🤰 Pregnant" :
                   user?.accessibilityProfile === "stroller" ? "👶 Stroller" :
                   user?.accessibilityProfile === "luggage" ? "🧳 Heavy Luggage" :
                   user?.accessibilityProfile === "reduced_mobility" ? "🦯 Reduced Mobility" : "🚶 Standard"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-600">TransitDNA</span>
                <Badge variant={hasLearnedWeights ? "success" : "outline"} dot={hasLearnedWeights}>
                  {hasLearnedWeights ? `Learning (${user?.transitDNA?.totalTrips} Trips)` : "Not learned yet"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-600">Preferred Mode</span>
                <Badge>
                  {user?.preferences?.preferredMode === "metro" ? "🚇 Metro" :
                   user?.preferences?.preferredMode === "bus" ? "🚌 Bus" :
                   user?.preferences?.preferredMode === "walking" ? "🚶 Walking" :
                   user?.preferences?.preferredMode === "auto" ? "🛺 Auto" : "🔀 Any"}
                </Badge>
              </div>
              {/* Problem 22 — Section 11: Walking Tolerance (was missing from the dashboard). */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-600">Walking Tolerance</span>
                <Badge variant="outline">
                  {user?.preferences?.walkingTolerance === "low" ? "Low (<300 m)" :
                   user?.preferences?.walkingTolerance === "high" ? "High (>800 m)" :
                   user?.preferences?.walkingTolerance === "medium" ? "Medium (300–800 m)" : "Not set"}
                </Badge>
              </div>
              {/* Problem 22 — Section 12: Budget preference (was missing from the dashboard). */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-600">Budget</span>
                <Badge variant="outline">
                  {user?.preferences?.budgetPreference === "cheapest" ? "Cheapest" :
                   user?.preferences?.budgetPreference === "comfort" ? "Comfort-first" :
                   user?.preferences?.budgetPreference === "balanced" ? "Balanced" : "Not set"}
                </Badge>
              </div>
              {/* Problem 22 — Section 13: Priority (was missing from the dashboard). */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-600">Priority</span>
                <Badge variant="outline">
                  {user?.preferences?.prioritize === "speed" ? "⚡ Speed" :
                   user?.preferences?.prioritize === "comfort" ? "🛋️ Comfort" :
                   user?.preferences?.prioritize === "accessibility" ? "♿ Accessibility" :
                   user?.preferences?.prioritize === "reliability" ? "🎯 Reliability" : "Not set"}
                </Badge>
              </div>
              <Link to="/profile" className="block">
                <button className="w-full text-center text-xs font-semibold text-brand-600 hover:text-brand-700 mt-2 transition-colors">
                  Edit preferences & profile →
                </button>
              </Link>
            </div>
          </Card>

          {/* Problem 16 — Saved Destinations */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-navy-900">Saved Destinations</h2>
              <Bookmark className="w-4 h-4 text-navy-400" />
            </div>
            {destinationsLoading && <p className="text-sm text-navy-400 text-center py-2">Loading...</p>}
            {!destinationsLoading && destinationsError && (
              <p className="text-sm text-danger text-center py-2">{destinationsError}</p>
            )}
            {!destinationsLoading && !destinationsError && destinations.length === 0 && (
              <p className="text-sm text-navy-500 text-center py-2">No saved destinations yet.</p>
            )}
            {!destinationsLoading && !destinationsError && destinations.length > 0 && (
              <div className="space-y-2">
                {destinations.slice(0, 4).map((d) => (
                  <Link
                    key={d._id}
                    to="/plan"
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-navy-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{d.name}</p>
                      <p className="text-xs text-navy-500 truncate">{d.address}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-navy-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Problem 16 — Saved Routes summary */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-navy-900">Saved Routes</h2>
              <Link to="/saved-routes" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            {savedRoutesLoading && <p className="text-sm text-navy-400 text-center py-2">Loading...</p>}
            {!savedRoutesLoading && savedRoutesError && (
              <p className="text-sm text-danger text-center py-2">{savedRoutesError}</p>
            )}
            {!savedRoutesLoading && !savedRoutesError && savedRoutes.length === 0 && (
              <p className="text-sm text-navy-500 text-center py-2">No saved routes yet.</p>
            )}
            {!savedRoutesLoading && !savedRoutesError && savedRoutes.length > 0 && (
              <>
                <p className="text-sm text-navy-600 mb-2">
                  <span className="font-bold text-navy-900">{savedRoutes.length}</span> route{savedRoutes.length === 1 ? "" : "s"} saved
                </p>
                <div className="space-y-2">
                  {savedRoutes.slice(0, 3).map((r) => (
                    <Link
                      key={r._id}
                      to="/saved-routes"
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-navy-50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-navy-900 truncate">{r.name}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-navy-300 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Problem 16 — Sustainability summary (existing relative score only) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <h2 className="font-display font-semibold text-navy-900">Sustainability</h2>
            </div>
            {avgSustainabilityScore !== null ? (
              <>
                <p className="text-2xl font-bold text-emerald-700">{avgSustainabilityScore}/100</p>
                <p className="text-xs text-navy-500 mt-1">
                  Average relative sustainability score across your saved journeys — higher favors walking and public transport over road-based private transport.
                </p>
              </>
            ) : (
              <p className="text-sm text-navy-500">
                No relative sustainability data yet. It will appear once you save journeys with route details.
              </p>
            )}
          </Card>

          {/* Smart Tip */}
          <Card className="bg-brand-50 border-brand-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-900 font-display">Smart Mobility Tip</p>
                <p className="text-xs text-brand-700 mt-1 leading-relaxed">
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

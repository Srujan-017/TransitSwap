import { useState, useEffect, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import {
  MapPin, Navigation, TrendingUp, Zap, ArrowRight,
  Bus, Footprints, Dna, BarChart3, Star, Bookmark, Leaf, 
  User as UserIcon, History as HistoryIcon, CloudRain, Wind, 
  Train, ChevronRight
} from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import {
  tripService,
  type JourneyRecord,
  type SavedDestinationRecord,
  type SavedRouteRecord,
} from "../services/tripService"
import { intelligenceService, type EvaluationMetrics } from "../services/intelligenceService"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"

const QUICK_DESTINATIONS = [
  { label: "MG Road Metro Station", address: "MG Road, Bengaluru", icon: "🚇" },
  { label: "Majestic Metro Station", address: "Kempegowda Bus Station, Bengaluru", icon: "🏢" },
  { label: "Shivajinagar Bus Stand", address: "Shivajinagar, Bengaluru", icon: "🚌" },
]

export default function DashboardPage() {
  const { user } = useAuthContext()
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking")
  const [journeys, setJourneys] = useState<JourneyRecord[]>([])
  const [journeysLoading, setJourneysLoading] = useState(true)
  const [journeysError, setJourneysError] = useState("")
  const [evaluation, setEvaluation] = useState<EvaluationMetrics | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [evalError, setEvalError] = useState("")

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
    return () => { cancelled = true }
  }, [])

  async function loadEvaluationMetrics() {
    setEvalLoading(true)
    setEvalError("")
    try {
      const data = await intelligenceService.getEvaluationMetrics()
      setEvaluation(data)
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : "Could not load research evaluation metrics.")
    } finally {
      setEvalLoading(false)
    }
  }

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
    return () => { cancelled = true }
  }, [])

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
    return () => { cancelled = true }
  }, [])

  const recentJourneys = journeys.slice(0, 3)
  const now = new Date()
  const journeyDate = (j: JourneyRecord) => new Date(j.departureTime || j.createdAt)
  const journeysThisMonth = journeys.filter((j) => {
    const d = journeyDate(j)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const completedJourneys = journeys.filter((j) => j.status === "completed")
  const completedThisMonth = journeysThisMonth.filter((j) => j.status === "completed")
  const totalFareThisMonth = journeysThisMonth.reduce((sum, j) => sum + (j.estimatedFare ?? 0), 0)
  const totalWalkingThisMonth = journeysThisMonth.reduce((sum, j) => sum + (j.walkingDistanceMeters ?? 0), 0)

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
  
  const hasLearnedWeights = (user?.transitDNA?.totalTrips ?? 0) > 0
  const feedbackJourneys = journeys.filter((j) => j.userFeedback)
  const avgRating =
    feedbackJourneys.length > 0
      ? Math.round((feedbackJourneys.reduce((sum, j) => sum + (j.userFeedback?.rating ?? 0), 0) / feedbackJourneys.length) * 10) / 10
      : null
  const observationsContributed = journeys.filter((j) => j.userFeedback?.actualDurationMinutes !== undefined).length

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
  const firstName = user?.name?.split(" ")[0] || "Commuter"

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-slide-up">
      {/* Header */}
      <div className="flex flex-col mb-8">
        <p className="text-sm text-gray-500 font-medium mb-1">{getGreeting()},</p>
        <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 flex items-center gap-2">
            {firstName} <span className="text-2xl sm:text-3xl wave-animation">👋</span>
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${apiStatus === "online" ? "bg-green-500 animate-pulse" : apiStatus === "offline" ? "bg-red-500" : "bg-amber-400 animate-pulse"}`} />
                <span className="text-xs font-semibold text-gray-600">API {apiStatus === "checking" ? "Connecting..." : apiStatus === "online" ? "Online" : "Demo Mode"}</span>
            </div>
        </div>
        <p className="text-gray-500 text-sm mt-1.5 font-medium">Travel Smarter, Safer, and More Reliably with TransitSwap Intelligence.</p>
      </div>

      {/* Action Pills */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Link to="/plan" className="flex items-center gap-2 px-6 py-2.5 bg-white rounded-full shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-sm font-bold text-gray-700 hover:text-blue-600 hover:border-blue-200 border border-gray-100 transition-all">
          <Navigation className="w-4 h-4 text-blue-500" /> Plan Journey
        </Link>
        <Link to="/history" className="flex items-center gap-2 px-6 py-2.5 bg-white rounded-full shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-sm font-bold text-gray-700 hover:text-blue-600 hover:border-blue-200 border border-gray-100 transition-all">
          <HistoryIcon className="w-4 h-4 text-blue-500" /> View History
        </Link>
        <Link to="/saved-routes" className="flex items-center gap-2 px-6 py-2.5 bg-white rounded-full shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-sm font-bold text-gray-700 hover:text-blue-600 hover:border-blue-200 border border-gray-100 transition-all">
          <Bookmark className="w-4 h-4 text-blue-500" /> Saved Routes
        </Link>
        <Link to="/profile" className="flex items-center gap-2 px-6 py-2.5 bg-white rounded-full shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-sm font-bold text-gray-700 hover:text-blue-600 hover:border-blue-200 border border-gray-100 transition-all">
          <UserIcon className="w-4 h-4 text-blue-500" /> Profile
        </Link>
      </div>

      {/* Gradient Search Bar */}
      <div className="w-full bg-gradient-to-r from-[#1b263b] to-[#8ca4c2] rounded-[2rem] p-2.5 flex flex-col md:flex-row items-center justify-between shadow-lg mb-8 gap-3 md:gap-0">
        <div className="flex-1 flex items-center gap-3 px-5 border-b md:border-b-0 md:border-r border-white/20 text-white w-full py-2 md:py-0">
          <MapPin className="w-5 h-5 text-white/60 flex-shrink-0" />
          <span className="text-sm font-medium text-white/90 truncate">1. Origin: Current Location</span>
        </div>
        <div className="flex-1 flex items-center gap-3 px-5 text-white w-full py-2 md:py-0">
          <MapPin className="w-5 h-5 text-white/60 flex-shrink-0" />
          <span className="text-sm font-medium text-white/90 truncate">2. Destination: Enter target location in Plan Trip</span>
        </div>
        <Link to="/plan" className="w-full md:w-auto bg-[#3b82f6] hover:bg-[#2563eb] text-white px-8 py-3.5 md:py-3 rounded-[1.5rem] text-sm font-bold shadow-md transition-colors whitespace-nowrap text-center">
          Explore Routes
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        
        {/* Left Column (Span 2) */}
        <div className="xl:col-span-2 space-y-6 xl:space-y-8">
          
          {/* TransitDNA Intelligence Profile Card (Original Logic, New UI) */}
          <div className="bg-gradient-to-br from-white via-[#f8fafc] to-[#f0f9ff] rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-blue-50">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-2">
                <Dna className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-extrabold text-gray-900">Personalized TransitDNA</h2>
              </div>
              <Badge variant="brand">Pairwise Logistic Regression Active</Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-6">
              Learns your preference weights via Pairwise Logistic Regression from your route choices & feedback ratings.
            </p>
            {!hasLearnedWeights && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-4 py-3 mb-6 border border-amber-100 font-medium">
                TransitDNA is using your initial preference profile — it hasn't learned from any route choices yet.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Speed</p>
                <p className="text-xl font-black text-blue-700">{Math.round(weights.time * 100)}%</p>
              </div>
              <div className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cost</p>
                <p className="text-xl font-black text-emerald-700">{Math.round(weights.cost * 100)}%</p>
              </div>
              <div className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Walking</p>
                <p className="text-xl font-black text-purple-700">{Math.round(weights.walking * 100)}%</p>
              </div>
              <div className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reliability</p>
                <p className="text-xl font-black text-sky-700">{Math.round(weights.reliability * 100)}%</p>
              </div>
              <div className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Access</p>
                <p className="text-xl font-black text-amber-700">{Math.round(weights.accessibility * 100)}%</p>
              </div>
            </div>
          </div>

          {/* Research Evaluation Metrics Card (Phase 16 - Viva Paper Support) */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl font-extrabold text-gray-900">Research Benchmark Metrics (Phase 16)</h2>
              </div>
              <Badge variant="info">Simulated Benchmark</Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-6">
              Comparison of TransitSwap Multi-Criteria Engine vs Shortest-Time and Lowest-Cost Baselines across evaluated scenarios.
            </p>

            {!evaluation && (
              <div className="text-center py-6 bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-200">
                {evalError && <p className="text-sm text-red-500 mb-3">{evalError}</p>}
                <Button variant="outline" onClick={loadEvaluationMetrics} loading={evalLoading}>
                  Load Research Metrics
                </Button>
                <p className="text-xs text-gray-400 mt-3 max-w-md mx-auto">
                  Runs the 22-scenario benchmark on demand — not automatically, since it's computationally heavy.
                </p>
              </div>
            )}

            {evaluation && (
              <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-[1.25rem]">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Shortest-Time Agreement</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{evaluation.agreementRateWithShortestTimePercent}%</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-[1.25rem]">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">TransitSwap Reliability</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{evaluation.transitSwapAverageReliability}/100</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-[1.25rem]">
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Shortest-Time Reliability</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">{evaluation.baselineShortestTimeAverageReliability}/100</p>
                </div>
                <div className="p-4 bg-sky-50 rounded-[1.25rem]">
                  <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">CI 90% Empirical Coverage</p>
                  <p className="text-sm font-black text-sky-900 mt-1 leading-tight">
                    {evaluation.confidenceIntervalCoveragePercent !== null
                      ? `${evaluation.confidenceIntervalCoveragePercent}%`
                      : "Simulated prototype"}
                  </p>
                </div>
              </div>

              {evaluation.benchmarkDisclaimer && (
                <div className="mb-6 p-4 bg-amber-50 rounded-[1.25rem] text-xs text-amber-800 font-medium">
                  <strong>Disclaimer:</strong> {evaluation.benchmarkDisclaimer}
                </div>
              )}

              <div className="overflow-x-auto rounded-[1.25rem] border border-gray-100">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Origin → Destination</th>
                      <th className="p-4">TransitSwap Selected</th>
                      <th className="p-4">Shortest Baseline</th>
                      <th className="p-4">Reliability Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {evaluation.scenarios.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{s.originName} → {s.destinationName}</td>
                        <td className="p-4"><Badge variant="brand">{s.transitSwapChosenLabel}</Badge></td>
                        <td className="p-4"><Badge variant="outline">{s.shortestTimeChosenLabel}</Badge></td>
                        <td className="p-4 font-black text-emerald-600">
                          +{(s.reliabilityDifferenceVsShortestPercent ?? s.reliabilityImprovementPercent ?? 0)}% Score
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
          
          {/* Overview of Past 30 Days */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-extrabold text-gray-900">Overview of Past 30 Days</h2>
              </div>
              <div className="bg-blue-50/80 text-blue-600 px-4 py-2 rounded-full text-xs font-bold tracking-wide border border-blue-100/50">
                {completedThisMonth.length} Trips Completed
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
              <div className="text-center md:border-r border-gray-100 last:border-0 pb-4 md:pb-0 border-b md:border-b-0">
                <p className="text-4xl font-black text-gray-900">{completedThisMonth.length}</p>
                <p className="text-[11px] text-gray-500 mt-2 uppercase font-bold tracking-wider">Trips</p>
              </div>
              <div className="text-center md:border-r border-gray-100 last:border-0 pb-4 md:pb-0 border-b md:border-b-0">
                <p className="text-4xl font-black text-gray-900">{totalWalkingThisMonth > 0 ? (totalWalkingThisMonth / 1000).toFixed(1) : 0}</p>
                <p className="text-[11px] text-gray-500 mt-2 uppercase font-bold tracking-wider">Walk (km)</p>
              </div>
              <div className="text-center md:border-r border-gray-100 last:border-0">
                <p className="text-4xl font-black text-gray-900">{totalFareThisMonth}</p>
                <p className="text-[11px] text-gray-500 mt-2 uppercase font-bold tracking-wider">Fare (₹)</p>
              </div>
              <div className="text-center last:border-0">
                <p className="text-4xl font-black text-gray-900">{avgSustainabilityScore ?? "—"}</p>
                <p className="text-[11px] text-gray-500 mt-2 uppercase font-bold tracking-wider">Sus. Score</p>
              </div>
            </div>
          </div>

          {/* Detailed Travel Statistics (Original Project Logic) */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Lifetime Travel Statistics</h2>
            <p className="text-sm text-gray-500 font-medium mb-6">Calculated strictly from your saved journey history</p>
            {journeysLoading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading statistics...</p>
            ) : totalTrips === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                No journeys yet. <Link to="/plan" className="text-blue-600 font-bold">Plan your first journey.</Link>
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {TRAVEL_STATS.map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-[1.25rem] p-4">
                      <p className="text-xl font-black text-gray-900">{s.value}</p>
                      <p className="text-[11px] text-gray-500 mt-1 font-bold uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-[#eff6ff] rounded-[1.25rem] border border-blue-100">
                  <p className="text-sm font-medium text-blue-900">
                    {feedbackJourneys.length > 0
                      ? `${feedbackJourneys.length} feedback submitted${avgRating !== null ? ` · avg rating ${avgRating}/5` : ""}.`
                      : "No feedback yet."}
                    {observationsContributed > 0 &&
                      ` ${observationsContributed} of your journeys have contributed actual-duration observations to reliability estimates.`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Quick Destinations / Demo Hubs */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Demo / Quick Transit Hubs</h2>
            <p className="text-sm text-gray-500 font-medium mb-6">Sample transit hubs for route evaluation — not your saved destinations</p>
            <div className="space-y-3">
              {QUICK_DESTINATIONS.map((d) => (
                <Link
                  key={d.label}
                  to="/plan"
                  className="flex items-center gap-4 p-4 rounded-[1.5rem] hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-[1rem] bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                    {d.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate">{d.label}</p>
                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{d.address}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent History List */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-gray-900">Recent History</h2>
                <Link to="/history" className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</Link>
            </div>
            <div className="space-y-4">
               {journeysLoading && <p className="text-sm text-gray-400 text-center py-4">Loading history...</p>}
               {!journeysLoading && journeysError && <p className="text-sm text-red-500 text-center py-4">{journeysError}</p>}
               {!journeysLoading && !journeysError && recentJourneys.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-[1.5rem] border border-gray-100 border-dashed">
                  <HistoryIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No trip history yet.</p>
                </div>
               )}
               {!journeysLoading && !journeysError && recentJourneys.map((j) => {
                 const date = new Date(j.createdAt);
                 return (
                  <div key={j._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[1.5rem] border border-gray-100 hover:border-gray-200 transition-colors gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                       <div className="w-12 text-center flex-shrink-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</p>
                          <p className="text-xl font-black text-gray-800">{date.getDate()}</p>
                       </div>
                       <div className="w-px h-10 bg-gray-100 hidden sm:block"></div>
                       <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate max-w-full">{j.origin.name} - {j.destination.name}</p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{j.origin.name} → {j.destination.name}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 px-2 sm:px-0">
                       <div className="text-left sm:text-right">
                          <p className="font-black text-gray-900">{Math.round(j.totalDurationSeconds / 60)}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Min</p>
                       </div>
                       <div className="text-right">
                          <p className="font-black text-gray-900">₹{j.estimatedFare}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">INR</p>
                       </div>
                    </div>
                  </div>
                 )
               })}
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6 xl:space-y-8">
          
          {/* Weather & Location Box */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-wide">{today}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50/70 rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center">
                <CloudRain className="w-8 h-8 text-blue-500 mb-2 drop-shadow-sm" />
                <p className="text-2xl font-black text-gray-900">76°F</p>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">Bengaluru</p>
              </div>
              <div className="bg-purple-50/70 rounded-[1.25rem] p-4 flex flex-col items-center justify-center text-center">
                <Wind className="w-8 h-8 text-purple-500 mb-2 drop-shadow-sm" />
                <p className="text-2xl font-black text-gray-900">42 <span className="text-base font-bold text-gray-600">AQI</span></p>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">Good Quality</p>
              </div>
            </div>
          </div>

          {/* Original Mobility Profile Panel */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 mb-5">Mobility Profile</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">Accessibility</span>
                <Badge variant="info">
                  {user?.accessibilityProfile === "wheelchair" ? "♿ Wheelchair" :
                   user?.accessibilityProfile === "senior" ? "🧓 Senior" :
                   user?.accessibilityProfile === "pregnant" ? "🤰 Pregnant" :
                   user?.accessibilityProfile === "stroller" ? "👶 Stroller" :
                   user?.accessibilityProfile === "luggage" ? "🧳 Heavy Luggage" :
                   user?.accessibilityProfile === "reduced_mobility" ? "🦯 Reduced Mobility" : "🚶 Standard"}
                </Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">TransitDNA</span>
                <Badge variant={hasLearnedWeights ? "success" : "outline"} dot={hasLearnedWeights}>
                  {hasLearnedWeights ? `Learning (${user?.transitDNA?.totalTrips} Trips)` : "Not learned yet"}
                </Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">Preferred Mode</span>
                <Badge>
                  {user?.preferences?.preferredMode === "metro" ? "🚇 Metro" :
                   user?.preferences?.preferredMode === "bus" ? "🚌 Bus" :
                   user?.preferences?.preferredMode === "walking" ? "🚶 Walking" :
                   user?.preferences?.preferredMode === "auto" ? "🛺 Auto" : "🔀 Any"}
                </Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">Walking Tolerance</span>
                <Badge variant="outline">
                  {user?.preferences?.walkingTolerance === "low" ? "Low (<300 m)" :
                   user?.preferences?.walkingTolerance === "high" ? "High (>800 m)" :
                   user?.preferences?.walkingTolerance === "medium" ? "Medium (300–800 m)" : "Not set"}
                </Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <span className="text-sm font-bold text-gray-600">Budget</span>
                <Badge variant="outline">
                  {user?.preferences?.budgetPreference === "cheapest" ? "Cheapest" :
                   user?.preferences?.budgetPreference === "comfort" ? "Comfort-first" :
                   user?.preferences?.budgetPreference === "balanced" ? "Balanced" : "Not set"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600">Priority</span>
                <Badge variant="outline">
                  {user?.preferences?.prioritize === "speed" ? "⚡ Speed" :
                   user?.preferences?.prioritize === "comfort" ? "🛋️ Comfort" :
                   user?.preferences?.prioritize === "accessibility" ? "♿ Accessibility" :
                   user?.preferences?.prioritize === "reliability" ? "🎯 Reliability" : "Not set"}
                </Badge>
              </div>
              <Link to="/profile" className="block mt-4">
                <button className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  Edit preferences & profile →
                </button>
              </Link>
            </div>
          </div>

          {/* Primary Saved Routes */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-extrabold text-gray-900">Saved Routes</h2>
                <Link to="/saved-routes" className="text-sm font-bold text-blue-600 hover:text-blue-700">All</Link>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-5">Your most frequently used routes.</p>
            
            <div className="space-y-3">
              {savedRoutesLoading && <p className="text-sm text-gray-400 text-center py-2">Loading...</p>}
              {!savedRoutesLoading && savedRoutesError && <p className="text-sm text-red-500 text-center py-2">{savedRoutesError}</p>}
              {!savedRoutesLoading && !savedRoutesError && savedRoutes.length === 0 && (
                <div className="text-center py-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                  <p className="text-sm text-gray-500 font-medium">No saved routes found.</p>
                </div>
              )}
              {!savedRoutesLoading && !savedRoutesError && savedRoutes.slice(0, 3).map((route, idx) => (
                <Link key={route._id} to="/saved-routes" className="flex items-center justify-between p-3 rounded-[1.25rem] bg-white hover:bg-gray-50 border border-gray-100 transition-colors group shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-[0.75rem] flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-blue-100 text-blue-600' : idx === 1 ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                       {idx % 2 === 0 ? <Train className="w-5 h-5" /> : <BusIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{route.name}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>

          {/* Saved Destinations */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-extrabold text-gray-900">Saved Destinations</h2>
                <Link to="/plan" className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-full transition-colors">
                   <Plus className="w-5 h-5" />
                </Link>
             </div>
             <p className="text-xs text-gray-500 font-medium mb-5">Your saved quick access points.</p>
             
             <div className="space-y-3">
               {destinationsLoading && <p className="text-sm text-gray-400 text-center py-2">Loading...</p>}
               {!destinationsLoading && destinations.length === 0 && (
                 <p className="text-sm text-gray-500 font-medium text-center py-4 bg-gray-50 rounded-[1.25rem] border border-dashed border-gray-200">No destinations saved.</p>
               )}
               {!destinationsLoading && destinations.slice(0, 4).map((d) => (
                 <Link key={d._id} to="/plan" className="flex items-center justify-between p-3 rounded-[1.25rem] hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors group">
                   <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                         <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-sm font-bold text-gray-900 truncate">{d.name}</p>
                         <p className="text-[11px] font-medium text-gray-500 truncate">{d.address}</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 ml-2" />
                 </Link>
               ))}
             </div>
          </div>

          {/* Live Stats (Sustainability ring) */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Live Stats</h2>
                <Link to="/research" className="text-xs font-bold text-blue-600 hover:text-blue-700">See Details</Link>
             </div>
             
             {avgSustainabilityScore !== null ? (
               <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                     <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-emerald-500" strokeWidth="3" strokeDasharray={`${avgSustainabilityScore}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-lg font-black text-gray-900">{avgSustainabilityScore}%</p>
                     </div>
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-medium text-gray-600 leading-snug">
                       You have an average sustainability score of <br/> <span className="font-bold text-emerald-600 text-base">{avgSustainabilityScore}%</span> <br/> across your saved journeys.
                     </p>
                  </div>
               </div>
             ) : (
                <p className="text-sm text-gray-500">No sustainability data yet. It will appear once you save journeys.</p>
             )}
          </div>

          {/* Smart Tip / Update */}
          <div className="bg-[#f0f7ff] rounded-[2rem] p-6 shadow-sm border border-blue-100">
             <div className="flex gap-4">
                <div className="w-10 h-10 rounded-[1rem] bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
                   <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                   <p className="text-sm font-extrabold text-blue-900 mb-1.5">Smart Mobility Tip</p>
                   <p className="text-[13px] font-medium text-blue-800/80 leading-relaxed">
                     During rain, TransitSwap automatically penalizes long walking distances and prioritizes metro connections with short transfer buffers.
                   </p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}

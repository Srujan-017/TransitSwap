import { useState, useEffect, lazy, Suspense } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ArrowRight, ArrowLeftRight, AlertTriangle, Navigation,
  FlaskConical, Layers, Settings,
} from "lucide-react"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import LocationSearch from "../components/routing/LocationSearch"
import RouteSummary from "../components/routing/RouteSummary"
import RouteInstructions from "../components/routing/RouteInstructions"
import TransportModeSelector from "../components/routing/TransportModeSelector"
import MultimodalResults from "../components/multimodal/MultimodalResults"
import NearbyTransit from "../components/multimodal/NearbyTransit"
import { routingService } from "../services/routingService"
import { multimodalService } from "../services/multimodalService"
import { tripService } from "../services/tripService"
import { useGeolocation } from "../hooks/useGeolocation"
import { useAuthContext } from "../context/AuthContext"
import { buildLocalDepartureDateTime } from "../utils/formatters"
import type { GeoLocation, RouteResult, RouteStatus, TransportMode } from "../types/map"
import type { MultimodalRoute } from "../types/multimodal"

// Lazy-load MapView so Leaflet doesn't bloat the initial bundle
const MapView = lazy(() => import("../components/map/MapView"))

type RoutingMode = "road" | "multimodal"

const PROFILES = [
  { id: "standard",         icon: "🚶", label: "Standard",         description: "Optimizes for normal travel time, fare and schedule balance." },
  { id: "wheelchair",       icon: "♿", label: "Wheelchair",       description: "Prioritizes step-free routes and avoids inaccessible stations." },
  { id: "senior",           icon: "🧓", label: "Senior",           description: "Prioritizes fewer stairs, less walking and fewer transfers." },
  { id: "pregnant",         icon: "🤰", label: "Pregnant",         description: "Prioritizes minimal walking, waiting and transfers." },
  { id: "stroller",         icon: "👶", label: "Stroller",         description: "Prioritizes ramp/lift access and avoids difficult stairs." },
  { id: "luggage",          icon: "🧳", label: "Luggage",          description: "Prioritizes less walking, fewer stairs and simpler transfers." },
  { id: "reduced_mobility", icon: "🦯", label: "Reduced Mobility", description: "Prioritizes lower physical effort, step-free access and fewer stairs." },
  { id: "fastest",          icon: "⚡", label: "Fastest",          description: "Prioritizes minimum travel duration." },
  { id: "cheapest",         icon: "💰", label: "Cheapest",         description: "Prioritizes minimum fare." },
  { id: "comfort",          icon: "🛋️", label: "Comfort",          description: "Prioritizes low crowds and weather protection." },
]

const PREFERRED_MODE_LABELS: Record<string, string> = {
  any: "Any", metro: "Metro", bus: "Bus", auto: "Auto", walking: "Walking",
}
const WALK_TOLERANCE_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High" }
const BUDGET_LABELS: Record<string, string> = { cheapest: "Cheapest", balanced: "Balanced", comfort: "Comfort" }
const PRIORITY_LABELS: Record<string, string> = {
  speed: "Speed", reliability: "Reliability", comfort: "Comfort", accessibility: "Accessibility",
}
const ACCESSIBILITY_LABELS: Record<string, string> = {
  standard: "Standard", wheelchair: "Wheelchair", senior: "Senior", pregnant: "Pregnant",
  stroller: "Stroller", luggage: "Heavy Luggage", reduced_mobility: "Reduced Mobility",
}

export default function PlanTripPage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()

  const [origin, setOrigin]           = useState<GeoLocation | null>(null)
  const [destination, setDestination] = useState<GeoLocation | null>(null)
  const [routingMode, setRoutingMode] = useState<RoutingMode>("multimodal")
  const [transportMode, setTransportMode] = useState<TransportMode>("driving")
  // Problem 23 — initialize from the user's saved accessibility profile instead
  // of always defaulting to "standard".
  const [profile, setProfile]         = useState(user?.accessibilityProfile || "standard")
  const [date, setDate]               = useState("")
  const [time, setTime]               = useState("")

  // Problem 23 — reflects the user's saved travel preferences (display + used
  // for route requests). Safe defaults when the user has no saved preferences.
  const [preferredMode]     = useState(user?.preferences?.preferredMode || "any")
  const [walkingTolerance]  = useState(user?.preferences?.walkingTolerance || "medium")
  const [budgetPreference]  = useState(user?.preferences?.budgetPreference || "balanced")
  const [prioritize]        = useState(user?.preferences?.prioritize || "reliability")

  // Road routing state
  const [routes, setRoutes]               = useState<RouteResult[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [routeStatus, setRouteStatus]     = useState<RouteStatus>("idle")
  const [routeError, setRouteError]       = useState("")

  // Multimodal routing state
  const [multimodalRoutes, setMultimodalRoutes]           = useState<MultimodalRoute[]>([])
  const [selectedMultimodalIndex, setSelectedMultimodalIndex] = useState(0)
  const [multimodalStatus, setMultimodalStatus]           = useState<RouteStatus>("idle")
  const [multimodalError, setMultimodalError]             = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveMessage, setSaveMessage] = useState("")
  const [destinationSaveName, setDestinationSaveName] = useState("")
  // Problem 10 — Save Route (reusable snapshot), distinct from Save Journey above.
  const [saveRouteStatus, setSaveRouteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveRouteMessage, setSaveRouteMessage] = useState("")

  const { location: geoLocation, isLoading: geoLoading, error: geoError, requestLocation } = useGeolocation()
  const routerLocation = useLocation()

  // Problem 10 — "Use Route" from Saved Routes navigates here with origin/destination
  // in router state; prefill the search form. Live routing is still recalculated via
  // the normal search flow rather than assuming the saved route data is still live.
  useEffect(() => {
    const state = routerLocation.state as { useRouteOrigin?: GeoLocation; useRouteDestination?: GeoLocation } | null
    if (state?.useRouteOrigin && state?.useRouteDestination) {
      setOrigin(state.useRouteOrigin)
      setDestination(state.useRouteDestination)
      setRoutingMode("multimodal")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (geoLocation) {
      setOrigin(geoLocation)
      clearResults()
    }
  }, [geoLocation])

  function clearResults() {
    setRoutes([])
    setSelectedRouteIndex(0)
    setRouteStatus("idle")
    setRouteError("")
    setMultimodalRoutes([])
    setSelectedMultimodalIndex(0)
    setMultimodalStatus("idle")
    setMultimodalError("")
    setSaveStatus("idle")
    setSaveMessage("")
    setSaveRouteStatus("idle")
    setSaveRouteMessage("")
  }

  const handleSwap = () => {
    setOrigin(destination)
    setDestination(origin)
    clearResults()
  }

  const handleModeChange = (mode: TransportMode) => {
    setTransportMode(mode)
    setRoutes([])
    setSelectedRouteIndex(0)
    if (routeStatus === "success") setRouteStatus("idle")
  }

  const validate = (): string => {
    if (!origin) return "Please select an origin location."
    if (!destination) return "Please select a destination."
    if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
      return "Origin and destination cannot be the same location."
    }
    return ""
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) {
      if (routingMode === "road") setRouteError(err)
      else setMultimodalError(err)
      return
    }

    if (routingMode === "road") {
      setRouteStatus("loading")
      setRouteError("")
      setRoutes([])
      setSelectedRouteIndex(0)
      try {
        const result = await routingService.getRoute(origin!, destination!, transportMode)
        setRoutes(result)
        setRouteStatus("success")
      } catch (err: unknown) {
        setRouteStatus("error")
        setRouteError(err instanceof Error ? err.message : "Route calculation failed. Please try again.")
      }
    } else {
      setMultimodalStatus("loading")
      setMultimodalError("")
      setMultimodalRoutes([])
      setSelectedMultimodalIndex(0)
      try {
        // Problem 13 — combine date + time into one local datetime; undefined
        // (not "now") when the user hasn't picked a time yet.
        const departureTime = buildLocalDepartureDateTime(date, time)
        const result = await multimodalService.getRoutes(origin!, destination!, profile, departureTime)
        setMultimodalRoutes(result)
        setMultimodalStatus("success")
      } catch (err: unknown) {
        setMultimodalStatus("error")
        setMultimodalError(
          err instanceof Error ? err.message : "Multimodal route calculation failed. Please try again.",
        )
      }
    }
  }

  const handleSaveJourney = async (route: MultimodalRoute) => {
    if (!origin || !destination) return
    setSaveStatus("saving")
    setSaveMessage("")
    try {
      // Problem 21 — thread through the real departure date/time the user
      // picked (if any) so later feedback can honestly compute a reliability
      // observation. Recomputed from the same date/time state used for search.
      const departureTime = buildLocalDepartureDateTime(date, time)
      await tripService.saveJourney(origin, destination, route, multimodalRoutes, departureTime)
      setSaveStatus("saved")
      setSaveMessage("Journey saved to your history.")
    } catch (err) {
      setSaveStatus("error")
      setSaveMessage(err instanceof Error ? err.message : "Could not save journey.")
    }
  }

  const handleSaveRoute = async (route: MultimodalRoute) => {
    if (!origin || !destination) return
    setSaveRouteStatus("saving")
    setSaveRouteMessage("")
    try {
      const name = `${origin.name.split(",")[0]} → ${destination.name.split(",")[0]}`
      await tripService.saveRoute({
        name,
        origin,
        destination,
        selectedRoute: route,
        accessibilityProfile: profile,
      })
      setSaveRouteStatus("saved")
      setSaveRouteMessage("Route saved. View it under Saved Routes.")
    } catch (err) {
      setSaveRouteStatus("error")
      setSaveRouteMessage(err instanceof Error ? err.message : "Could not save route.")
    }
  }

  const handleSaveDestination = async () => {
    if (!destination) {
      setSaveStatus("error")
      setSaveMessage("Select a destination before saving it.")
      return
    }
    const name = destinationSaveName.trim() || destination.name.split(",")[0]
    setSaveStatus("saving")
    setSaveMessage("")
    try {
      await tripService.saveDestination({
        name,
        address: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      })
      setSaveStatus("saved")
      setSaveMessage(`Saved destination "${name}".`)
      setDestinationSaveName("")
    } catch (err) {
      setSaveStatus("error")
      setSaveMessage(err instanceof Error ? err.message : "Could not save destination.")
    }
  }

  const handleLoadDemoRoadRoute = () => {
    const demoRoutes = routingService.getDemoRoutes(transportMode)
    setRoutes(demoRoutes)
    setSelectedRouteIndex(0)
    setRouteStatus("success")
    setRouteError("")
  }

  const isLoading = routingMode === "road" ? routeStatus === "loading" : multimodalStatus === "loading"
  const selectedRoadRoute       = routes[selectedRouteIndex] ?? null
  const selectedMultimodalRoute = multimodalRoutes[selectedMultimodalIndex] ?? null
  const activeError             = routingMode === "road" ? routeError : multimodalError

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900">Plan Your Journey</h1>
        <p className="text-navy-500 text-sm mt-1">
          Search locations and discover multimodal or road routes for your journey.
        </p>
      </div>

      {/* Routing mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => { setRoutingMode("multimodal"); clearResults() }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            routingMode === "multimodal"
              ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
              : "border-navy-200 text-navy-600 hover:border-navy-300"
          }`}
        >
          <Layers className="w-4 h-4" />
          Multimodal <span className="text-xs opacity-70 font-normal">Metro · Bus · Auto</span>
        </button>
        <button
          type="button"
          onClick={() => { setRoutingMode("road"); clearResults() }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            routingMode === "road"
              ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
              : "border-navy-200 text-navy-600 hover:border-navy-300"
          }`}
        >
          🗺️ Road Routing <span className="text-xs opacity-70 font-normal">Drive · Walk · Cycle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left panel: search form ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <form onSubmit={handleSearch} className="space-y-5">
              {/* Transport mode (road only) */}
              {routingMode === "road" && (
                <TransportModeSelector value={transportMode} onChange={handleModeChange} />
              )}

              {/* Multimodal label */}
              {routingMode === "multimodal" && (
                <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2.5">
                  <Layers className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <p className="text-xs text-brand-700 font-medium">
                    Multimodal: combines Walk, Metro, Bus and Auto for the best journey.
                  </p>
                </div>
              )}

              {/* Origin */}
              <LocationSearch
                label="Origin"
                placeholder="Search start location…"
                value={origin}
                onSelect={setOrigin}
                onClear={() => { setOrigin(null); clearResults() }}
                iconColor="#0ea5e9"
                showLocateButton
                onLocate={requestLocation}
                locating={geoLoading}
              />

              {/* Swap button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!origin && !destination}
                  title="Swap origin and destination"
                  className="p-2 rounded-xl border border-navy-200 bg-navy-50 text-navy-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* Destination */}
              <LocationSearch
                label="Destination"
                placeholder="Search destination…"
                value={destination}
                onSelect={setDestination}
                onClear={() => { setDestination(null); clearResults() }}
                iconColor="#ef4444"
              />

              {/* Date / Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-navy-200 bg-navy-50 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-navy-200 bg-navy-50 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Accessibility profile */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
                  Accessibility Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PROFILES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProfile(p.id)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all ${
                        profile === p.id
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50"
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
                {PROFILES.find((p) => p.id === profile)?.description && (
                  <p className="text-xs text-navy-600 bg-navy-50 border border-navy-150 rounded-xl px-3 py-2">
                    💡 <span className="font-medium">{PROFILES.find((p) => p.id === profile)?.description}</span>
                  </p>
                )}
              </div>

              {/* Problem 23 — Active Preferences (display-only; edited on Profile) */}
              <div className="bg-navy-50 border border-navy-150 rounded-xl px-3.5 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
                    Your Active Travel Preferences
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <Settings className="w-3 h-3" /> Edit Preferences
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-navy-600">
                  <div><span className="text-navy-400">Accessibility:</span> <span className="font-medium text-navy-800">{ACCESSIBILITY_LABELS[profile] ?? profile}</span></div>
                  <div><span className="text-navy-400">Preferred mode:</span> <span className="font-medium text-navy-800">{PREFERRED_MODE_LABELS[preferredMode] ?? preferredMode}</span></div>
                  <div><span className="text-navy-400">Walking:</span> <span className="font-medium text-navy-800">{WALK_TOLERANCE_LABELS[walkingTolerance] ?? walkingTolerance}</span></div>
                  <div><span className="text-navy-400">Budget:</span> <span className="font-medium text-navy-800">{BUDGET_LABELS[budgetPreference] ?? budgetPreference}</span></div>
                  <div><span className="text-navy-400">Priority:</span> <span className="font-medium text-navy-800">{PRIORITY_LABELS[prioritize] ?? prioritize}</span></div>
                </div>
              </div>

              {/* Validation / geo errors */}
              {(activeError || geoError) && !isLoading &&
                multimodalStatus !== "error" && routeStatus !== "error" && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{activeError || geoError}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={isLoading}
                fullWidth
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                disabled={isLoading}
              >
                {isLoading
                  ? routingMode === "multimodal" ? "Finding best routes…" : "Calculating route…"
                  : routingMode === "multimodal" ? "Find Routes" : "Get Directions"}
              </Button>

              <div className="border-t border-navy-100 pt-4 space-y-2">
                <label className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
                  Save Destination
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={destinationSaveName}
                    onChange={(event) => setDestinationSaveName(event.target.value)}
                    placeholder="Home, College, Office"
                    className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-navy-200 bg-navy-50 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleSaveDestination()}>
                    Save
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          <p className="text-xs text-navy-400 text-center">
            {routingMode === "multimodal"
              ? "Demo multimodal transit data, enriched with weather, accessibility and crowd context · Real transit feeds in a future phase"
              : "Road routing via OpenStreetMap/OSRM · Switch to Multimodal for weather, accessibility and crowd-aware transit routes"}
          </p>
        </div>

        {/* ── Right panel: map + results ───────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Map */}
          <div
            className="relative rounded-2xl overflow-hidden border border-navy-200 shadow-sm"
            style={{ height: "420px" }}
          >
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-navy-50">
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-navy-500">Loading map…</p>
                  </div>
                </div>
              }
            >
              <MapView
                origin={origin}
                destination={destination}
                route={routingMode === "road" ? selectedRoadRoute : null}
                multimodalRoute={routingMode === "multimodal" ? selectedMultimodalRoute : null}
              />
            </Suspense>

            {/* Map badge */}
            <div className="absolute top-3 right-3 z-10">
              {selectedMultimodalRoute ? (
                <Badge variant="warning" dot>Demo Transit</Badge>
              ) : selectedRoadRoute?.isDemoData ? (
                <Badge variant="warning" dot>Demo Route</Badge>
              ) : (
                <Badge
                  variant={routeStatus === "success" || multimodalStatus === "success" ? "success" : "info"}
                  dot
                >
                  {routeStatus === "success" || multimodalStatus === "success" ? "Route Found" : "OpenStreetMap"}
                </Badge>
              )}
            </div>

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20 rounded-2xl">
                <div className="bg-white rounded-2xl border border-navy-200 shadow-lg px-6 py-5 text-center space-y-3 max-w-xs">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-display font-semibold text-navy-800 text-sm">
                    {routingMode === "multimodal"
                      ? "Finding the best available routes…"
                      : "Calculating route…"}
                  </p>
                  <div className="space-y-1.5 text-left">
                    {(routingMode === "multimodal"
                      ? ["Locating nearby metro stations…", "Checking bus connections…", "Calculating transit segments…"]
                      : ["Validating coordinates…", "Querying routing service…", "Processing route data…"]
                    ).map((msg, i) => (
                      <div key={msg} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                        <span className="text-xs text-navy-500">{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Problem 11 — Nearby Transit (uses origin coordinates already entered) */}
          <NearbyTransit origin={origin} />

          {/* Empty state */}
          {routingMode === "multimodal" && multimodalStatus === "idle" && !origin && !destination && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-navy-50 border border-navy-200 flex items-center justify-center mb-3">
                <Layers className="w-6 h-6 text-navy-300" />
              </div>
              <p className="font-display font-semibold text-navy-700 text-sm">
                Discover multimodal routes
              </p>
              <p className="text-xs text-navy-400 mt-1">
                Combines Metro, Bus, Auto and Walking for your journey
              </p>
            </div>
          )}
          {routingMode === "road" && routeStatus === "idle" && !origin && !destination && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-navy-50 border border-navy-200 flex items-center justify-center mb-3">
                <Navigation className="w-6 h-6 text-navy-300" />
              </div>
              <p className="font-display font-semibold text-navy-700 text-sm">
                Search for locations to begin
              </p>
              <p className="text-xs text-navy-400 mt-1">
                Enter an origin and destination, then click Get Directions
              </p>
            </div>
          )}

          {/* Road route results */}
          {routingMode === "road" && routeStatus === "success" && routes.length > 0 && origin && destination && (
            <>
              <RouteSummary
                routes={routes}
                selectedIndex={selectedRouteIndex}
                onSelectRoute={setSelectedRouteIndex}
                origin={origin}
                destination={destination}
              />
              <RouteInstructions route={routes[selectedRouteIndex]} />
            </>
          )}

          {/* Multimodal results */}
          {routingMode === "multimodal" && multimodalStatus === "success" && multimodalRoutes.length > 0 && origin && destination && (
            <MultimodalResults
              routes={multimodalRoutes}
              selectedIndex={selectedMultimodalIndex}
              onSelectRoute={setSelectedMultimodalIndex}
              origin={origin}
              destination={destination}
              onSaveJourney={handleSaveJourney}
              saveStatus={saveStatus}
              saveMessage={saveMessage}
              onSaveRoute={handleSaveRoute}
              saveRouteStatus={saveRouteStatus}
              saveRouteMessage={saveRouteMessage}
            />
          )}

          {/* Road error state */}
          {routingMode === "road" && routeStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-danger text-sm">Route not available</p>
                  <p className="text-sm text-navy-600 mt-0.5">{routeError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadDemoRoadRoute}
                className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 hover:bg-amber-100 transition-colors w-full justify-center"
              >
                <FlaskConical className="w-4 h-4" />
                View prototype demo route instead
              </button>
            </div>
          )}

          {/* Multimodal error state */}
          {routingMode === "multimodal" && multimodalStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-danger text-sm">Multimodal route unavailable</p>
                  <p className="text-sm text-navy-600 mt-0.5">{multimodalError}</p>
                </div>
              </div>
              <p className="text-xs text-navy-500 px-1">
                The selected locations may be outside the demo transit service area (Mumbai Metropolitan area).
                Try the Road Routing mode instead.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

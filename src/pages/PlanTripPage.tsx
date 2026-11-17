import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ArrowRight, ArrowLeftRight, AlertTriangle, Navigation,
  FlaskConical, Layers, Settings, Map as MapIcon,
} from "lucide-react"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import SegmentedControl from "../components/ui/SegmentedControl"
import PlannerSheet, { atLeast, type SheetSnap } from "../components/planner/PlannerSheet"
import ProfilePicker from "../components/planner/ProfilePicker"
import DepartureControl from "../components/planner/DepartureControl"
import DemoTrips from "../components/planner/DemoTrips"
import DemoOptions from "../components/planner/DemoOptions"
import ResultsSkeleton from "../components/planner/ResultsSkeleton"
import LocationSearch from "../components/routing/LocationSearch"
import RouteSummary from "../components/routing/RouteSummary"
import RouteInstructions from "../components/routing/RouteInstructions"
import TransportModeSelector from "../components/routing/TransportModeSelector"
import MultimodalResults from "../components/multimodal/MultimodalResults"
import NearbyTransit from "../components/multimodal/NearbyTransit"
import WhyNoRoute from "../components/multimodal/WhyNoRoute"
import ExcludedRoutes from "../components/multimodal/ExcludedRoutes"
import ActiveNavigationView from "../components/navigation/ActiveNavigationView"
import { routingService } from "../services/routingService"
import { multimodalService } from "../services/multimodalService"
import { tripService } from "../services/tripService"
import { useGeolocation } from "../hooks/useGeolocation"
import { useAuthContext } from "../context/AuthContext"
import { buildLocalDepartureDateTime } from "../utils/formatters"
import type { GeoLocation, RouteResult, RouteStatus, TransportMode } from "../types/map"
import type { ExcludedRoute, MultimodalRoute } from "../types/multimodal"
import { excludedRoutesFromError } from "../utils/excludedRoutes"
import type { AccessibilityProfile } from "../types"
import type { WeatherMode, WeatherReport } from "../types/multimodal"

// Lazy-load MapView so Leaflet doesn't bloat the initial bundle
const MapView = lazy(() => import("../components/map/MapView"))

type RoutingMode = "road" | "multimodal"

// Phase 4 fix — matches the backend's MultimodalRequest.profile shape
// (backend/src/types/multimodal.ts). Without this, PROFILES.id below widened
// to plain `string`, which setProfile(p.id) couldn't accept (tsc TS2345);
// `npm run build` never caught it because `vite build` doesn't type-check.
type RoutingProfile = AccessibilityProfile | "fastest" | "cheapest" | "comfort"

const WEATHER_OPTIONS: Array<{ id: WeatherMode; label: string }> = [
  { id: "live", label: "Live weather" },
  { id: "clear", label: "Clear" },
  { id: "rain", label: "Rain" },
  { id: "heavy_rain", label: "Heavy rain" },
  { id: "heat", label: "Heat" },
]

const PROFILES: Array<{ id: RoutingProfile; label: string; description: string }> = [
  { id: "standard",         label: "Standard",         description: "Optimizes for normal travel time, fare and schedule balance." },
  { id: "wheelchair",       label: "Wheelchair",       description: "Prioritizes step-free routes and avoids inaccessible stations." },
  { id: "senior",           label: "Senior",           description: "Prioritizes fewer stairs, less walking and fewer transfers." },
  { id: "pregnant",         label: "Pregnant",         description: "Prioritizes minimal walking, waiting and transfers." },
  { id: "stroller",         label: "Stroller",         description: "Prioritizes ramp/lift access and avoids difficult stairs." },
  { id: "luggage",          label: "Luggage",          description: "Prioritizes less walking, fewer stairs and simpler transfers." },
  { id: "reduced_mobility", label: "Reduced Mobility", description: "Prioritizes lower physical effort, step-free access and fewer stairs." },
  { id: "fastest",          label: "Fastest",          description: "Prioritizes minimum travel duration." },
  { id: "cheapest",         label: "Cheapest",         description: "Prioritizes minimum fare." },
  { id: "comfort",          label: "Comfort",          description: "Prioritizes low crowds and weather protection." },
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

// Phase 12 — carried over from the landing page's search box (see
// LandingPage.tsx's handleSearch). Read synchronously via a lazy useState
// initializer (runs once, during the component's first render, before
// LocationSearch ever mounts) rather than a useEffect — a useEffect-based
// read happens AFTER the first render, by which point LocationSearch has
// already mounted with an empty `initialQuery` and captured that into its
// own internal state; a later prop change doesn't retroactively seed it.
//
// This is a PURE read with no side effect — React.StrictMode (see main.tsx)
// double-invokes lazy useState initializers in development specifically to
// catch side effects during render. An earlier version of this function
// also called sessionStorage.removeItem() here; the first of the two
// StrictMode invocations removed it, so the second saw it already gone and
// the whole feature silently did nothing. The removal now happens in a
// separate useEffect below, which is where side effects belong.
function readLandingSearch(): { origin?: string; destination?: string; profile?: string } | null {
  try {
    const raw = sessionStorage.getItem("ts_landing_search")
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function PlanTripPage() {
  const { user } = useAuthContext()
  const navigate = useNavigate()

  const [landingSearch] = useState(readLandingSearch)

  const [origin, setOrigin]           = useState<GeoLocation | null>(null)
  const [destination, setDestination] = useState<GeoLocation | null>(null)
  const [routingMode, setRoutingMode] = useState<RoutingMode>("multimodal")
  const [transportMode, setTransportMode] = useState<TransportMode>("driving")
  // Problem 23 — initialize from the user's saved accessibility profile instead
  // of always defaulting to "standard". Phase 12 — a carried-over landing-page
  // profile selection takes priority when present and valid.
  const [profile, setProfile]         = useState<RoutingProfile>(() => {
    if (landingSearch?.profile && PROFILES.some((p) => p.id === landingSearch.profile)) {
      return landingSearch.profile as RoutingProfile
    }
    return user?.accessibilityProfile || "standard"
  })
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
  const [busAlternativeNote, setBusAlternativeNote]       = useState("")
  // Demo weather chosen by the rider ("live" = the real weather/forecast), and what the planner reported.
  const [weatherMode, setWeatherMode]                     = useState<WeatherMode>("live")
  const [weatherReport, setWeatherReport]                 = useState<WeatherReport | undefined>(undefined)
  // Candidate routes ruled out for the selected profile, with typed reasons (B3).
  const [excludedRoutes, setExcludedRoutes]               = useState<ExcludedRoute[]>([])
  const [activeNavRoute, setActiveNavRoute]               = useState<MultimodalRoute | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveMessage, setSaveMessage] = useState("")
  const [destinationSaveName, setDestinationSaveName] = useState("")
  // Problem 10 — Save Route (reusable snapshot), distinct from Save Journey above.
  const [saveRouteStatus, setSaveRouteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveRouteMessage, setSaveRouteMessage] = useState("")

  const { location: geoLocation, isLoading: geoLoading, error: geoError, requestLocation } = useGeolocation()
  const routerLocation = useLocation()

  // The journey panel's height on a phone (a column on a desktop, where this does nothing), and the two scroll targets.
  const [snap, setSnap] = useState<SheetSnap>("half")
  const scrollRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Problem 10 — "Use Route" from Saved Routes navigates here with origin/destination
  // in router state; prefill the search form. Live routing is still recalculated via
  // the normal search flow rather than assuming the saved route data is still live.
  useEffect(() => {
    const state = routerLocation.state as { useRouteOrigin?: GeoLocation; useRouteDestination?: GeoLocation } | null
    if (state?.useRouteOrigin && state?.useRouteDestination) {
      setOrigin(state.useRouteOrigin)
      setDestination(state.useRouteDestination)
      setRoutingMode("multimodal")
    } else if (state?.useRouteDestination) {
      // A place chosen elsewhere (a saved destination or a transit hub on the dashboard): just the destination; the start is
      // the visitor's own location or a search.
      setDestination(state.useRouteDestination)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 12 — the side-effecting half of the landingSearch pickup above:
  // clears the sessionStorage entry so it's only ever consumed once. Safe
  // to no-op on StrictMode's extra dev effect invocation (removeItem on an
  // already-removed key does nothing).
  useEffect(() => {
    if (landingSearch) {
      try {
        sessionStorage.removeItem("ts_landing_search")
      } catch {
        // ignore
      }
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
    setBusAlternativeNote("")
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
      setExcludedRoutes([])
      setSelectedMultimodalIndex(0)
      try {
        // Problem 13 — combine date + time into one local datetime; undefined
        // (not "now") when the user hasn't picked a time yet.
        const departureTime = buildLocalDepartureDateTime(date, time)
        const result = await multimodalService.getRoutes(origin!, destination!, profile, departureTime, weatherMode)
        setMultimodalRoutes(result.routes)
        setWeatherReport(result.weather)
        setBusAlternativeNote(result.busAlternativeNote ?? "")
        setExcludedRoutes(result.excludedRoutes ?? [])
        setMultimodalStatus("success")
      } catch (err: unknown) {
        setMultimodalStatus("error")
        setExcludedRoutes(excludedRoutesFromError(err))
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

  // The rider left the route during live navigation: plan again from where they are, leaving now (or at the
  // simulated time), with the same profile and weather, and carry on with the best new route.
  const handleReroute = useCallback(
    async (from: { latitude: number; longitude: number }, at: Date): Promise<boolean> => {
      if (!destination) return false
      const pad = (n: number) => String(n).padStart(2, "0")
      const departureTime = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}:00`
      try {
        const result = await multimodalService.getRoutes(
          { name: "Your location", address: "Your location", latitude: from.latitude, longitude: from.longitude },
          destination,
          profile,
          departureTime,
          weatherMode,
        )
        const next = result.routes[0]
        if (!next) return false
        setActiveNavRoute(next)
        return true
      } catch {
        return false
      }
    },
    [destination, profile, weatherMode],
  )

  // A search that starts or finishes makes sure the panel is at least half open (it never closes itself), and a finished
  // search scrolls the panel down to its results.
  useEffect(() => {
    if (isLoading || multimodalStatus === "success" || routeStatus === "success") setSnap((s) => atLeast(s, "half"))
  }, [isLoading, multimodalStatus, routeStatus])
  useEffect(() => {
    if (multimodalStatus !== "success" && routeStatus !== "success") return
    // Scroll the panel only. (scrollIntoView would also scroll the whole page, pushing the header off screen.)
    const box = scrollRef.current
    const target = resultsRef.current
    if (!box || !target) return
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const top = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8
    box.scrollTo?.({ top, behavior: reduce ? "auto" : "smooth" })
  }, [multimodalStatus, routeStatus])

  // How much of the bottom of the map the sheet covers on a phone, so a new route is fitted into the part still visible.
  const mapBottomInset = (() => {
    if (typeof window === "undefined" || window.matchMedia?.("(min-width: 1024px)").matches) return 0
    const mapHeight = Math.max(window.innerHeight - 128, 300)
    return snap === "peek" ? 216 : Math.round(mapHeight * (snap === "half" ? 0.58 : 0.94))
  })()

  if (activeNavRoute && origin && destination) {
    return (
      <ActiveNavigationView
        route={activeNavRoute}
        origin={origin}
        destination={destination}
        profile={profile}
        onExit={() => setActiveNavRoute(null)}
        onReroute={handleReroute}
      />
    )
  }

  return (
    <div className="relative h-[calc(100dvh-8rem)] lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(24rem,28rem)_minmax(0,1fr)]">
      {/* ── The journey panel: a column beside the map on a desktop, a sheet over it on a phone ── */}
      <PlannerSheet snap={snap} onSnapChange={setSnap} scrollRef={scrollRef}>
        <div className="space-y-5 px-4 pb-8 pt-1 sm:px-5 lg:pt-5" onFocusCapture={() => setSnap((s) => atLeast(s, "half"))}>
          <header className="space-y-3">
            <h1 className="font-display text-xl font-bold text-navy-900">Plan Your Journey</h1>
            <SegmentedControl
              ariaLabel="Routing mode"
              value={routingMode}
              onChange={(mode) => { setRoutingMode(mode); clearResults() }}
              className="w-full [&>button]:flex-1"
              options={[
                { value: "multimodal", label: "Multimodal", icon: <Layers className="h-4 w-4" aria-hidden="true" /> },
                { value: "road", label: "Road Routing", icon: <MapIcon className="h-4 w-4" aria-hidden="true" /> },
              ]}
            />
            <p className="text-xs text-navy-500">
              {routingMode === "multimodal"
                ? "Metro · Bus · Auto, combined with walking for the best journey."
                : "Drive · Walk · Cycle directions along real roads."}
            </p>
          </header>

          <form onSubmit={handleSearch} className="space-y-5">
            {/* Transport mode (road only) */}
            {routingMode === "road" && (
              <TransportModeSelector value={transportMode} onChange={handleModeChange} />
            )}

            {/* Where from, where to: one card, with the swap button beside it */}
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-panel border border-navy-200 bg-white shadow-card focus-within:border-brand-500">
                <LocationSearch
                  label="Origin"
                  kind="origin"
                  placeholder="Search start location…"
                  value={origin}
                  onSelect={setOrigin}
                  onClear={() => { setOrigin(null); clearResults() }}
                  iconColor="#1f5bd8"
                  showLocateButton
                  onLocate={requestLocation}
                  locating={geoLoading}
                  initialQuery={landingSearch?.origin ?? ""}
                />
                <div className="mx-3 border-t border-navy-100" aria-hidden="true" />
                <LocationSearch
                  label="Destination"
                  kind="destination"
                  placeholder="Search destination…"
                  value={destination}
                  onSelect={setDestination}
                  onClear={() => { setDestination(null); clearResults() }}
                  initialQuery={landingSearch?.destination ?? ""}
                />
              </div>
              <button
                type="button"
                onClick={handleSwap}
                disabled={!origin && !destination}
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-600 shadow-card transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* With nothing chosen yet: one-tap demo trips (they also make a demonstration independent of the place-search service). */}
            {!origin && !destination && (
              <DemoTrips
                onPick={(trip) => {
                  setOrigin(trip.origin)
                  setDestination(trip.destination)
                  clearResults()
                }}
              />
            )}

            <DepartureControl date={date} time={time} onChange={({ date: d, time: t }) => { setDate(d); setTime(t) }} />

            <ProfilePicker profiles={PROFILES} value={profile} onChange={(id) => setProfile(id as RoutingProfile)} />

            {/* The action bar sticks to the bottom of the panel, so Find Routes is always reachable, even in a half-open sheet. */}
            <div className="sticky bottom-0 z-10 -mx-4 space-y-3 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
            {/* Validation / geo errors */}
            {(activeError || geoError) && !isLoading &&
              multimodalStatus !== "error" && routeStatus !== "error" && (
              <div role="alert" className="flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" aria-hidden="true" />
                <p className="text-sm text-red-800">{activeError || geoError}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              size="lg"
              icon={<ArrowRight className="h-4 w-4" />}
              iconPosition="right"
              disabled={isLoading}
            >
              {isLoading
                ? routingMode === "multimodal" ? "Finding best routes…" : "Calculating route…"
                : routingMode === "multimodal" ? "Find Routes" : "Get Directions"}
            </Button>
            </div>

            {/* Demo weather: shows how routes change in rain or heat even on a sunny day */}
            {routingMode === "multimodal" && (
              <DemoOptions options={WEATHER_OPTIONS} value={weatherMode} onChange={setWeatherMode} />
            )}

            {/* Problem 23 — Active Preferences (display-only; edited on Profile) */}
            <div className="space-y-2 rounded-panel bg-navy-50 px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Your Active Travel Preferences</p>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="inline-flex min-h-9 flex-shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  <Settings className="h-3 w-3" aria-hidden="true" /> Edit Preferences
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-navy-600">
                <div><span className="text-navy-500">Accessibility:</span> <span className="font-medium text-navy-800">{ACCESSIBILITY_LABELS[profile] ?? profile}</span></div>
                <div><span className="text-navy-500">Preferred mode:</span> <span className="font-medium text-navy-800">{PREFERRED_MODE_LABELS[preferredMode] ?? preferredMode}</span></div>
                <div><span className="text-navy-500">Walking:</span> <span className="font-medium text-navy-800">{WALK_TOLERANCE_LABELS[walkingTolerance] ?? walkingTolerance}</span></div>
                <div><span className="text-navy-500">Budget:</span> <span className="font-medium text-navy-800">{BUDGET_LABELS[budgetPreference] ?? budgetPreference}</span></div>
                <div><span className="text-navy-500">Priority:</span> <span className="font-medium text-navy-800">{PRIORITY_LABELS[prioritize] ?? prioritize}</span></div>
              </div>
            </div>

            <div className="space-y-2 border-t border-navy-100 pt-4">
              <label htmlFor="save-destination-name" className="text-xs font-semibold uppercase tracking-wider text-navy-500">
                Save Destination
              </label>
              <div className="flex gap-2">
                <input
                  id="save-destination-name"
                  type="text"
                  value={destinationSaveName}
                  onChange={(event) => setDestinationSaveName(event.target.value)}
                  placeholder="Home, College, Office"
                  className="min-h-11 min-w-0 flex-1 rounded-control border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder-navy-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => void handleSaveDestination()}>
                  Save
                </Button>
              </div>
            </div>
          </form>

          {/* Problem 11 — Nearby Transit (uses origin coordinates already entered) */}
          <NearbyTransit origin={origin} />

          {/* ── Results ─────────────────────────────────────────── */}
          <div ref={resultsRef} className="scroll-mt-4 space-y-4">
            {/* While a search runs */}
            {isLoading && <ResultsSkeleton mode={routingMode} />}

            {/* Empty state */}
            {routingMode === "multimodal" && multimodalStatus === "idle" && !origin && !destination && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-panel bg-navy-100">
                  <Layers className="h-6 w-6 text-navy-500" aria-hidden="true" />
                </div>
                <p className="font-display text-sm font-semibold text-navy-700">Discover multimodal routes</p>
                <p className="mt-1 text-xs text-navy-500">Combines Metro, Bus, Auto and Walking for your journey</p>
              </div>
            )}
            {routingMode === "road" && routeStatus === "idle" && !origin && !destination && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-panel bg-navy-100">
                  <Navigation className="h-6 w-6 text-navy-500" aria-hidden="true" />
                </div>
                <p className="font-display text-sm font-semibold text-navy-700">Search for locations to begin</p>
                <p className="mt-1 text-xs text-navy-500">Enter an origin and destination, then click Get Directions</p>
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
                busAlternativeNote={busAlternativeNote}
                weatherReport={weatherReport}
                onStartNavigation={setActiveNavRoute}
                onSaveJourney={handleSaveJourney}
                saveStatus={saveStatus}
                saveMessage={saveMessage}
                onSaveRoute={handleSaveRoute}
                saveRouteStatus={saveRouteStatus}
                saveRouteMessage={saveRouteMessage}
              />
            )}

            {/* Candidate routes that were ruled out for this profile (B3) — collapsed beside the results. */}
            {routingMode === "multimodal" && multimodalStatus === "success" && excludedRoutes.length > 0 && (
              <ExcludedRoutes
                routes={excludedRoutes}
                profileLabel={PROFILES.find((p) => p.id === profile)?.label ?? profile}
                variant="some-left"
              />
            )}

            {/* Road error state */}
            {routingMode === "road" && routeStatus === "error" && (
              <div className="space-y-3 rounded-panel border border-red-200 bg-red-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Route not available</p>
                    <p className="mt-0.5 text-sm text-navy-600">{routeError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDemoRoadRoute}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                >
                  <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  View prototype demo route instead
                </button>
              </div>
            )}

            {/* Multimodal error state */}
            {routingMode === "multimodal" && multimodalStatus === "error" && (
              <div className="space-y-3 rounded-panel border border-red-200 bg-red-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Multimodal route unavailable</p>
                    <p className="mt-0.5 text-sm text-navy-600">{multimodalError}</p>
                  </div>
                </div>
                {/* Phase 12 — "why no route?" (see WhyNoRoute.tsx): a real,
                    data-driven answer instead of a generic "try Road Routing"
                    hint, using the actual nearby-transit lookup for both points. */}
                {excludedRoutes.length > 0 ? (
                  // Routes DID exist but none was usable for this profile — say which and why,
                  // instead of WhyNoRoute's "outside the network" explanation, which would be wrong here.
                  <ExcludedRoutes
                    routes={excludedRoutes}
                    profileLabel={PROFILES.find((p) => p.id === profile)?.label ?? profile}
                    variant="none-left"
                  />
                ) : origin && destination ? (
                  <WhyNoRoute origin={origin} destination={destination} />
                ) : (
                  <p className="px-1 text-xs text-navy-500">
                    The selected locations may be outside the demo transit service area. Try the Road Routing mode instead.
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-navy-500">
            {routingMode === "multimodal"
              ? "Demo multimodal transit data, enriched with weather, accessibility and crowd context · Real transit feeds in a future phase"
              : "Road routing via OpenStreetMap/OSRM · Switch to Multimodal for weather, accessibility and crowd-aware transit routes"}
          </p>
        </div>
      </PlannerSheet>

      {/* ── The map: fills the screen behind the sheet on a phone, the rest of the page beside the panel on a desktop ── */}
      <section aria-label="Map" className="absolute inset-0 isolate z-0 lg:relative lg:inset-auto lg:h-full">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-navy-100">
              <div className="space-y-2 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent motion-reduce:animate-none" />
                <p className="text-sm text-navy-600">Loading map…</p>
              </div>
            </div>
          }
        >
          <MapView
            origin={origin}
            destination={destination}
            route={routingMode === "road" ? selectedRoadRoute : null}
            multimodalRoute={routingMode === "multimodal" ? selectedMultimodalRoute : null}
            otherRoutes={routingMode === "multimodal" ? multimodalRoutes.flatMap((r, index) => (index === selectedMultimodalIndex ? [] : [{ index, route: r }])) : undefined}
            onSelectOtherRoute={setSelectedMultimodalIndex}
            bottomInset={mapBottomInset}
            onSetOrigin={setOrigin}
            onSetDestination={setDestination}
          />
        </Suspense>

        {/* Map badge */}
        <div className="absolute left-3 top-3 z-10">
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
      </section>
    </div>
  )
}

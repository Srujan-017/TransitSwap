import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GEO_ERROR_MESSAGES } from "./useGeolocation"
import {
  buildNavLegs, initialProgress, navigate, offRouteThreshold, skipLeg,
  type Fix, type NavLeg, type NavState, type Progress,
} from "../navigation/engine"
import { promptsFor } from "../navigation/prompts"
import { buildSimulation, displaceFix, type Simulation } from "../navigation/simulator"
import type { LatLng } from "../navigation/geo"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * One navigation session: follows the rider along a route from their GPS (or from the simulated journey),
 * keeps the engine's state up to date, says what is due, and asks for a new route when the rider leaves the
 * one they were given. All the logic is in src/navigation/ (tested without a browser); this hook only feeds
 * it positions and carries out its decisions.
 */

export type PositionSource = "gps" | "simulation"

export const SIM_SPEEDS = [1, 10, 30, 60] as const
const SIM_TICK_MS = 500
const OFF_ROUTE_FIXES = 3
const REROUTE_COOLDOWN_MS = 20_000

export interface NavigationSessionOptions {
  route: MultimodalRoute
  profile?: string
  destinationName: string
  /** Speaks a prompt (no-op when muted or unsupported). */
  speak: (text: string) => void
  /**
   * Asks for a new route from where the rider is now, leaving at `at` (the real time, or the simulated one).
   * Resolves true when the page has switched to a new route (the `route` prop then changes), false when none
   * could be found.
   */
  onReroute?: (from: LatLng, at: Date) => Promise<boolean>
}

const REROUTE_ELIGIBLE = new Set(["walking", "auto"])

function startFixOf(legs: NavLeg[]): Fix {
  const first = legs[0]?.path.points[0] ?? { latitude: 0, longitude: 0 }
  return { latitude: first.latitude, longitude: first.longitude }
}

export function useNavigationSession({ route, profile, destinationName, speak, onReroute }: NavigationSessionOptions) {
  const legs = useMemo(() => buildNavLegs(route), [route])
  const legsRef = useRef(legs)
  legsRef.current = legs

  const progressRef = useRef<Progress>(initialProgress())
  const spokenRef = useRef<Set<string>>(new Set())
  const lastFixRef = useRef<Fix | null>(null)
  const clockRef = useRef<Date>(new Date())
  const offCountRef = useRef(0)
  const lastRerouteRef = useRef(0)
  const reroutingRef = useRef(false)
  const speakRef = useRef(speak)
  speakRef.current = speak
  const onRerouteRef = useRef(onReroute)
  onRerouteRef.current = onReroute
  const profileRef = useRef(profile)
  profileRef.current = profile
  const routeRef = useRef(route)
  routeRef.current = route
  const destinationRef = useRef(destinationName)
  destinationRef.current = destinationName

  const [state, setState] = useState<NavState>(() => navigate(legs, startFixOf(legs), initialProgress(), new Date()))
  const [fix, setFix] = useState<Fix | null>(null)
  const [clock, setClock] = useState<Date>(() => new Date())
  const [source, setSource] = useState<PositionSource>("gps")
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [rerouting, setRerouting] = useState(false)
  const [rerouteError, setRerouteError] = useState<string | null>(null)
  const [simRunning, setSimRunning] = useState(false)
  const [simSpeed, setSimSpeed] = useState<number>(30)
  const gpsSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  // Simulation bookkeeping lives in refs so the timer never sees stale values.
  const simRef = useRef<Simulation | null>(null)
  const simElapsedRef = useRef(0)
  const simSpeedRef = useRef(simSpeed)
  simSpeedRef.current = simSpeed
  const simOffsetRef = useRef(0)

  const speakDue = useCallback((next: NavState) => {
    const prompts = promptsFor(next, { route: routeRef.current, profile: profileRef.current, spoken: spokenRef.current, destinationName: destinationRef.current })
    if (prompts.length === 0) return
    for (const p of prompts) spokenRef.current.add(p.key)
    const text = prompts.map((p) => p.text).filter(Boolean).join(" ")
    if (text) speakRef.current(text)
  }, [])

  const requestReroute = useCallback(async (from: Fix) => {
    const handler = onRerouteRef.current
    if (!handler || reroutingRef.current) return
    reroutingRef.current = true
    setRerouting(true)
    setRerouteError(null)
    speakRef.current("You have left the route. Finding a new route.")
    try {
      const ok = await handler({ latitude: from.latitude, longitude: from.longitude }, clockRef.current)
      if (ok) speakRef.current("Route updated.")
      else {
        setRerouteError("Could not find a new route from here. Keep following the map, or use Next step.")
        speakRef.current("Could not find a new route.")
      }
    } catch {
      setRerouteError("Could not find a new route from here. Keep following the map, or use Next step.")
    } finally {
      lastRerouteRef.current = Date.now()
      offCountRef.current = 0
      reroutingRef.current = false
      setRerouting(false)
    }
  }, [])

  const processFix = useCallback((next: Fix, at: Date) => {
    const current = legsRef.current
    const result = navigate(current, next, progressRef.current, at)
    progressRef.current = { legIndex: result.legIndex, along: result.along }
    lastFixRef.current = next
    clockRef.current = at
    setFix(next)
    setClock(at)
    setState(result)
    speakDue(result)

    // Off route? Only while walking or in an auto — a bus or train follows its own route.
    const eligible = result.leg ? REROUTE_ELIGIBLE.has(result.leg.mode) : false
    if (eligible && result.offRouteMeters > offRouteThreshold(next.accuracy)) offCountRef.current += 1
    else offCountRef.current = 0
    if (
      offCountRef.current >= OFF_ROUTE_FIXES &&
      !reroutingRef.current &&
      Date.now() - lastRerouteRef.current > REROUTE_COOLDOWN_MS &&
      onRerouteRef.current
    ) {
      void requestReroute(next)
    }
  }, [requestReroute, speakDue])

  // A new route (the first one, or after rerouting): start again from its beginning.
  useEffect(() => {
    progressRef.current = initialProgress()
    spokenRef.current = new Set()
    offCountRef.current = 0
    const start = startFixOf(legs)
    const startState = navigate(legs, start, initialProgress(), clockRef.current)
    setState(startState)
    if (!lastFixRef.current) setFix(null)
    if (simRunning) {
      // Keep demonstrating: the new route starts where the displaced rider is.
      simOffsetRef.current = 0
      simElapsedRef.current = 0
      simRef.current = buildSimulation(legs, clockRef.current)
    } else if (lastFixRef.current) {
      // Real GPS: place the rider on the new route straight away.
      processFix(lastFixRef.current, new Date())
    } else {
      speakDue(startState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs])

  // Real GPS.
  useEffect(() => {
    if (simRunning || !gpsSupported || state.done) return
    setSource("gps")
    const geolocation = navigator.geolocation // kept, so the same object is used to stop watching
    const watchId = geolocation.watchPosition(
      (pos) => {
        setGpsError(null)
        processFix(
          { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading, speed: pos.coords.speed },
          new Date(),
        )
      },
      (err) => setGpsError(GEO_ERROR_MESSAGES[err.code] ?? "Unable to retrieve your location."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )
    return () => geolocation.clearWatch(watchId)
  }, [simRunning, gpsSupported, processFix, state.done])

  // Simulated journey.
  useEffect(() => {
    if (!simRunning) return
    setSource("simulation")
    if (!simRef.current) {
      const startAt = routeRef.current.departureAt ? new Date(routeRef.current.departureAt) : new Date()
      simRef.current = buildSimulation(legsRef.current, startAt)
      simElapsedRef.current = 0
    }
    const timer = setInterval(() => {
      const sim = simRef.current
      if (!sim) return
      simElapsedRef.current += (SIM_TICK_MS / 1000) * simSpeedRef.current
      const point = sim.at(simElapsedRef.current)
      const next = simOffsetRef.current > 0 ? displaceFix(point.fix, simOffsetRef.current) : point.fix
      processFix(next, point.clock)
      if (point.finished) setSimRunning(false)
    }, SIM_TICK_MS)
    return () => clearInterval(timer)
  }, [simRunning, processFix])

  const startSimulation = useCallback(() => {
    simRef.current = null
    simOffsetRef.current = 0
    progressRef.current = initialProgress()
    spokenRef.current = new Set()
    offCountRef.current = 0
    setRerouteError(null)
    setSimRunning(true)
  }, [])

  const stopSimulation = useCallback(() => {
    setSimRunning(false)
    simRef.current = null
  }, [])

  /** Knocks the simulated rider 160 m off the route, to demonstrate rerouting. */
  const simulateOffRoute = useCallback(() => {
    simOffsetRef.current = 160
  }, [])

  /** Moves on to the next leg by hand (for when GPS is poor, or indoors). */
  const skip = useCallback(() => {
    progressRef.current = skipLeg(legsRef.current, progressRef.current)
    const anchor = lastFixRef.current ?? startFixOf(legsRef.current)
    const next = legsRef.current[progressRef.current.legIndex]
    // Without a live position, place the rider at the start of the new leg.
    const placed: Fix = !lastFixRef.current && next ? { latitude: next.path.points[0].latitude, longitude: next.path.points[0].longitude } : anchor
    const result = navigate(legsRef.current, placed, progressRef.current, clockRef.current)
    progressRef.current = { legIndex: result.legIndex, along: result.along }
    setState(result)
    speakDue(result)
  }, [speakDue])

  return {
    legs, state, fix, clock, source,
    gpsSupported, gpsError,
    rerouting, rerouteError,
    simulation: { running: simRunning, speed: simSpeed, setSpeed: setSimSpeed, start: startSimulation, stop: stopSimulation, offRoute: simulateOffRoute },
    skip,
  }
}

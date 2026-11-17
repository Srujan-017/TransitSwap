import { Suspense, lazy, useCallback, useState, type ReactNode } from "react"
import {
  ArrowUp, ArrowUpLeft, ArrowUpRight, Bus, Car, CornerDownLeft, CornerDownRight, CornerUpLeft, CornerUpRight, Flag, FlaskConical,
  Footprints, Loader2, LocateFixed, Pause, PartyPopper, Play, RotateCw, TrainFront, Undo2, Volume2, VolumeX, X, ChevronRight, Zap, Check,
} from "lucide-react"
import Button from "../ui/Button"
import ModeIcon from "../ui/ModeIcon"
import { useNavigationSession, SIM_SPEEDS } from "../../hooks/useNavigationSession"
import { useSpeechNarration } from "../../hooks/useSpeechNarration"
import { useWakeLock } from "../../hooks/useWakeLock"
import { describeGuidance, type GuidanceIcon } from "../../navigation/guidance"
import { formatClock } from "../../navigation/clock"
import { buildStepInstruction } from "../../utils/navigationInstructions"
import { formatDuration, formatDistance } from "../../utils/formatters"
import type { MultimodalRoute } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"
import type { LatLng } from "../../navigation/geo"

const LiveNavMap = lazy(() => import("./LiveNavMap"))

const STEP_WORD: Record<string, string> = { walking: "Walk", metro: "Metro", bus: "Bus", auto: "Auto" }

const ICONS: Record<GuidanceIcon, ReactNode> = {
  straight: <ArrowUp aria-hidden="true" />,
  left: <CornerUpLeft aria-hidden="true" />,
  right: <CornerUpRight aria-hidden="true" />,
  "slight-left": <ArrowUpLeft aria-hidden="true" />,
  "slight-right": <ArrowUpRight aria-hidden="true" />,
  "sharp-left": <CornerDownLeft aria-hidden="true" />,
  "sharp-right": <CornerDownRight aria-hidden="true" />,
  uturn: <Undo2 aria-hidden="true" />,
  roundabout: <RotateCw aria-hidden="true" />,
  flag: <Flag aria-hidden="true" />,
  bus: <Bus aria-hidden="true" />,
  metro: <TrainFront aria-hidden="true" />,
  auto: <Car aria-hidden="true" />,
  walk: <Footprints aria-hidden="true" />,
  check: <PartyPopper aria-hidden="true" />,
}

interface Props {
  route: MultimodalRoute
  origin: GeoLocation
  destination: GeoLocation
  profile?: string
  onExit: () => void
  /**
   * Asks for a new route from where the rider is now (leaving at `at`). Resolves true once the page has switched
   * to the new route, false if none could be found. Without it, leaving the route is not acted on.
   */
  onReroute?: (from: LatLng, at: Date) => Promise<boolean>
}

/**
 * Following a journey, Google Maps style: a banner at the top with what to do now (a big arrow, how far, the instruction,
 * and what comes after it), the map in the middle, and a compact card at the bottom with the arrival time, what is left,
 * the current step and the controls. On a phone the map keeps about half the screen.
 */
export default function ActiveNavigationView({ route, destination, profile, onExit, onReroute }: Props) {
  const narration = useSpeechNarration()
  const [muted, setMuted] = useState(false)
  const [follow, setFollow] = useState(true)
  const [announcement, setAnnouncement] = useState("")

  const speak = useCallback((text: string) => {
    narration.speak(text)
    setAnnouncement(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narration.speak])

  const session = useNavigationSession({ route, profile, destinationName: destination.name, speak, onReroute })
  const { state, fix, clock, source, simulation } = session
  const wake = useWakeLock(true)

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    narration.setMuted(next)
  }

  const guidance = describeGuidance(state, { destinationName: destination.name, rerouting: session.rerouting, profile })
  const leg = state.leg
  const nextLeg = leg ? session.legs[state.legIndex + 1] : undefined
  const minutesLeft = Math.max(1, Math.round(state.remainingSeconds / 60))
  const legTitle = leg ? buildStepInstruction(leg.segment, { profile }) : ""

  const statusText =
    source === "simulation"
      ? `Simulated journey (demo) · ${simulation.speed}× speed`
      : fix
        ? `Following your live location${fix.accuracy ? ` · accurate to about ${Math.round(fix.accuracy)} m` : ""}`
        : session.gpsError
          ? `${session.gpsError} Use Next step or Simulate journey.`
          : session.gpsSupported
            ? "Finding your location…"
            : "GPS is not available here. Use Next step or Simulate journey."

  // A phone stacks banner, map and card. On a laptop the banner and card form a side panel and the map takes the rest of
  // the screen, so it stays large however short the window is.
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-navy-50 lg:grid lg:grid-cols-[minmax(22rem,27rem)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]" role="dialog" aria-label="Live navigation">
      {/* What to do now. It turns green on arrival. */}
      <section aria-label="Next instruction" className={`px-4 pb-3 pt-3 text-white shadow-float transition-colors lg:col-start-1 lg:row-start-1 lg:px-5 lg:pt-5 lg:pb-4 ${state.done ? "bg-go-700" : "bg-navy-900"}`}>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-panel bg-white/12 [&>svg]:h-10 [&>svg]:w-10"
            data-testid="guidance-icon"
            data-icon={guidance.icon}
          >
            {session.rerouting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : ICONS[guidance.icon]}
          </div>
          <div className="min-w-0 flex-1">
            {guidance.distanceMeters !== null && (
              <p className="font-display text-3xl font-bold leading-none tabular-nums" data-testid="guidance-distance">{formatDistance(guidance.distanceMeters)}</p>
            )}
            <p className="mt-1 text-lg font-semibold leading-snug" data-testid="guidance-primary">{guidance.primary}</p>
            {guidance.secondary && <p className="text-sm text-white/85" data-testid="guidance-secondary">{guidance.secondary}</p>}
          </div>
        </div>
        {/* What comes after it, as Google Maps shows "Then ..." under the main instruction */}
        {nextLeg && !state.done && !session.rerouting && (
          <p className="mt-2.5 flex items-center gap-1.5 border-t border-white/15 pt-2 text-sm text-white/90">
            <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Then <ModeIcon mode={nextLeg.mode} className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{nextLeg.segment.instruction}</span>
          </p>
        )}
        {session.rerouteError && <p role="alert" className="mt-2 rounded-control bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900">{session.rerouteError}</p>}
      </section>

      {/* Spoken prompts, for screen readers */}
      <p role="status" className="sr-only">{announcement}</p>

      {/* Map */}
      <div className={`relative min-h-[200px] flex-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0 ${simulation.running && !state.done ? "nav-tray-up" : ""}`}>
        <Suspense fallback={<div className="flex h-full items-center justify-center bg-navy-100 text-sm text-navy-600">Loading map…</div>}>
          <LiveNavMap legs={session.legs} state={state} fix={fix} follow={follow} onUserMove={() => setFollow(false)} />
        </Suspense>

        {source === "simulation" && (
          <div className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-card">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> DEMO · simulated journey
          </div>
        )}

        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? "Turn voice guidance on" : "Mute voice guidance"}
            aria-pressed={muted}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy-700 shadow-float transition-colors hover:bg-navy-50"
          >
            {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {/* The demo controls float over the bottom of the map, so running the demo does not shrink it. */}
        {simulation.running && !state.done && (
          <div
            className="absolute inset-x-3 bottom-3 z-[1000] flex flex-wrap lg:inset-x-auto lg:left-1/2 lg:w-[34rem] lg:-translate-x-1/2 items-center gap-2 rounded-panel border border-amber-200 bg-amber-50/95 px-3 py-2 shadow-float backdrop-blur"
            role="group"
            aria-label="Simulation controls"
          >
            <span className="text-xs font-semibold text-amber-900">Speed</span>
            {SIM_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={simulation.speed === speed}
                onClick={() => simulation.setSpeed(speed)}
                className={`min-h-9 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${simulation.speed === speed ? "bg-amber-800 text-white" : "bg-white text-amber-900 hover:bg-amber-100"}`}
              >
                {speed}×
              </button>
            ))}
            {onReroute && (
              <button type="button" onClick={simulation.offRoute} className="ml-auto flex min-h-9 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Go off route
              </button>
            )}
          </div>
        )}

        {!follow && !state.done && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className={`absolute left-3 z-[1000] flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-float transition-colors hover:bg-brand-700 ${simulation.running ? "bottom-24" : "bottom-6"}`}
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" /> Re-centre
          </button>
        )}
      </div>

      {/* Journey card */}
      <section aria-label="Journey progress" className="space-y-2.5 rounded-t-sheet bg-white px-4 pt-3 shadow-pop pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:col-start-1 lg:row-start-2 lg:space-y-4 lg:overflow-y-auto lg:rounded-none lg:px-5 lg:pt-5 lg:shadow-none">
        {state.done ? (
          <div className="space-y-3 text-center">
            <p className="font-display text-xl font-bold text-navy-900">You have arrived at {destination.name}</p>
            <Button variant="go" size="lg" onClick={onExit} fullWidth>Done</Button>
          </div>
        ) : (
          <>
            {/* Leave, when you arrive, and what is left */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onExit}
                aria-label="Exit navigation"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-navy-200 bg-white text-navy-700 transition-colors hover:bg-red-50 hover:text-danger"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-bold leading-none tabular-nums text-navy-900" data-testid="eta-arrival">{formatClock(state.arrivalAt)}</p>
                <p className="mt-1 text-xs font-medium text-navy-600">arrival</p>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums text-navy-800">
                <span data-testid="eta-duration">{formatDuration(minutesLeft)}</span> · <span data-testid="eta-distance">{formatDistance(Math.round(state.remainingMeters))}</span>
                <p className="text-xs font-medium text-navy-600">{clock && source === "simulation" ? `simulated time ${formatClock(clock)}` : "left"}</p>
              </div>
            </div>

            {leg && (
              <div className="flex items-start gap-2.5 rounded-panel bg-navy-50 px-3 py-1.5">
                <ModeIcon mode={leg.mode} className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-600">Step {state.legIndex + 1} of {state.legCount}</p>
                  <p className="text-sm font-medium text-navy-900">{legTitle}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-navy-700" data-testid="nav-status">{statusText}</p>

            <div className="flex gap-2 [&>button]:flex-1 [&>button]:whitespace-nowrap">
              <Button variant="outline" size="sm" className="min-h-11" onClick={session.skip} icon={<ChevronRight className="h-4 w-4" />}>Next step</Button>
              {simulation.running ? (
                <Button variant="secondary" size="sm" className="min-h-11" onClick={simulation.stop} icon={<Pause className="h-4 w-4" />}>Stop simulation</Button>
              ) : (
                // "(demo)" is read out; on screen the button says what it does and the DEMO tag appears once it runs.
                <Button variant="secondary" size="sm" className="min-h-11" onClick={simulation.start} icon={<Play className="h-4 w-4" />}>Simulate journey{" "}<span className="sr-only">(demo)</span></Button>
              )}
            </div>

            {/* The whole trip at a glance, on a laptop where the side panel has the room. */}
            <ol aria-label="All steps of this journey" className="hidden space-y-1 border-t border-navy-100 pt-3 lg:block">
              {session.legs.map((l, i) => {
                const done = i < state.legIndex
                const current = i === state.legIndex
                return (
                  <li key={i} aria-current={current ? "step" : undefined} className={`flex items-center gap-2.5 rounded-control px-2 py-1.5 text-sm ${current ? "bg-brand-50 font-semibold text-navy-900" : done ? "text-navy-500" : "text-navy-700"}`}>
                    <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${current ? "bg-brand-600 text-white" : done ? "bg-go-50 text-go-700" : "bg-navy-100 text-navy-600"}`}>
                      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <ModeIcon mode={l.mode} className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{STEP_WORD[l.mode] ?? "Go"} to {l.segment.to.name}</span>
                    <span className="flex-shrink-0 text-xs tabular-nums text-navy-600">{formatDuration(Math.max(1, Math.round(l.segment.durationSeconds / 60)))}</span>
                  </li>
                )
              })}
            </ol>

            <details className="text-xs leading-snug text-navy-700">
              <summary className="min-h-6 cursor-pointer font-semibold">About live tracking</summary>
              <p className="mt-1">
                Bus and metro positions are not tracked live — bus times come from the demo timetable. A website can only follow your
                location while this screen is open{wake.supported ? (wake.held ? " (your screen is kept on)" : "") : " (your browser cannot keep the screen on)"}.
              </p>
            </details>
          </>
        )}
      </section>
    </div>
  )
}

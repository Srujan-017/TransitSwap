import { Suspense, lazy, useCallback, useState, type ReactNode } from "react"
import {
  ArrowUp, ArrowUpLeft, ArrowUpRight, Bus, Car, CornerDownLeft, CornerDownRight, CornerUpLeft, CornerUpRight, Flag, FlaskConical,
  Footprints, Loader2, LocateFixed, Pause, PartyPopper, Play, RotateCw, TrainFront, Undo2, Volume2, VolumeX, X, ChevronRight, Zap,
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

const ICONS: Record<GuidanceIcon, ReactNode> = {
  straight: <ArrowUp className="h-8 w-8" aria-hidden="true" />,
  left: <CornerUpLeft className="h-8 w-8" aria-hidden="true" />,
  right: <CornerUpRight className="h-8 w-8" aria-hidden="true" />,
  "slight-left": <ArrowUpLeft className="h-8 w-8" aria-hidden="true" />,
  "slight-right": <ArrowUpRight className="h-8 w-8" aria-hidden="true" />,
  "sharp-left": <CornerDownLeft className="h-8 w-8" aria-hidden="true" />,
  "sharp-right": <CornerDownRight className="h-8 w-8" aria-hidden="true" />,
  uturn: <Undo2 className="h-8 w-8" aria-hidden="true" />,
  roundabout: <RotateCw className="h-8 w-8" aria-hidden="true" />,
  flag: <Flag className="h-8 w-8" aria-hidden="true" />,
  bus: <Bus className="h-8 w-8" aria-hidden="true" />,
  metro: <TrainFront className="h-8 w-8" aria-hidden="true" />,
  auto: <Car className="h-8 w-8" aria-hidden="true" />,
  walk: <Footprints className="h-8 w-8" aria-hidden="true" />,
  check: <PartyPopper className="h-8 w-8" aria-hidden="true" />,
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-navy-50" role="dialog" aria-label="Live navigation">
      {/* What to do now */}
      <section aria-label="Next instruction" className="bg-navy-900 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10" data-testid="guidance-icon" data-icon={guidance.icon}>
            {session.rerouting ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" /> : ICONS[guidance.icon]}
          </div>
          <div className="min-w-0 flex-1">
            {guidance.distanceMeters !== null && (
              <p className="font-display text-2xl font-bold leading-none" data-testid="guidance-distance">{formatDistance(guidance.distanceMeters)}</p>
            )}
            <p className="mt-1 text-base font-semibold leading-snug" data-testid="guidance-primary">{guidance.primary}</p>
            {guidance.secondary && <p className="text-sm text-white/80" data-testid="guidance-secondary">{guidance.secondary}</p>}
          </div>
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit navigation"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-start rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {session.rerouteError && <p role="alert" className="mt-2 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900">{session.rerouteError}</p>}
      </section>

      {/* Spoken prompts, for screen readers */}
      <p role="status" className="sr-only">{announcement}</p>

      {/* Map */}
      <div className="relative min-h-[200px] flex-1">
        <Suspense fallback={<div className="flex h-full items-center justify-center bg-navy-50 text-sm text-navy-500">Loading map…</div>}>
          <LiveNavMap legs={session.legs} state={state} fix={fix} follow={follow} onUserMove={() => setFollow(false)} />
        </Suspense>

        {source === "simulation" && (
          <div className="absolute left-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 shadow">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> DEMO · simulated journey
          </div>
        )}

        <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? "Turn voice guidance on" : "Mute voice guidance"}
            aria-pressed={muted}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-700 shadow-md hover:bg-navy-50"
          >
            {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {!follow && !state.done && (
          <button
            type="button"
            onClick={() => setFollow(true)}
            className="absolute bottom-6 left-3 z-[1000] flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-700"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" /> Re-centre
          </button>
        )}
      </div>

      {/* Journey panel */}
      <section aria-label="Journey progress" className="space-y-3 rounded-t-3xl bg-white px-4 pb-4 pt-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)]">
        {state.done ? (
          <div className="space-y-3 text-center">
            <p className="font-display text-xl font-bold text-navy-900">You have arrived at {destination.name}</p>
            <Button onClick={onExit} fullWidth>Done</Button>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-bold leading-none text-navy-900" data-testid="eta-arrival">{formatClock(state.arrivalAt)}</p>
                <p className="mt-1 text-xs font-medium text-navy-500">arrival</p>
              </div>
              <div className="text-right text-sm font-semibold text-navy-700">
                <span data-testid="eta-duration">{formatDuration(minutesLeft)}</span> · <span data-testid="eta-distance">{formatDistance(Math.round(state.remainingMeters))}</span>
                <p className="text-xs font-medium text-navy-500">{clock && source === "simulation" ? `simulated time ${formatClock(clock)}` : "left"}</p>
              </div>
            </div>

            {leg && (
              <div className="flex items-start gap-2 rounded-2xl bg-navy-50 px-3 py-2">
                <ModeIcon mode={leg.mode} className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Step {state.legIndex + 1} of {state.legCount}</p>
                  <p className="text-sm font-medium text-navy-800">{legTitle}</p>
                  {nextLeg && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-navy-500">
                      <ChevronRight className="h-3 w-3" aria-hidden="true" /> Then <ModeIcon mode={nextLeg.mode} className="h-3.5 w-3.5" /> {nextLeg.segment.instruction}
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-navy-600" data-testid="nav-status">{statusText}</p>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={session.skip} icon={<ChevronRight className="h-4 w-4" />}>Next step</Button>
              {simulation.running ? (
                <Button variant="secondary" size="sm" onClick={simulation.stop} icon={<Pause className="h-4 w-4" />}>Stop simulation</Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={simulation.start} icon={<Play className="h-4 w-4" />}>Simulate journey (demo)</Button>
              )}
            </div>

            {simulation.running && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2" role="group" aria-label="Simulation controls">
                <span className="text-xs font-semibold text-amber-900">Speed</span>
                {SIM_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    aria-pressed={simulation.speed === speed}
                    onClick={() => simulation.setSpeed(speed)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${simulation.speed === speed ? "bg-amber-800 text-white" : "bg-white text-amber-900 hover:bg-amber-100"}`}
                  >
                    {speed}×
                  </button>
                ))}
                {onReroute && (
                  <button type="button" onClick={simulation.offRoute} className="ml-auto flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Go off route
                  </button>
                )}
              </div>
            )}

            <details className="text-[11px] leading-snug text-navy-600">
              <summary className="cursor-pointer font-semibold">About live tracking</summary>
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

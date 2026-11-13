import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { X, ChevronRight, Volume2, VolumeX, FlaskConical, Compass, MapPin, PartyPopper, Navigation2 } from "lucide-react"
import Button from "../ui/Button"
import { useActiveNavigation } from "../../hooks/useActiveNavigation"
import { useSpeechNarration } from "../../hooks/useSpeechNarration"
import { buildStepInstruction, buildArrivalAnnouncement } from "../../utils/navigationInstructions"
import { formatDuration, formatDistance } from "../../utils/formatters"
import type { MultimodalRoute, MultimodalMode } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

const MapView = lazy(() => import("../map/MapView"))

const MODE_EMOJI: Record<MultimodalMode, string> = { walking: "🚶", metro: "🚇", bus: "🚌", auto: "🛺" }
const MODE_COLOR: Record<MultimodalMode, string> = { walking: "#64748b", metro: "#2563eb", bus: "#16a34a", auto: "#ea580c" }

interface Props {
  route: MultimodalRoute
  origin: GeoLocation
  destination: GeoLocation
  profile?: string
  onExit: () => void
}

export default function ActiveNavigationView({ route, origin, destination, profile, onExit }: Props) {
  const nav = useActiveNavigation(route)
  const narration = useSpeechNarration()
  const [muted, setMuted] = useState(false)

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    narration.setMuted(next)
  }

  useEffect(() => {
    if (nav.isComplete) {
      narration.speak(buildArrivalAnnouncement(route))
      return
    }
    const text = buildStepInstruction(nav.currentSegment, {
      profile,
      isLast: nav.currentStepIndex === nav.totalSteps - 1,
    })
    narration.speak(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.currentStepIndex, nav.isComplete])

  const isLastStep = nav.currentStepIndex === nav.totalSteps - 1
  const instructionText = nav.isComplete
    ? buildArrivalAnnouncement(route)
    : buildStepInstruction(nav.currentSegment, { profile, isLast: isLastStep })

  // Honest "arrive in ~N min" estimate — summed from the real remaining
  // segment durations the route already carries, not a fabricated number.
  const minutesRemaining = useMemo(() => {
    if (nav.isComplete) return 0
    const remainingSeconds = route.segments
      .slice(nav.currentStepIndex)
      .reduce((sum, seg) => sum + seg.durationSeconds, 0)
    return Math.max(1, Math.round(remainingSeconds / 60))
  }, [route.segments, nav.currentStepIndex, nav.isComplete])

  // Guard against a genuinely empty route.segments array (savedRouteService/
  // journeyService already reject saving one, but a malformed/legacy saved
  // route reaching this view would otherwise leave currentSegment undefined
  // and crash here, before the isComplete branch below ever renders.
  const segmentColor = nav.currentSegment ? MODE_COLOR[nav.currentSegment.mode] : MODE_COLOR.walking
  const progressPercent = Math.round((nav.currentStepIndex / nav.totalSteps) * 100)

  return (
    <div className="fixed inset-0 z-[60] bg-navy-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-[0_1px_0_rgba(15,23,42,0.06)]">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-navy-50 text-navy-600 text-sm font-semibold hover:bg-navy-100 transition-colors"
        >
          <X className="w-4 h-4" /> Exit navigation
        </button>
        <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider">
          {nav.isComplete ? "Arrived" : `Step ${nav.currentStepIndex + 1} of ${nav.totalSteps}`}
        </span>
        <div className="w-[120px]" aria-hidden="true" />
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-[220px]">
        <Suspense fallback={<div className="h-full flex items-center justify-center bg-navy-50 text-sm text-navy-400">Loading map…</div>}>
          <MapView
            origin={origin}
            destination={destination}
            route={null}
            multimodalRoute={route}
            livePosition={nav.position}
            activeSegmentId={nav.isComplete ? null : nav.currentSegment.id}
          />
        </Suspense>

        {/* Floating ETA pill, over the map */}
        {!nav.isComplete && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white rounded-full shadow-[0_8px_24px_-6px_rgba(15,23,42,0.35)] pl-1.5 pr-4 py-1.5">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: `${segmentColor}22` }}
            >
              {MODE_EMOJI[nav.currentSegment.mode]}
            </span>
            <div className="leading-tight">
              <p className="text-[9px] font-semibold text-navy-400 uppercase tracking-wide">Arrive in</p>
              <p className="font-display font-bold text-sm" style={{ color: segmentColor }}>~{minutesRemaining} min</p>
            </div>
          </div>
        )}
      </div>

      {/* Instruction card */}
      <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(15,23,42,0.1)] space-y-3">
        {nav.isComplete ? (
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <PartyPopper className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-navy-900 text-lg">{instructionText}</p>
            </div>
          </div>
        ) : (
          <>
            {isLastStep && (
              <p className="font-display font-bold text-navy-900 text-xl -mb-1">Your stop is next!</p>
            )}

            <div className="flex items-start gap-3">
              {/* Big colored route badge — route number for transit, mode icon otherwise,
                  colored with the same line color MapView draws the segment in. */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-display font-bold text-lg shadow-[0_6px_14px_-4px_rgba(15,23,42,0.35)]"
                style={{ backgroundColor: segmentColor }}
              >
                {nav.currentSegment.transitDetails?.routeNumber ?? (
                  <span className="text-xl">{MODE_EMOJI[nav.currentSegment.mode]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-navy-900 text-lg leading-snug">{instructionText}</p>
                <p className="text-xs text-navy-500 mt-1">
                  {formatDistance(nav.currentSegment.distanceMeters)} · {formatDuration(Math.ceil(nav.currentSegment.durationSeconds / 60))}
                  {nav.distanceToNextMeters !== null && ` · ${formatDistance(nav.distanceToNextMeters)} away (live)`}
                </p>
              </div>
            </div>

            {/* Progress bar — colored fill up to the current step, matching
                the segment's own line color. */}
            <div className="h-1.5 rounded-full bg-navy-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, progressPercent)}%`, backgroundColor: segmentColor }}
              />
            </div>

            {/* Next stop / boarding card — colored to match the segment, using
                only real transitDetails fields already computed server-side. */}
            {nav.currentSegment.transitDetails && (
              <div className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5" style={{ backgroundColor: `${segmentColor}14` }}>
                <Navigation2 className="w-4 h-4 flex-shrink-0" style={{ color: segmentColor }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: segmentColor }}>
                    Next stop: {nav.currentSegment.to.name}
                  </p>
                  {nav.currentSegment.transitDetails.estimatedBoardingTime && (
                    <p className="text-[11px] text-navy-500">Board by ~{nav.currentSegment.transitDetails.estimatedBoardingTime}</p>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming boarding-time chips — real server-computed values,
                the same countdown-card pattern as a departures board. */}
            {nav.currentSegment.transitDetails?.upcomingBoardingTimes && nav.currentSegment.transitDetails.upcomingBoardingTimes.length > 0 && (
              <div className="flex items-center gap-2">
                {[nav.currentSegment.transitDetails.estimatedBoardingTime, ...nav.currentSegment.transitDetails.upcomingBoardingTimes]
                  .filter((t): t is string => Boolean(t))
                  .slice(0, 3)
                  .map((time, i) => (
                    <div
                      key={time}
                      className={`flex-1 text-center rounded-xl py-2 ${i === 0 ? "text-white" : "bg-navy-50 text-navy-700"}`}
                      style={i === 0 ? { backgroundColor: segmentColor } : undefined}
                    >
                      <p className="font-display font-bold text-sm">{time}</p>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2 bg-amber-50 rounded-2xl px-3 py-2">
          <FlaskConical className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-medium leading-snug">
            Uses your real device location to track walking progress — bus/metro positions are not live-tracked (demo transit data).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-full bg-navy-50 text-xs font-medium text-navy-500">
            <Compass className="w-3.5 h-3.5 flex-shrink-0" />
            {nav.isComplete ? (
              // Tracking has stopped on arrival; "Location unavailable — use Next step" would be wrong here.
              <span>You have arrived — tap Done to finish</span>
            ) : nav.isTrackingLive ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <MapPin className="w-3 h-3" /> Following your location
              </span>
            ) : nav.geoError ? (
              <span>Location unavailable — use Next step to continue</span>
            ) : nav.isGeoSupported ? (
              <span>Finding your location…</span>
            ) : (
              <span>GPS not supported — use Next step to continue</span>
            )}
          </div>

          {narration.isSupported && (
            <button
              type="button"
              onClick={toggleMuted}
              title={muted ? "Unmute narration" : "Mute narration"}
              aria-label={muted ? "Unmute narration" : "Mute narration"}
              className="p-2.5 rounded-full bg-navy-50 text-navy-500 hover:bg-navy-100 transition-colors flex-shrink-0"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {nav.isComplete ? (
            <Button onClick={onExit} size="md">Done</Button>
          ) : (
            <Button onClick={nav.advance} size="md" icon={<ChevronRight className="w-4 h-4" />} iconPosition="right">
              Next step
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

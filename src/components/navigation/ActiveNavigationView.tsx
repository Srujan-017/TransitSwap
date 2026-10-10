import { Suspense, lazy, useEffect, useState } from "react"
import { X, ChevronRight, Volume2, VolumeX, FlaskConical, Compass, MapPin, PartyPopper } from "lucide-react"
import Button from "../ui/Button"
import { useActiveNavigation } from "../../hooks/useActiveNavigation"
import { useSpeechNarration } from "../../hooks/useSpeechNarration"
import { buildStepInstruction, buildArrivalAnnouncement } from "../../utils/navigationInstructions"
import { formatDuration, formatDistance } from "../../utils/formatters"
import type { MultimodalRoute, MultimodalMode } from "../../types/multimodal"
import type { GeoLocation } from "../../types/map"

const MapView = lazy(() => import("../map/MapView"))

const MODE_EMOJI: Record<MultimodalMode, string> = { walking: "🚶", metro: "🚇", bus: "🚌", auto: "🛺" }

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
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0 text-xl">
              {MODE_EMOJI[nav.currentSegment.mode]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-navy-900 text-lg leading-snug">{instructionText}</p>
              <p className="text-xs text-navy-500 mt-1">
                {formatDistance(nav.currentSegment.distanceMeters)} · {formatDuration(Math.ceil(nav.currentSegment.durationSeconds / 60))}
                {nav.distanceToNextMeters !== null && ` · ${formatDistance(nav.distanceToNextMeters)} away (live)`}
              </p>
              {nav.currentSegment.transitDetails?.estimatedBoardingTime && (
                <p className="text-xs text-navy-500 mt-0.5">
                  Board by ~{nav.currentSegment.transitDetails.estimatedBoardingTime}
                </p>
              )}
            </div>
          </div>
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
            {nav.isTrackingLive ? (
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

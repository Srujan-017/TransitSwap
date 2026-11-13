import { Building2, Bus, Clock, Footprints, Users } from "lucide-react"
import type { ExcludedRoute, ExclusionReasonType } from "../../types/multimodal"

interface Props {
  routes: ExcludedRoute[]
  /** Display name of the rider's profile, e.g. "Wheelchair". */
  profileLabel: string
  /**
   * "none-left": every candidate was ruled out, so this IS the explanation of the
   * failed search. "some-left": shown beside the recommended routes, collapsed.
   */
  variant: "none-left" | "some-left"
}

const REASON_META: Record<ExclusionReasonType, { label: string; Icon: typeof Users; chip: string }> = {
  station: { label: "Station not accessible", Icon: Building2, chip: "bg-red-50 text-red-700" },
  walking_distance: { label: "Too much walking or rolling", Icon: Footprints, chip: "bg-amber-50 text-amber-700" },
  crowd: { label: "Too crowded", Icon: Users, chip: "bg-violet-50 text-violet-700" },
  mode: { label: "Not suitable for you", Icon: Bus, chip: "bg-sky-50 text-sky-800" },
  service_hours: { label: "Not running then", Icon: Clock, chip: "bg-slate-100 text-slate-700" },
}

function ExcludedList({ routes }: { routes: ExcludedRoute[] }) {
  return (
    <ul className="space-y-2">
      {routes.map((route, index) => {
        const { label, Icon, chip } = REASON_META[route.reasonType] ?? REASON_META.station
        return (
          <li key={`${route.summary}-${index}`} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-medium text-navy-800">{route.summary}</p>
            <p className="mt-0.5 text-xs text-navy-500">
              {route.durationMinutes} min · {route.walkingMeters} m walking/rolling
            </p>
            <p className="mt-2 flex flex-wrap items-start gap-2 text-xs text-navy-600">
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium ${chip}`}>
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </span>
              <span>{route.reason}</span>
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Completion-phase 2 (B3) — shows the candidate routes the engine excluded for the
 * rider's profile and the typed reason for each. When none are left, this replaces the
 * generic "no combination connects them" hint, which was wrong in that case: routes
 * DID exist, they just were not usable for this rider.
 */
export default function ExcludedRoutes({ routes, profileLabel, variant }: Props) {
  if (routes.length === 0) return null

  if (variant === "none-left") {
    return (
      <section aria-label="Routes that were excluded" className="space-y-3">
        <p className="text-sm text-navy-700">
          TransitSwap found {routes.length} possible route{routes.length === 1 ? "" : "s"} for this trip, but none is
          usable with the <strong>{profileLabel}</strong> profile. Here is why each was ruled out:
        </p>
        <ExcludedList routes={routes} />
        <p className="text-xs text-navy-500">
          Try another departure time, a different profile, or nearby stations — the demo accessibility and crowd data
          are synthetic.
        </p>
      </section>
    )
  }

  return (
    <details className="group rounded-3xl bg-navy-50/60 px-5 py-3">
      <summary className="cursor-pointer text-sm font-medium text-navy-700">
        {routes.length} other route{routes.length === 1 ? " was" : "s were"} excluded for your {profileLabel} profile —
        see why
      </summary>
      <div className="mt-3">
        <ExcludedList routes={routes} />
      </div>
    </details>
  )
}

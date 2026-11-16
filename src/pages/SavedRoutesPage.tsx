import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bookmark, Compass, Footprints, Navigation, Sprout, Trash2 } from "lucide-react"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import PageHeader from "../components/ui/PageHeader"
import EmptyState from "../components/ui/EmptyState"
import Photo from "../components/ui/Photo"
import Skeleton from "../components/ui/Skeleton"
import { ModeStrip, ModeChips } from "../components/ui/ModeStrip"
import RouteEnds from "../components/ui/RouteEnds"
import { tripService, type SavedRouteRecord } from "../services/tripService"
import { formatDate, formatDistance, formatDuration } from "../utils/formatters"

export default function SavedRoutesPage() {
  const [routes, setRoutes] = useState<SavedRouteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const navigate = useNavigate()

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const data = await tripService.getSavedRoutes()
      setRoutes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved routes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this saved route?")) return
    setActionMessage("")
    try {
      await tripService.deleteSavedRoute(id)
      setRoutes((current) => current.filter((route) => route._id !== id))
      setActionMessage("Saved route deleted.")
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not delete saved route.")
    }
  }

  function handleUseRoute(route: SavedRouteRecord) {
    // Problem 10 — loads the saved origin/destination into the Plan Trip flow.
    // The saved route is a snapshot, not assumed live: the user re-runs the
    // search to get a freshly calculated route via the existing routing engine.
    navigate("/plan", {
      state: {
        useRouteOrigin: route.origin,
        useRouteDestination: route.destination,
      },
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Your places"
        title="Saved Routes"
        subtitle="Reusable route snapshots you've saved for quick access."
        actions={
          <Link to="/plan">
            <Button variant="outline" size="sm" icon={<Navigation className="h-4 w-4" />}>Plan a trip</Button>
          </Link>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-panel bg-brand-50 px-4 py-3">
        <Bookmark className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-brand-900">
          A saved route is a snapshot at the time you saved it. Use "Use Route" to reload the origin and
          destination into Plan Trip and recalculate a fresh route.
        </p>
      </div>

      <div aria-live="polite">
        {actionMessage && <p className="mb-4 text-sm text-navy-700">{actionMessage}</p>}
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="status" aria-label="Loading saved routes">
          {[0, 1].map((i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-4 h-8 w-1/2" />
            </Card>
          ))}
          <p className="sr-only">Loading saved routes...</p>
        </div>
      )}

      {!loading && error && (
        <Card role="alert">
          <p className="text-sm font-semibold text-danger">Could not load saved routes</p>
          <p className="mt-1 text-sm text-navy-600">{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void loadData()}>Try again</Button>
        </Card>
      )}

      {!loading && !error && routes.length === 0 && (
        <Card padding="none" className="overflow-hidden">
          <div className="relative h-36 sm:h-44">
            <Photo id="cubbon-park-station" decorative sizes="(min-width: 1024px) 64rem, 100vw" className="h-full w-full object-cover" />
          </div>
          <EmptyState
            icon={<Bookmark className="h-6 w-6" aria-hidden="true" />}
            title="No saved routes yet."
            description="Save a route from Plan Trip to see it here."
            action={
              <Link to="/plan">
                <Button variant="go" icon={<Navigation className="h-4 w-4" />}>Plan a trip</Button>
              </Link>
            }
          />
        </Card>
      )}

      {!loading && !error && routes.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {routes.map((route) => (
            <li key={route._id}>
              <Card padding="none" className="flex h-full flex-col overflow-hidden">
                <ModeStrip modes={route.transportModes} />
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words font-display text-base font-semibold text-navy-900">{route.name}</h2>
                    <button
                      type="button"
                      onClick={() => void handleDelete(route._id)}
                      className="-mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-control text-navy-500 transition-colors hover:bg-red-50 hover:text-danger"
                      title="Delete saved route"
                      aria-label={`Delete saved route ${route.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* The default name is already "Origin → Destination", so only show the ends when the name is something else. */}
                  {!(route.name.includes(route.origin.name) && route.name.includes(route.destination.name)) && (
                    <RouteEnds origin={route.origin.name} destination={route.destination.name} className="mt-2" />
                  )}
                  <ModeChips modes={route.transportModes} className="mt-3" />

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-600">
                    <span className="font-semibold tabular-nums text-navy-900">{formatDuration(Math.round(route.totalDurationSeconds / 60))}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Rs {route.totalFare}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Footprints className="h-3.5 w-3.5" aria-hidden="true" /> {formatDistance(route.walkingDistanceMeters)}
                    </span>
                    {route.sustainabilityScore !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums text-go-800"><Sprout className="h-3.5 w-3.5" aria-hidden="true" /> {route.sustainabilityScore}/100</span>
                      </>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <p className="text-xs text-navy-500">Saved {formatDate(route.createdAt)}</p>
                    <Button size="sm" variant="outline" icon={<Compass className="h-4 w-4" />} onClick={() => handleUseRoute(route)}>
                      Use Route
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

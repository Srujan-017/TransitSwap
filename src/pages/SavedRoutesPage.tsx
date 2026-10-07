import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Bookmark, Compass, Footprints, MapPin, Trash2 } from "lucide-react"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900">Saved Routes</h1>
        <p className="text-navy-500 text-sm mt-1">Reusable route snapshots you've saved for quick access.</p>
      </div>

      <div className="mb-6 flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
        <Bookmark className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-relaxed">
          A saved route is a snapshot at the time you saved it. Use "Use Route" to reload the origin and
          destination into Plan Trip and recalculate a fresh route.
        </p>
      </div>

      {actionMessage && <p className="mb-4 text-sm text-navy-600">{actionMessage}</p>}

      {loading && (
        <Card>
          <p className="text-sm text-navy-500">Loading saved routes...</p>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <p className="text-sm font-semibold text-danger">Could not load saved routes</p>
          <p className="text-sm text-navy-500 mt-1">{error}</p>
        </Card>
      )}

      {!loading && !error && routes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-navy-200">
          <MapPin className="w-8 h-8 text-navy-300 mx-auto mb-3" />
          <p className="text-navy-600 font-semibold">No saved routes yet.</p>
          <p className="text-xs text-navy-400 mt-1">Save a route from Plan Trip to see it here.</p>
        </div>
      )}

      {!loading && !error && routes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {routes.map((route) => (
            <Card key={route._id} padding="md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-semibold text-navy-900 truncate">{route.name}</p>
                <button
                  type="button"
                  onClick={() => void handleDelete(route._id)}
                  className="p-1.5 rounded-lg text-navy-400 hover:bg-red-50 hover:text-danger flex-shrink-0"
                  title="Delete saved route"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-navy-600 mb-3">
                <span className="truncate">{route.origin.name}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0 text-navy-400" />
                <span className="truncate">{route.destination.name}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {route.transportModes.map((mode) => (
                  <Badge key={mode} size="sm">{mode}</Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-navy-500 mb-3">
                <span>{formatDuration(Math.round(route.totalDurationSeconds / 60))}</span>
                <span>·</span>
                <span>Rs {route.totalFare}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Footprints className="w-3 h-3" /> {formatDistance(route.walkingDistanceMeters)}
                </span>
                {route.sustainabilityScore !== undefined && (
                  <>
                    <span>·</span>
                    <span>🌱 {route.sustainabilityScore}/100</span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-navy-400">Saved {formatDate(route.createdAt)}</p>
                <Button size="sm" variant="outline" icon={<Compass className="w-3.5 h-3.5" />} onClick={() => handleUseRoute(route)}>
                  Use Route
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Accessibility as AccessibilityIcon, AlertTriangle, ArrowDown, ArrowUp, Bookmark, Database, MapPin, MessageSquare,
  Plus, Route as RouteIcon, Search, ShieldAlert, Star, Trash2, Users, Activity,
} from "lucide-react"
import { adminService } from "../services/adminService"
import type {
  AdminOverview,
  AdminStation,
  AdminCrowdReport,
  AdminFeedbackRecord,
  AdminDatasetInfo,
  AdminAccessibilityReport,
} from "../types/admin"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import PageHeader from "../components/ui/PageHeader"
import StatTile from "../components/ui/StatTile"
import Skeleton from "../components/ui/Skeleton"
import Sheet from "../components/ui/Sheet"
import Tabs from "../components/ui/Tabs"
import EmptyStateBox from "../components/ui/EmptyState"

type Tab = "overview" | "stations" | "accessibility" | "crowd" | "feedback" | "dataset" | "reports"

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "stations", label: "Stations" },
  { id: "accessibility", label: "Accessibility" },
  { id: "crowd", label: "Crowd Reports" },
  { id: "feedback", label: "Feedback" },
  { id: "dataset", label: "Dataset" },
  { id: "reports", label: "Reports" },
]

const TAB_CONTENT: Record<Tab, ReactNode> = {
  overview: <OverviewSection />,
  stations: <StationsSection />,
  accessibility: <AccessibilitySection />,
  crowd: <CrowdSection />,
  feedback: <FeedbackSection />,
  dataset: <DatasetSection />,
  reports: <ReportsSection />,
}

// The station list is long (over ninety), so it shows a page at a time.
const STATIONS_PER_PAGE = 25

const SELECT_CLASS =
  "min-h-11 w-full rounded-control border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 transition-colors hover:border-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview")

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow="Admin"
        title="Admin Dashboard"
        subtitle="Manage stations, lift status, crowd reports and feedback."
      />

      <div className="-mt-3 mb-5">
        <Badge variant="brand" size="md" className="max-w-full whitespace-normal">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Admin-managed status — not real-time citywide data
        </Badge>
      </div>

      <Tabs
        ariaLabel="Admin sections"
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        items={TAB_LABELS.map((t) => ({ id: t.id, label: t.label, content: TAB_CONTENT[t.id] }))}
      />
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────

function OverviewSection() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminService.getOverview().then(setData).catch((err) => setError(err instanceof Error ? err.message : "Failed to load overview."))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!data) return <Loading text="Loading overview…" />

  const stats: { label: string; value: number | string; icon: ReactNode }[] = [
    { label: "Users", value: data.users, icon: <Users className="h-4 w-4" /> },
    { label: "Journeys", value: data.journeys, icon: <RouteIcon className="h-4 w-4" /> },
    { label: "Saved Routes", value: data.savedRoutes, icon: <Bookmark className="h-4 w-4" /> },
    { label: "Saved Destinations", value: data.savedDestinations, icon: <MapPin className="h-4 w-4" /> },
    { label: "Crowd Reports", value: data.crowdReports, icon: <Activity className="h-4 w-4" /> },
    { label: "Accessibility Records", value: data.accessibilityRecords, icon: <AccessibilityIcon className="h-4 w-4" /> },
    { label: "Feedback Records", value: data.feedback, icon: <MessageSquare className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-4">
      {!data.databaseConnected && (
        <div role="alert" className="flex items-center gap-2 rounded-panel border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> Database not connected — counts show N/A where persistence is required.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <StatTile key={s.label} tone="brand" icon={s.icon} label={s.label} value={s.value} />
        ))}
      </div>
    </div>
  )
}

// ── Stations ──────────────────────────────────────────────────────────────

function StationsSection() {
  const [stations, setStations] = useState<AdminStation[] | null>(null)
  const [error, setError] = useState("")
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [limit, setLimit] = useState(STATIONS_PER_PAGE)

  function load() {
    adminService.listStations().then(setStations).catch((err) => setError(err instanceof Error ? err.message : "Failed to load stations."))
  }
  useEffect(load, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (stations ?? []).filter((s) => !q || s.stationName.toLowerCase().includes(q) || s.stationId.toLowerCase().includes(q))
    return [...list].sort((a, b) => (sortAsc ? 1 : -1) * a.stationName.localeCompare(b.stationName))
  }, [stations, query, sortAsc])

  async function handleDeactivate(stationId: string) {
    if (!confirm(`Deactivate station "${stationId}"? It will be hidden from active use but not deleted.`)) return
    try {
      await adminService.deactivateStation(stationId)
      setBanner({ ok: true, text: `Station "${stationId}" deactivated.` })
      load()
    } catch (err) {
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Failed to deactivate station." })
    }
  }

  async function handleDelete(stationId: string) {
    if (!confirm(`Permanently delete station "${stationId}"? This cannot be undone.`)) return
    try {
      await adminService.deleteStation(stationId)
      setBanner({ ok: true, text: `Station "${stationId}" deleted.` })
      load()
    } catch (err) {
      // BUG FIX (Problem 23 completion) — show the backend's real reason (e.g. a
      // 409 because crowd reports reference this station) instead of a generic message.
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Failed to delete station." })
    }
  }

  if (error) return <ErrorState message={error} />
  if (!stations) return <Loading text="Loading stations…" />

  const editing = stations.find((s) => s.stationId === editingId) ?? null

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search stations"
            placeholder="Search stations"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setLimit(STATIONS_PER_PAGE) }}
            className="h-11 w-full rounded-full border border-navy-200 bg-white pl-10 pr-4 text-sm text-navy-900 placeholder-navy-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <Button size="md" icon={<Plus className="h-4 w-4" />} onClick={() => { setShowAddForm(true); setEditingId(null) }}>
          Add Station
        </Button>
      </div>

      <div aria-live="polite">{banner && <ActionBanner ok={banner.ok} text={banner.text} />}</div>

      <Sheet open={showAddForm} onClose={() => setShowAddForm(false)} title="Add station">
        <AddStationForm
          onCancel={() => setShowAddForm(false)}
          onCreated={(msg) => {
            setBanner({ ok: true, text: msg })
            setShowAddForm(false)
            load()
          }}
          onError={(msg) => setBanner({ ok: false, text: msg })}
        />
      </Sheet>

      <Sheet open={editing !== null} onClose={() => setEditingId(null)} title={editing ? `Edit ${editing.stationName}` : "Edit station"}>
        {editing && (
          <EditStationForm
            station={editing}
            onCancel={() => setEditingId(null)}
            onSaved={(msg) => {
              setBanner({ ok: true, text: msg })
              setEditingId(null)
              load()
            }}
            onError={(msg) => setBanner({ ok: false, text: msg })}
          />
        )}
      </Sheet>

      {stations.length === 0 ? (
        <EmptyState message="No stations found." />
      ) : shown.length === 0 ? (
        <EmptyState message={`No stations match "${query}".`} />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Stations</caption>
              <thead className="bg-navy-50 text-xs uppercase tracking-wider text-navy-700">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left" aria-sort={sortAsc ? "ascending" : "descending"}>
                    <button type="button" onClick={() => setSortAsc((v) => !v)} className="inline-flex min-h-9 items-center gap-1 font-semibold uppercase tracking-wider hover:text-navy-900">
                      Station
                      {sortAsc ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span className="sr-only">, sorted {sortAsc ? "A to Z" : "Z to A"}; activate to reverse</span>
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">Type</th>
                  <th scope="col" className="px-4 py-3 text-left">Status</th>
                  <th scope="col" className="px-4 py-3 text-left">Active</th>
                  <th scope="col" className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {shown.slice(0, limit).map((s) => (
                  <tr key={s.stationId}>
                    <td className="px-4 py-3 font-medium text-navy-900">{s.stationName}</td>
                    <td className="px-4 py-3 capitalize text-navy-700">{s.transportMode}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <Badge variant={s.active === false ? "danger" : "success"}>{s.active === false ? "Inactive" : "Active"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(s.stationId); setShowAddForm(false) }}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeactivate(s.stationId)}>Deactivate</Button>
                        <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => handleDelete(s.stationId)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 px-4 py-3 text-sm text-navy-600">
            <p>Showing {Math.min(limit, shown.length)} of {shown.length} stations</p>
            {shown.length > limit && (
              <Button size="sm" variant="outline" onClick={() => setLimit((n) => n + STATIONS_PER_PAGE)}>
                Show more ({shown.length - limit} remaining)
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// Problem 23 completion — Add Station form. Reuses adminService.createStation
// (no new API) and the same field set / validation rules already enforced
// server-side in admin.routes.ts, checked client-side too so bad values never
// reach the backend.
function AddStationForm({
  onCancel,
  onCreated,
  onError,
}: {
  onCancel: () => void
  onCreated: (message: string) => void
  onError: (message: string) => void
}) {
  const [stationId, setStationId] = useState("")
  const [stationName, setStationName] = useState("")
  const [transportMode, setTransportMode] = useState<"metro" | "bus">("metro")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [fieldError, setFieldError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setFieldError("")
    if (!stationId.trim()) return setFieldError("Station ID is required.")
    if (!stationName.trim()) return setFieldError("Station name is required.")

    let lat: number | undefined
    let lng: number | undefined
    if (latitude.trim()) {
      lat = Number(latitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) return setFieldError("Latitude must be between -90 and 90.")
    }
    if (longitude.trim()) {
      lng = Number(longitude)
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) return setFieldError("Longitude must be between -180 and 180.")
    }

    setSaving(true)
    try {
      await adminService.createStation({ stationId: stationId.trim(), stationName: stationName.trim(), transportMode, latitude: lat, longitude: lng })
      onCreated(`Station "${stationName.trim()}" created.`)
    } catch (err) {
      // Show the backend's honest error (e.g. a duplicate stationId 409) rather than a generic message.
      onError(err instanceof Error ? err.message : "Failed to create station.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3">
        <Input label="Station ID" value={stationId} onChange={(e) => setStationId(e.target.value)} placeholder="e.g. mg-road-metro" />
        <Input label="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="e.g. MG Road Metro" />
        <div className="space-y-1.5">
          <label htmlFor="add-transport-mode" className="block text-sm font-medium text-navy-700">Transport Mode</label>
          <select id="add-transport-mode" value={transportMode} onChange={(e) => setTransportMode(e.target.value as "metro" | "bus")} className={SELECT_CLASS}>
            <option value="metro">Metro</option>
            <option value="bus">Bus</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Latitude (optional)" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-90 to 90" />
          <Input label="Longitude (optional)" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-180 to 180" />
        </div>
      </div>
      {fieldError && <p role="alert" className="mt-2 text-sm font-medium text-danger">{fieldError}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button loading={saving} onClick={handleSubmit}>Create Station</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// Problem 23 completion — Edit Station form. Only exposes the fields the
// backend actually allows updating (adminService.updateStation's `allowed`
// list) — stationId is intentionally not editable, matching that list.
function EditStationForm({
  station,
  onCancel,
  onSaved,
  onError,
}: {
  station: AdminStation
  onCancel: () => void
  onSaved: (message: string) => void
  onError: (message: string) => void
}) {
  const [stationName, setStationName] = useState(station.stationName)
  const [latitude, setLatitude] = useState(station.latitude?.toString() ?? "")
  const [longitude, setLongitude] = useState(station.longitude?.toString() ?? "")
  const [active, setActive] = useState(station.active !== false)
  const [notes, setNotes] = useState(station.notes ?? "")
  const [fieldError, setFieldError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setFieldError("")
    if (!stationName.trim()) return setFieldError("Station name is required.")

    let lat: number | null | undefined
    let lng: number | null | undefined
    if (latitude.trim()) {
      lat = Number(latitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) return setFieldError("Latitude must be between -90 and 90.")
    } else {
      lat = null
    }
    if (longitude.trim()) {
      lng = Number(longitude)
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) return setFieldError("Longitude must be between -180 and 180.")
    } else {
      lng = null
    }

    setSaving(true)
    try {
      await adminService.updateStation(station.stationId, {
        stationName: stationName.trim(),
        latitude: lat as number | null,
        longitude: lng as number | null,
        active,
        notes: notes.trim() || null,
      } as Partial<AdminStation>)
      onSaved(`Station "${stationName.trim()}" updated.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update station.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3">
        <Input label="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-90 to 90" />
          <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-180 to 180" />
        </div>
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <label className="flex min-h-11 items-center gap-3 text-sm text-navy-800">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-brand-600" />
          Active
        </label>
      </div>
      {fieldError && <p role="alert" className="mt-2 text-sm font-medium text-danger">{fieldError}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button loading={saving} onClick={handleSubmit}>Save Changes</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── Accessibility / Lift status ──────────────────────────────────────────

function AccessibilitySection() {
  const [stations, setStations] = useState<AdminStation[] | null>(null)
  const [error, setError] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  function load() {
    adminService.listStations().then(setStations).catch((err) => setError(err instanceof Error ? err.message : "Failed to load accessibility records."))
  }
  useEffect(load, [])

  async function toggleLift(stationId: string, current: boolean | null) {
    const next = current ? "broken" : "working"
    if (next === "broken" && !confirm("Mark this lift as broken? This will affect accessibility filtering for future route searches.")) return
    setUpdating(stationId)
    try {
      await adminService.setLiftStatus(stationId, next)
      setBanner({
        ok: true,
        text: next === "broken" ? "Lift marked broken. Future accessibility route searches will use this status." : "Lift restored to working.",
      })
      load()
    } catch (err) {
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Failed to update lift status." })
    } finally {
      setUpdating(null)
    }
  }

  if (error) return <ErrorState message={error} />
  if (!stations) return <Loading text="Loading accessibility records…" />
  if (stations.length === 0) return <EmptyState message="No accessibility records." />

  const editing = stations.find((s) => s.stationId === editingId) ?? null

  return (
    <div className="space-y-3">
      <div aria-live="polite">{banner && <ActionBanner ok={banner.ok} text={banner.text} />}</div>

      <Sheet open={editing !== null} onClose={() => setEditingId(null)} title={editing ? `Accessibility: ${editing.stationName}` : "Edit accessibility"}>
        {editing && (
          <EditAccessibilityForm
            station={editing}
            onCancel={() => setEditingId(null)}
            onSaved={(msg) => {
              setBanner({ ok: true, text: msg })
              setEditingId(null)
              load()
            }}
            onError={(msg) => setBanner({ ok: false, text: msg })}
          />
        )}
      </Sheet>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Station accessibility and lift status</caption>
            <thead className="bg-navy-50 text-xs uppercase tracking-wider text-navy-700">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">Station</th>
                <th scope="col" className="px-4 py-3 text-left">Wheelchair</th>
                <th scope="col" className="px-4 py-3 text-left">Ramp</th>
                <th scope="col" className="px-4 py-3 text-left">Lift Status</th>
                <th scope="col" className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {stations.map((s) => (
                <tr key={s.stationId}>
                  <td className="px-4 py-3 font-medium text-navy-900">{s.stationName}</td>
                  {/* Task 4 — never infer "working" from station existing; always the real hasLift value */}
                  <td className="px-4 py-3">{s.wheelchairAccessible ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{s.hasRamp ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.hasLift ? "success" : "danger"}>{s.hasLift ? "WORKING" : "BROKEN"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={s.hasLift ? "danger" : "outline"}
                        loading={updating === s.stationId}
                        onClick={() => toggleLift(s.stationId, s.hasLift)}
                      >
                        Mark {s.hasLift ? "Broken" : "Working"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(s.stationId)}>Edit Accessibility</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Problem 23 completion — Edit Accessibility form. Only exposes fields that
// actually exist on backend/src/models/Accessibility.ts (via adminService's
// `allowed` list in updateAccessibility) — no invented fields. Lift status
// itself is intentionally left to the dedicated Working/Broken toggle above,
// which already has its own confirmation flow.
function EditAccessibilityForm({
  station,
  onCancel,
  onSaved,
  onError,
}: {
  station: AdminStation
  onCancel: () => void
  onSaved: (message: string) => void
  onError: (message: string) => void
}) {
  const [wheelchairAccessible, setWheelchairAccessible] = useState(!!station.wheelchairAccessible)
  const [hasRamp, setHasRamp] = useState(!!station.hasRamp)
  const [hasEscalator, setHasEscalator] = useState(!!station.hasEscalator)
  const [tactilePaving, setTactilePaving] = useState(!!station.tactilePaving)
  const [accessibleToilet, setAccessibleToilet] = useState(!!station.accessibleToilet)
  const [stepFreeEntrance, setStepFreeEntrance] = useState(!!station.stepFreeEntrance)
  const [stepFreePlatform, setStepFreePlatform] = useState(!!station.stepFreePlatform)
  const [notes, setNotes] = useState(station.notes ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      await adminService.updateAccessibility(station.stationId, {
        wheelchairAccessible,
        hasRamp,
        hasEscalator,
        tactilePaving,
        accessibleToilet,
        stepFreeEntrance,
        stepFreePlatform,
        notes: notes.trim() || null,
      } as Partial<AdminStation>)
      onSaved(`Accessibility record for "${station.stationName}" updated.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update accessibility record.")
    } finally {
      setSaving(false)
    }
  }

  const checkboxes: { label: string; value: boolean; set: (v: boolean) => void }[] = [
    { label: "Wheelchair accessible", value: wheelchairAccessible, set: setWheelchairAccessible },
    { label: "Ramp", value: hasRamp, set: setHasRamp },
    { label: "Escalator", value: hasEscalator, set: setHasEscalator },
    { label: "Tactile paving", value: tactilePaving, set: setTactilePaving },
    { label: "Accessible toilet", value: accessibleToilet, set: setAccessibleToilet },
    { label: "Step-free entrance", value: stepFreeEntrance, set: setStepFreeEntrance },
    { label: "Step-free platform", value: stepFreePlatform, set: setStepFreePlatform },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-4 min-[420px]:grid-cols-2">
        {checkboxes.map((cb) => (
          <label key={cb.label} className="flex min-h-11 items-center gap-3 text-sm text-navy-800">
            <input type="checkbox" checked={cb.value} onChange={(e) => cb.set(e.target.checked)} className="h-5 w-5 accent-brand-600" />
            {cb.label}
          </label>
        ))}
      </div>
      <div className="mt-3">
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button loading={saving} onClick={handleSubmit}>Save Changes</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── Crowd ─────────────────────────────────────────────────────────────────

function CrowdSection() {
  const [reports, setReports] = useState<AdminCrowdReport[] | null>(null)
  const [error, setError] = useState("")
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null)

  function load() {
    adminService.listCrowdReports().then(setReports).catch((err) => setError(err instanceof Error ? err.message : "Failed to load crowd reports."))
  }
  useEffect(load, [])

  async function handleDelete(id: string) {
    if (!confirm("Remove this crowd report?")) return
    try {
      await adminService.deleteCrowdReport(id)
      load()
    } catch (err) {
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Failed to remove report." })
    }
  }

  if (error) return <ErrorState message={error} />
  if (!reports) return <Loading text="Loading crowd reports…" />
  if (reports.length === 0) return <EmptyState message="No crowd reports." />

  return (
    <div className="space-y-2">
      <div aria-live="polite">{banner && <ActionBanner ok={banner.ok} text={banner.text} />}</div>
      {reports.map((r) => (
        <Card key={r._id} padding="sm" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-navy-900">
              {r.stationName} <Badge variant={r.crowdLevel === "LOW" ? "success" : r.crowdLevel === "HIGH" ? "danger" : "warning"}>{r.crowdLevel}</Badge>
            </p>
            <p className="mt-1 text-sm text-navy-600">{r.source} · {new Date(r.reportedAt).toLocaleString()}</p>
          </div>
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => handleDelete(r._id)}>Remove</Button>
        </Card>
      ))}
    </div>
  )
}

// ── Feedback ──────────────────────────────────────────────────────────────

function FeedbackSection() {
  const [records, setRecords] = useState<AdminFeedbackRecord[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminService.listFeedback().then(setRecords).catch((err) => setError(err instanceof Error ? err.message : "Failed to load feedback."))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!records) return <Loading text="Loading feedback…" />
  if (records.length === 0) return <EmptyState message="No feedback yet." />

  return (
    <div className="space-y-2">
      {records.map((r) => {
        const user = typeof r.userId === "object" ? r.userId : null
        return (
          <Card key={r._id} padding="sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-navy-900">
                {r.origin.name} → {r.destination.name}
              </p>
              <Badge variant={r.userFeedback.rating >= 4 ? "success" : r.userFeedback.rating <= 2 ? "danger" : "warning"}>
                {r.userFeedback.rating}/5 <Star className="inline h-3 w-3" aria-hidden="true" />
              </Badge>
            </div>
            <p className="mt-1 text-sm text-navy-600">{user?.name ?? "Unknown user"} · {new Date(r.userFeedback.createdAt).toLocaleString()}</p>
            {r.userFeedback.comment && <p className="mt-2 text-sm text-navy-800">{r.userFeedback.comment}</p>}
            {r.userFeedback.issues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.userFeedback.issues.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── Dataset ───────────────────────────────────────────────────────────────

function DatasetSection() {
  const [datasets, setDatasets] = useState<AdminDatasetInfo[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminService.getDataset().then(setDatasets).catch((err) => setError(err instanceof Error ? err.message : "Failed to load dataset info."))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!datasets) return <Loading text="Loading dataset info…" />

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {datasets.map((d) => (
        <Card key={d.dataset}>
          <div className="mb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-navy-600" aria-hidden="true" />
            <h3 className="font-semibold text-navy-900">{d.dataset}</h3>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-navy-900">{d.records}</p>
          <p className="mt-1 text-sm text-navy-600">{d.source}</p>
          <Badge variant="info" className="mt-2">{d.status}</Badge>
        </Card>
      ))}
    </div>
  )
}

// ── Reports (actionable summary of existing data) ──────────────────────────

function ReportsSection() {
  const [stations, setStations] = useState<AdminStation[] | null>(null)
  const [feedback, setFeedback] = useState<AdminFeedbackRecord[] | null>(null)
  const [accessibilityReports, setAccessibilityReports] = useState<AdminAccessibilityReport[] | null>(null)
  const [error, setError] = useState("")
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null)

  function loadAccessibilityReports() {
    adminService.listAccessibilityReports().then(setAccessibilityReports).catch(() => setAccessibilityReports([]))
  }

  useEffect(() => {
    Promise.all([adminService.listStations(), adminService.listFeedback()])
      .then(([s, f]) => {
        setStations(s)
        setFeedback(f)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports."))
    loadAccessibilityReports()
  }, [])

  async function handleStatusChange(reportId: string, status: AdminAccessibilityReport["status"]) {
    try {
      await adminService.updateAccessibilityReportStatus(reportId, status)
      loadAccessibilityReports()
    } catch (err) {
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Failed to update report status." })
    }
  }

  if (error) return <ErrorState message={error} />
  if (!stations || !feedback) return <Loading text="Loading reports…" />

  const brokenLifts = stations.filter((s) => s.hasLift === false)
  const lowRated = feedback.filter((f) => f.userFeedback.rating <= 2)

  if (brokenLifts.length === 0 && lowRated.length === 0 && !accessibilityReports?.length) {
    return <EmptyState message="No reports." />
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite">{banner && <ActionBanner ok={banner.ok} text={banner.text} />}</div>
      {/* Phase 12 — community accessibility reports (accessibilityService.reportIssue()),
          written since Phase 7 and never surfaced in admin until now. */}
      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-navy-900">
          <ShieldAlert className="h-4 w-4 text-brand-600" aria-hidden="true" /> Community accessibility reports
          {accessibilityReports && ` (${accessibilityReports.length})`}
        </h3>
        {!accessibilityReports ? (
          <p className="text-sm text-navy-600">Loading…</p>
        ) : accessibilityReports.length === 0 ? (
          <p className="text-sm text-navy-600">No community accessibility reports submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {accessibilityReports.map((r) => {
              const reporter = typeof r.userId === "object" ? r.userId : null
              return (
                <div key={r._id} className="flex flex-col gap-3 rounded-panel border border-navy-100 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">
                      {r.stationName} <span className="text-navy-500">·</span>{" "}
                      <span className="text-navy-700">{r.issueType.replace(/_/g, " ")}</span>
                    </p>
                    <p className="mt-0.5 break-words text-sm text-navy-600">{r.description}</p>
                    <p className="mt-0.5 text-xs text-navy-600">
                      {reporter?.name ?? "Unknown user"} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        r.status === "resolved" ? "success" : r.status === "rejected" ? "danger" : r.status === "confirmed" ? "warning" : "default"
                      }
                    >
                      {r.status}
                    </Badge>
                    <select
                      aria-label={`Update status for ${r.stationName} report`}
                      value={r.status}
                      onChange={(e) => handleStatusChange(r._id, e.target.value as AdminAccessibilityReport["status"])}
                      className="min-h-9 rounded-control border border-navy-200 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {brokenLifts.length > 0 && (
        <Card>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-navy-900"><AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" /> Broken lift reports ({brokenLifts.length})</h3>
          {brokenLifts.map((s) => <p key={s.stationId} className="text-sm text-navy-700">{s.stationName}</p>)}
        </Card>
      )}
      {lowRated.length > 0 && (
        <Card>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-navy-900"><Star className="h-4 w-4 text-amber-600" aria-hidden="true" /> Low-rated journeys ({lowRated.length})</h3>
          {lowRated.map((f) => <p key={f._id} className="text-sm text-navy-700">{f.origin.name} → {f.destination.name} ({f.userFeedback.rating}/5)</p>)}
        </Card>
      )}
    </div>
  )
}

// ── Shared states ─────────────────────────────────────────────────────────

function ActionBanner({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`rounded-control border px-3.5 py-2.5 text-sm ${ok ? "border-go-100 bg-go-50 text-go-800" : "border-red-200 bg-red-50 text-red-800"}`}>
      {text}
    </div>
  )
}

function StatusBadge({ status }: { status: AdminStation["status"] }) {
  const variant = status === "accessible" ? "success" : status === "partially_accessible" ? "warning" : status === "not_accessible" ? "danger" : "default"
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>
}

function Loading({ text }: { text: string }) {
  return (
    <div role="status" className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <span className="sr-only">{text}</span>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card role="alert">
      <p className="text-sm text-danger">{message}</p>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <EmptyStateBox title={message} />
    </Card>
  )
}

import { Fragment, useEffect, useState } from "react"
import { ShieldAlert, Star, Database, AlertTriangle, Trash2 } from "lucide-react"
import { adminService } from "../services/adminService"
import type { AdminOverview, AdminStation, AdminCrowdReport, AdminFeedbackRecord, AdminDatasetInfo } from "../types/admin"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import LoadingSpinner from "../components/ui/LoadingSpinner"

type Tab = "overview" | "stations" | "accessibility" | "crowd" | "feedback" | "dataset" | "reports"

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "stations", label: "Stations" },
  { id: "accessibility", label: "Accessibility" },
  { id: "crowd", label: "Crowd Reports" },
  { id: "feedback", label: "Feedback" },
  { id: "dataset", label: "Dataset" },
  { id: "reports", label: "Reports" },
]

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview")

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-brand-600" />
        <h1 className="font-display text-2xl font-bold text-navy-900">Admin Dashboard</h1>
        <Badge variant="brand">Admin-managed status — not real-time citywide data</Badge>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-navy-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-brand-500 text-brand-700" : "border-transparent text-navy-500 hover:text-navy-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewSection />}
      {tab === "stations" && <StationsSection />}
      {tab === "accessibility" && <AccessibilitySection />}
      {tab === "crowd" && <CrowdSection />}
      {tab === "feedback" && <FeedbackSection />}
      {tab === "dataset" && <DatasetSection />}
      {tab === "reports" && <ReportsSection />}
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
  if (!data) return <LoadingSpinner text="Loading overview…" />

  const stats: { label: string; value: number | string }[] = [
    { label: "Users", value: data.users },
    { label: "Journeys", value: data.journeys },
    { label: "Saved Routes", value: data.savedRoutes },
    { label: "Saved Destinations", value: data.savedDestinations },
    { label: "Crowd Reports", value: data.crowdReports },
    { label: "Accessibility Records", value: data.accessibilityRecords },
    { label: "Feedback Records", value: data.feedback },
  ]

  return (
    <div className="space-y-4">
      {!data.databaseConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Database not connected — counts show N/A where persistence is required.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} padding="md">
            <p className="text-xs text-navy-500">{s.label}</p>
            <p className="text-2xl font-bold text-navy-900 mt-1">{s.value}</p>
          </Card>
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

  function load() {
    adminService.listStations().then(setStations).catch((err) => setError(err instanceof Error ? err.message : "Failed to load stations."))
  }
  useEffect(load, [])

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
  if (!stations) return <LoadingSpinner text="Loading stations…" />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          onClick={() => {
            setShowAddForm((v) => !v)
            setEditingId(null)
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Station"}
        </Button>
      </div>

      {banner && <ActionBanner ok={banner.ok} text={banner.text} />}

      {showAddForm && (
        <AddStationForm
          onCancel={() => setShowAddForm(false)}
          onCreated={(msg) => {
            setBanner({ ok: true, text: msg })
            setShowAddForm(false)
            load()
          }}
          onError={(msg) => setBanner({ ok: false, text: msg })}
        />
      )}

      {stations.length === 0 ? (
        <EmptyState message="No stations found." />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-navy-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Station</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Active</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {stations.map((s) => (
                  <Fragment key={s.stationId}>
                    <tr>
                      <td className="px-4 py-3 font-medium text-navy-900">{s.stationName}</td>
                      <td className="px-4 py-3 capitalize text-navy-600">{s.transportMode}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">
                        <Badge variant={s.active === false ? "danger" : "success"}>{s.active === false ? "Inactive" : "Active"}</Badge>
                      </td>
                      <td className="px-4 py-3 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(editingId === s.stationId ? null : s.stationId); setShowAddForm(false) }}>
                          {editingId === s.stationId ? "Cancel" : "Edit"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeactivate(s.stationId)}>Deactivate</Button>
                        <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(s.stationId)}>Delete</Button>
                      </td>
                    </tr>
                    {editingId === s.stationId && (
                      <tr>
                        <td colSpan={5} className="px-4 pb-4 bg-navy-50">
                          <EditStationForm
                            station={s}
                            onCancel={() => setEditingId(null)}
                            onSaved={(msg) => {
                              setBanner({ ok: true, text: msg })
                              setEditingId(null)
                              load()
                            }}
                            onError={(msg) => setBanner({ ok: false, text: msg })}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
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
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Station ID" value={stationId} onChange={(e) => setStationId(e.target.value)} placeholder="e.g. mg-road-metro" />
        <Input label="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="e.g. MG Road Metro" />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-navy-700">Transport Mode</label>
          <select
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as "metro" | "bus")}
            className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="metro">Metro</option>
            <option value="bus">Bus</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Latitude (optional)" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-90 to 90" />
          <Input label="Longitude (optional)" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-180 to 180" />
        </div>
      </div>
      {fieldError && <p className="text-xs text-danger font-medium mt-2">{fieldError}</p>}
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" loading={saving} onClick={handleSubmit}>Create Station</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
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
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-90 to 90" />
          <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-180 to 180" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-navy-700">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-700 mt-1">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
      {fieldError && <p className="text-xs text-danger font-medium mt-2">{fieldError}</p>}
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" loading={saving} onClick={handleSubmit}>Save Changes</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
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
  if (!stations) return <LoadingSpinner text="Loading accessibility records…" />
  if (stations.length === 0) return <EmptyState message="No accessibility records." />

  return (
    <div className="space-y-3">
      {banner && <ActionBanner ok={banner.ok} text={banner.text} />}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-left px-4 py-3">Wheelchair</th>
                <th className="text-left px-4 py-3">Ramp</th>
                <th className="text-left px-4 py-3">Lift Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {stations.map((s) => (
                <Fragment key={s.stationId}>
                  <tr>
                    <td className="px-4 py-3 font-medium text-navy-900">{s.stationName}</td>
                    {/* Task 4 — never infer "working" from station existing; always the real hasLift value */}
                    <td className="px-4 py-3">{s.wheelchairAccessible ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">{s.hasRamp ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.hasLift ? "success" : "danger"}>{s.hasLift ? "WORKING" : "BROKEN"}</Badge>
                    </td>
                    <td className="px-4 py-3 flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={s.hasLift ? "danger" : "outline"}
                        loading={updating === s.stationId}
                        onClick={() => toggleLift(s.stationId, s.hasLift)}
                      >
                        Mark {s.hasLift ? "Broken" : "Working"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(editingId === s.stationId ? null : s.stationId)}>
                        {editingId === s.stationId ? "Cancel" : "Edit Accessibility"}
                      </Button>
                    </td>
                  </tr>
                  {editingId === s.stationId && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4 bg-navy-50">
                        <EditAccessibilityForm
                          station={s}
                          onCancel={() => setEditingId(null)}
                          onSaved={(msg) => {
                            setBanner({ ok: true, text: msg })
                            setEditingId(null)
                            load()
                          }}
                          onError={(msg) => setBanner({ ok: false, text: msg })}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
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
    <Card>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {checkboxes.map((cb) => (
          <label key={cb.label} className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={cb.value} onChange={(e) => cb.set(e.target.checked)} />
            {cb.label}
          </label>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <label className="block text-sm font-medium text-navy-700">Notes</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button size="sm" loading={saving} onClick={handleSubmit}>Save Changes</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  )
}

// ── Crowd ─────────────────────────────────────────────────────────────────

function CrowdSection() {
  const [reports, setReports] = useState<AdminCrowdReport[] | null>(null)
  const [error, setError] = useState("")

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
      alert(err instanceof Error ? err.message : "Failed to remove report.")
    }
  }

  if (error) return <ErrorState message={error} />
  if (!reports) return <LoadingSpinner text="Loading crowd reports…" />
  if (reports.length === 0) return <EmptyState message="No crowd reports." />

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <Card key={r._id} padding="sm" className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-navy-900">{r.stationName} <Badge variant={r.crowdLevel === "LOW" ? "success" : r.crowdLevel === "HIGH" ? "danger" : "warning"}>{r.crowdLevel}</Badge></p>
            <p className="text-xs text-navy-500 mt-1">{r.source} · {new Date(r.reportedAt).toLocaleString()}</p>
          </div>
          <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(r._id)}>Remove</Button>
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
  if (!records) return <LoadingSpinner text="Loading feedback…" />
  if (records.length === 0) return <EmptyState message="No feedback yet." />

  return (
    <div className="space-y-2">
      {records.map((r) => {
        const user = typeof r.userId === "object" ? r.userId : null
        return (
          <Card key={r._id} padding="sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy-900">
                {r.origin.name} → {r.destination.name}
              </p>
              <Badge variant={r.userFeedback.rating >= 4 ? "success" : r.userFeedback.rating <= 2 ? "danger" : "warning"}>
                {r.userFeedback.rating}/5 <Star className="w-3 h-3 inline" />
              </Badge>
            </div>
            <p className="text-xs text-navy-500 mt-1">{user?.name ?? "Unknown user"} · {new Date(r.userFeedback.createdAt).toLocaleString()}</p>
            {r.userFeedback.comment && <p className="text-sm text-navy-700 mt-2">{r.userFeedback.comment}</p>}
            {r.userFeedback.issues.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
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
  if (!datasets) return <LoadingSpinner text="Loading dataset info…" />

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {datasets.map((d) => (
        <Card key={d.dataset}>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-navy-500" />
            <h3 className="font-semibold text-navy-900">{d.dataset}</h3>
          </div>
          <p className="text-2xl font-bold text-navy-900">{d.records}</p>
          <p className="text-xs text-navy-500 mt-1">{d.source}</p>
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
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([adminService.listStations(), adminService.listFeedback()])
      .then(([s, f]) => {
        setStations(s)
        setFeedback(f)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports."))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!stations || !feedback) return <LoadingSpinner text="Loading reports…" />

  const brokenLifts = stations.filter((s) => s.hasLift === false)
  const lowRated = feedback.filter((f) => f.userFeedback.rating <= 2)

  if (brokenLifts.length === 0 && lowRated.length === 0) return <EmptyState message="No reports." />

  return (
    <div className="space-y-4">
      {brokenLifts.length > 0 && (
        <Card>
          <h3 className="font-semibold text-navy-900 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-danger" /> Broken lift reports ({brokenLifts.length})</h3>
          {brokenLifts.map((s) => <p key={s.stationId} className="text-sm text-navy-600">{s.stationName}</p>)}
        </Card>
      )}
      {lowRated.length > 0 && (
        <Card>
          <h3 className="font-semibold text-navy-900 mb-2 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Low-rated journeys ({lowRated.length})</h3>
          {lowRated.map((f) => <p key={f._id} className="text-sm text-navy-600">{f.origin.name} → {f.destination.name} ({f.userFeedback.rating}/5)</p>)}
        </Card>
      )}
    </div>
  )
}

// ── Shared states ─────────────────────────────────────────────────────────

function ActionBanner({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`rounded-lg px-3.5 py-2.5 text-sm border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-danger border-red-200"}`}>
      {text}
    </div>
  )
}

function StatusBadge({ status }: { status: AdminStation["status"] }) {
  const variant = status === "accessible" ? "success" : status === "partially_accessible" ? "warning" : status === "not_accessible" ? "danger" : "default"
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card>
      <p className="text-sm text-danger">{message}</p>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <p className="text-sm text-navy-500 text-center py-6">{message}</p>
    </Card>
  )
}

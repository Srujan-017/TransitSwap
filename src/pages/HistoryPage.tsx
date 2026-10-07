import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronUp, Search, Trash2, MapPin, Bookmark, X, Star, CheckCircle, AlertCircle } from "lucide-react"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import { tripService, type JourneyRecord, type SavedDestinationRecord } from "../services/tripService"
import { intelligenceService } from "../services/intelligenceService"
import { formatDate, formatDistance, formatDuration, formatTime } from "../utils/formatters"

// Problem 15 — issue tags. Values must match the backend's FEEDBACK_ISSUE_VALUES
// (trip.routes.ts) exactly, since the backend rejects anything outside that list.
const ISSUE_TAGS: Array<{ value: string; label: string }> = [
  { value: "too_slow", label: "Too slow" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "too_crowded", label: "Too crowded" },
  { value: "too_much_walking", label: "Too much walking" },
  { value: "transfer_problem", label: "Transfer problem" },
  { value: "accessibility_problem", label: "Accessibility problem" },
  { value: "weather_problem", label: "Weather problem" },
  { value: "other", label: "Other" },
]

function issueLabel(value: string): string {
  return ISSUE_TAGS.find((tag) => tag.value === value)?.label ?? value
}

export default function HistoryPage() {
  const [search, setSearch] = useState("")
  const [journeys, setJourneys] = useState<JourneyRecord[]>([])
  const [destinations, setDestinations] = useState<SavedDestinationRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({})
  const [commentMap, setCommentMap] = useState<Record<string, string>>({})
  const [issuesMap, setIssuesMap] = useState<Record<string, string[]>>({})
  // Problem 21 — optional actual journey duration (minutes), kept as raw text
  // so an in-progress/empty input doesn't get coerced to 0.
  const [actualDurationMap, setActualDurationMap] = useState<Record<string, string>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [feedbackResult, setFeedbackResult] = useState<Record<string, { ok: boolean; text: string } | undefined>>({})

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [historyData, destinationData] = await Promise.all([
        tripService.getHistory(),
        tripService.getDestinations(),
      ])
      setJourneys(historyData)
      setDestinations(destinationData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load journey history.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filtered = useMemo(
    () =>
      journeys.filter(
        (journey) =>
          journey.origin.name.toLowerCase().includes(search.toLowerCase()) ||
          journey.destination.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [journeys, search],
  )

  const totalFare = journeys.reduce((sum, journey) => sum + journey.estimatedFare, 0)
  const totalMinutes = Math.round(journeys.reduce((sum, journey) => sum + journey.totalDurationSeconds, 0) / 60)

  async function deleteJourney(id: string) {
    if (!window.confirm("Delete this saved journey?")) return
    setActionMessage("")
    try {
      await tripService.deleteJourney(id)
      setJourneys((current) => current.filter((journey) => journey._id !== id))
      setActionMessage("Journey deleted.")
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not delete journey.")
    }
  }

  async function deleteDestination(id: string) {
    if (!window.confirm("Delete this saved destination?")) return
    setActionMessage("")
    try {
      await tripService.deleteDestination(id)
      setDestinations((current) => current.filter((destination) => destination._id !== id))
      setActionMessage("Saved destination deleted.")
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not delete destination.")
    }
  }

  function toggleIssue(journeyId: string, value: string) {
    setIssuesMap((prev) => {
      const current = prev[journeyId] ?? []
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      return { ...prev, [journeyId]: next }
    })
  }

  async function submitFeedback(journeyId: string) {
    // Problem 15 fix — prevent double-click submissions while a request is in flight.
    if (submittingId === journeyId) return

    const rating = ratingMap[journeyId] || 5
    const comment = (commentMap[journeyId] ?? "").trim()
    const issues = issuesMap[journeyId] ?? []

    // Problem 21 — validate the optional actual-duration input client-side
    // before sending; an empty input sends no field at all (not 0/NaN).
    const rawDuration = (actualDurationMap[journeyId] ?? "").trim()
    let actualDurationMinutes: number | undefined
    if (rawDuration) {
      const parsed = Number(rawDuration)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
        setFeedbackResult((prev) => ({
          ...prev,
          [journeyId]: { ok: false, text: "Enter an actual journey duration between 1 and 1440 minutes." },
        }))
        return
      }
      actualDurationMinutes = parsed
    }

    setSubmittingId(journeyId)
    setFeedbackResult((prev) => ({ ...prev, [journeyId]: undefined }))
    try {
      const result = await intelligenceService.submitJourneyFeedback(journeyId, {
        rating,
        comment: comment || undefined,
        issues: issues.length > 0 ? issues : undefined,
        actualDurationMinutes,
      })
      // Problem 15 fix — show the backend's own honest message (it already says
      // plainly whether TransitDNA actually updated, was already learned, or was
      // unavailable) instead of a hardcoded "TransitDNA updated!" claim.
      setFeedbackResult((prev) => ({ ...prev, [journeyId]: { ok: true, text: result.message } }))
      // Merge the updated journey (now with userFeedback + status: "completed")
      // into local state directly — avoids a jarring full-list reload/collapse
      // while still reflecting exactly what was persisted server-side.
      setJourneys((prev) => prev.map((j) => (j._id === journeyId ? { ...j, ...result.journey } : j)))
    } catch (err) {
      // Problem 15 fix — a failed request must show a real error, never a fake
      // "Feedback recorded." success message.
      setFeedbackResult((prev) => ({
        ...prev,
        [journeyId]: { ok: false, text: err instanceof Error ? err.message : "Could not submit feedback. Please try again." },
      }))
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900">Travel History & Feedback</h1>
        <p className="text-navy-500 text-sm mt-1">Saved journeys, feedback logs, and TransitDNA learning triggers.</p>
      </div>

      <div className="mb-6 flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
        <Bookmark className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-800 leading-relaxed">
          Submitting journey rating & feedback helps TransitSwap refine your TransitDNA learned weights for speed, cost, walking, and reliability.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Saved trips", value: journeys.length.toString() },
          { label: "Total spent", value: `Rs ${totalFare}` },
          { label: "Total travel time", value: formatDuration(totalMinutes) },
          { label: "Saved places", value: destinations.length.toString() },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <p className="text-2xl font-display font-bold text-navy-900">{stat.value}</p>
            <p className="text-xs text-navy-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {destinations.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2 px-1">Saved Destinations</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {destinations.map((destination) => (
              <Card key={destination._id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{destination.name}</p>
                    <p className="text-xs text-navy-500 truncate mt-1">{destination.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteDestination(destination._id)}
                    className="p-1.5 rounded-lg text-navy-400 hover:bg-red-50 hover:text-danger"
                    title="Delete destination"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            placeholder="Search journeys"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-navy-200 bg-white text-sm text-navy-900 placeholder-navy-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <Button variant="outline" onClick={() => void loadData()}>Refresh</Button>
      </div>

      {actionMessage && <p className="mb-4 text-sm text-navy-600">{actionMessage}</p>}

      {loading && (
        <Card>
          <p className="text-sm text-navy-500">Loading journey history...</p>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <p className="text-sm font-semibold text-danger">Could not load history</p>
          <p className="text-sm text-navy-500 mt-1">{error}</p>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-navy-200">
          <MapPin className="w-8 h-8 text-navy-300 mx-auto mb-3" />
          <p className="text-navy-600 font-semibold">No journeys saved yet.</p>
          <p className="text-xs text-navy-400 mt-1">Save a route from Plan Trip to see it here.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((journey) => {
            const expanded = expandedId === journey._id
            const selectedRoute = journey.selectedRoute
            const existingFeedback = journey.userFeedback
            const currentRating = ratingMap[journey._id] ?? existingFeedback?.rating ?? 5
            const currentComment = commentMap[journey._id] ?? existingFeedback?.comment ?? ""
            const currentIssues = issuesMap[journey._id] ?? existingFeedback?.issues ?? []
            const isSubmitting = submittingId === journey._id
            const result = feedbackResult[journey._id]

            return (
              <Card key={journey._id} hover padding="none">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex -space-x-1 flex-shrink-0">
                      {journey.transportModes.map((mode) => (
                        <div key={mode} className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center text-xs font-bold uppercase border-2 border-white shadow-xs">
                          {mode.slice(0, 2)}
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-navy-900 truncate">{journey.origin.name}</p>
                        <ArrowRight className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
                        <p className="text-sm font-semibold text-navy-900 truncate">{journey.destination.name}</p>
                      </div>
                      <p className="text-xs text-navy-500">
                        {formatDate(journey.createdAt)} at {formatTime(journey.createdAt)} - {journey.routeSummary}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <Badge size="sm">{formatDuration(Math.round(journey.totalDurationSeconds / 60))}</Badge>
                        <Badge size="sm">Rs {journey.estimatedFare}</Badge>
                        <Badge size="sm">{formatDistance(journey.totalDistanceMeters)}</Badge>
                        <Badge size="sm">{journey.transferCount} transfers</Badge>
                        {selectedRoute.crowd?.level && (
                          <Badge size="sm" variant={selectedRoute.crowd.level === "LOW" ? "success" : selectedRoute.crowd.level === "HIGH" ? "danger" : "warning"} dot>
                            {selectedRoute.crowd.level} crowd
                          </Badge>
                        )}
                        {selectedRoute.accessibility && (
                          <Badge size="sm" variant={selectedRoute.accessibility.status === "accessible" ? "success" : "warning"}>
                            {selectedRoute.accessibility.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : journey._id)}
                        className="p-2 rounded-lg border border-navy-200 text-navy-500 hover:bg-navy-50"
                        title="Open journey details"
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteJourney(journey._id)}
                        className="p-2 rounded-lg border border-red-200 text-danger hover:bg-red-50"
                        title="Delete journey"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 border-t border-navy-100 pt-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-navy-700 uppercase tracking-wide">Route Segments</p>
                        {journey.routeSegments.map((segment) => (
                          <div key={segment.id} className="rounded-xl bg-navy-50 px-4 py-2.5">
                            <p className="text-sm font-semibold text-navy-800">{segment.instruction}</p>
                            <p className="text-xs text-navy-500 mt-0.5">
                              {segment.from.name} to {segment.to.name} - {formatDistance(segment.distanceMeters)} - {formatDuration(Math.ceil(segment.durationSeconds / 60))}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Problem 15 — Feedback Loop */}
                      {existingFeedback && (
                        <div className="rounded-xl bg-navy-50 border border-navy-150 px-3.5 py-3 space-y-1.5">
                          <p className="text-xs font-bold text-navy-700 uppercase tracking-wide">Your Feedback</p>
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${star <= existingFeedback.rating ? "fill-amber-400 text-amber-500" : "text-navy-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-semibold text-navy-700">{existingFeedback.rating}/5</span>
                            {existingFeedback.createdAt && (
                              <span className="text-[11px] text-navy-400">· submitted {formatDate(existingFeedback.createdAt)}</span>
                            )}
                          </div>
                          {existingFeedback.comment && (
                            <p className="text-xs text-navy-600 italic">"{existingFeedback.comment}"</p>
                          )}
                          {existingFeedback.issues && existingFeedback.issues.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {existingFeedback.issues.map((issue) => (
                                <Badge key={issue} size="sm" variant="warning">{issueLabel(issue)}</Badge>
                              ))}
                            </div>
                          )}
                          {/* Problem 21 — show actual vs. predicted duration when the user provided one */}
                          {typeof existingFeedback.actualDurationMinutes === "number" && (
                            <p className="text-xs text-navy-600">
                              Actual duration: <span className="font-semibold text-navy-800">{Math.round(existingFeedback.actualDurationMinutes)} min</span>
                              {" · "}Predicted: <span className="font-semibold text-navy-800">{Math.round(journey.totalDurationSeconds / 60)} min</span>
                              {" · "}Difference:{" "}
                              <span className="font-semibold text-navy-800">
                                {existingFeedback.actualDurationMinutes - journey.totalDurationSeconds / 60 >= 0 ? "+" : ""}
                                {Math.round(existingFeedback.actualDurationMinutes - journey.totalDurationSeconds / 60)} min
                              </span>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="bg-gradient-to-r from-brand-50 to-sky-50 rounded-xl p-3.5 border border-brand-200 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-navy-900">
                            {existingFeedback ? "Update your feedback" : "How was your actual journey experience?"}
                          </p>
                          <p className="text-[11px] text-navy-600">Rating is required. Comment and issue tags are optional.</p>
                        </div>

                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingMap((prev) => ({ ...prev, [journey._id]: star }))}
                              className="p-1 text-amber-500 hover:scale-110 transition-transform"
                            >
                              <Star className={`w-5 h-5 ${star <= currentRating ? "fill-amber-400 text-amber-500" : "text-navy-300"}`} />
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={currentComment}
                          onChange={(event) =>
                            setCommentMap((prev) => ({ ...prev, [journey._id]: event.target.value.slice(0, 500) }))
                          }
                          placeholder="Optional comment (max 500 characters)…"
                          rows={2}
                          maxLength={500}
                          className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs text-navy-800 placeholder-navy-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                        />

                        <div className="flex flex-wrap gap-1.5">
                          {ISSUE_TAGS.map((tag) => {
                            const active = currentIssues.includes(tag.value)
                            return (
                              <button
                                key={tag.value}
                                type="button"
                                onClick={() => toggleIssue(journey._id, tag.value)}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                  active
                                    ? "bg-brand-600 border-brand-600 text-white"
                                    : "bg-white border-navy-200 text-navy-600 hover:bg-navy-50"
                                }`}
                              >
                                {tag.label}
                              </button>
                            )
                          })}
                        </div>

                        {/* Problem 21 — optional actual journey duration, used to build a
                            real reliability observation. Never required. */}
                        <div>
                          <label className="text-[11px] text-navy-600 block mb-1">
                            Actual journey duration (optional)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={1440}
                              inputMode="numeric"
                              value={actualDurationMap[journey._id] ?? ""}
                              onChange={(event) =>
                                setActualDurationMap((prev) => ({ ...prev, [journey._id]: event.target.value }))
                              }
                              placeholder="e.g. 42"
                              className="w-24 rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-xs text-navy-800 placeholder-navy-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                            />
                            <span className="text-[11px] text-navy-500">minutes</span>
                          </div>
                          <p className="text-[11px] text-navy-500 mt-1">
                            Optional. Enter the approximate time your journey actually took. This helps improve future reliability estimates.
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <Button size="sm" onClick={() => void submitFeedback(journey._id)} loading={isSubmitting}>
                            {existingFeedback ? "Update Feedback" : "Submit Feedback"}
                          </Button>
                          {result && (
                            <div
                              className={`flex items-center gap-1.5 text-xs ${result.ok ? "text-emerald-700" : "text-danger"}`}
                            >
                              {result.ok ? (
                                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              )}
                              <span>{result.text}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

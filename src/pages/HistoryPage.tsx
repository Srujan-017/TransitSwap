import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle, Bookmark, CheckCircle2, ChevronDown, Clock, History as HistoryIcon, MapPin, Navigation, RefreshCw,
  Search, Star, Trash2, Wallet, X,
} from "lucide-react"
import Card from "../components/ui/Card"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import PageHeader from "../components/ui/PageHeader"
import StatTile from "../components/ui/StatTile"
import EmptyState from "../components/ui/EmptyState"
import Photo from "../components/ui/Photo"
import Skeleton from "../components/ui/Skeleton"
import RouteEnds from "../components/ui/RouteEnds"
import { ModeStrip, ModeChips } from "../components/ui/ModeStrip"
import { tripService, type JourneyRecord, type SavedDestinationRecord } from "../services/tripService"
import { intelligenceService } from "../services/intelligenceService"
import { formatDate, formatDistance, formatDuration, formatTime } from "../utils/formatters"
import { groupByDay } from "../utils/groupByDay"
import { stripLeadingEmoji } from "../utils/text"

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
  const groups = useMemo(() => groupByDay(filtered, (j) => j.createdAt), [filtered])

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

  function renderJourney(journey: JourneyRecord) {
    const expanded = expandedId === journey._id
    const selectedRoute = journey.selectedRoute
    // Phase 10 — found by E2E testing: Mongoose auto-vivifies a plain
    // nested object path (journey.userFeedback) the moment ANY of its
    // children has default-like behavior (the `issues` array defaults
    // to [] on every document, with or without real feedback), so
    // `journey.userFeedback` was truthy — as {issues: []} — even for a
    // journey that never received feedback. Checking `rating` (the one
    // field real feedback submission always sets, per
    // journeyService.submitFeedback) is what "has feedback" actually means.
    const existingFeedback = journey.userFeedback?.rating != null ? journey.userFeedback : undefined
    const currentRating = ratingMap[journey._id] ?? existingFeedback?.rating ?? 5
    const currentComment = commentMap[journey._id] ?? existingFeedback?.comment ?? ""
    const currentIssues = issuesMap[journey._id] ?? existingFeedback?.issues ?? []
    const isSubmitting = submittingId === journey._id
    const result = feedbackResult[journey._id]
    const detailsId = `journey-details-${journey._id}`

    return (
      <li key={journey._id}>
        <Card padding="none" className="overflow-hidden">
          <ModeStrip modes={journey.transportModes} />
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <RouteEnds origin={journey.origin.name} destination={journey.destination.name} size="md" />
                <p className="mt-1 text-sm text-navy-500">
                  {formatDate(journey.createdAt)} at {formatTime(journey.createdAt)} - {stripLeadingEmoji(journey.routeSummary)}
                </p>
              </div>

              <div className="-mr-2 -mt-2 flex flex-shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => void deleteJourney(journey._id)}
                  className="flex h-11 w-11 items-center justify-center rounded-control text-navy-500 transition-colors hover:bg-red-50 hover:text-danger"
                  title="Delete journey"
                  aria-label="Delete journey"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : journey._id)}
                  className="flex h-11 w-11 items-center justify-center rounded-control text-navy-600 transition-colors hover:bg-navy-100"
                  title="Open journey details"
                  aria-label={expanded ? "Collapse journey details" : "Open journey details"}
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                >
                  <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <ModeChips modes={journey.transportModes} className="mt-3" />

            <div className="mt-3 flex flex-wrap items-center gap-2">
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
              {existingFeedback ? (
                <Badge size="sm" variant="success" className="ml-auto">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" /> {existingFeedback.rating}/5
                </Badge>
              ) : (
                <Badge size="sm" variant="outline" className="ml-auto">Awaiting feedback</Badge>
              )}
            </div>

            {expanded && (
              <div id={detailsId} className="mt-4 space-y-5 border-t border-navy-100 pt-4">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-600">Route Segments</h3>
                  <ol className="space-y-2">
                    {journey.routeSegments.map((segment) => (
                      <li key={segment.id} className="rounded-control bg-navy-50 px-4 py-2.5">
                        <p className="text-sm font-semibold text-navy-800">{segment.instruction}</p>
                        <p className="mt-0.5 text-xs text-navy-600">
                          {segment.from.name} to {segment.to.name} - {formatDistance(segment.distanceMeters)} - {formatDuration(Math.ceil(segment.durationSeconds / 60))}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Problem 15 — Feedback Loop */}
                {existingFeedback && (
                  <div className="space-y-1.5 rounded-panel border border-navy-100 bg-navy-50 px-4 py-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-navy-600">Your Feedback</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= existingFeedback.rating ? "fill-amber-400 text-amber-500" : "text-navy-300"}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-navy-800">{existingFeedback.rating}/5</span>
                      {existingFeedback.createdAt && (
                        <span className="text-xs text-navy-500">· submitted {formatDate(existingFeedback.createdAt)}</span>
                      )}
                    </div>
                    {existingFeedback.comment && (
                      <p className="text-sm italic text-navy-700">"{existingFeedback.comment}"</p>
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
                      <p className="text-sm text-navy-700">
                        Actual duration: <span className="font-semibold text-navy-900">{Math.round(existingFeedback.actualDurationMinutes)} min</span>
                        {" · "}Predicted: <span className="font-semibold text-navy-900">{Math.round(journey.totalDurationSeconds / 60)} min</span>
                        {" · "}Difference:{" "}
                        <span className="font-semibold text-navy-900">
                          {existingFeedback.actualDurationMinutes - journey.totalDurationSeconds / 60 >= 0 ? "+" : ""}
                          {Math.round(existingFeedback.actualDurationMinutes - journey.totalDurationSeconds / 60)} min
                        </span>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-4 rounded-panel border border-brand-100 bg-brand-50/60 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">
                      {existingFeedback ? "Update your feedback" : "How was your actual journey experience?"}
                    </h3>
                    <p className="text-xs text-navy-600">Rating is required. Comment and issue tags are optional.</p>
                  </div>

                  <div role="group" aria-label="Journey rating" className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} out of 5 stars`}
                        aria-pressed={star === currentRating}
                        onClick={() => setRatingMap((prev) => ({ ...prev, [journey._id]: star }))}
                        className="flex h-11 w-11 items-center justify-center rounded-control transition-transform hover:scale-110 focus-visible:scale-110"
                      >
                        <Star className={`h-7 w-7 ${star <= currentRating ? "fill-amber-400 text-amber-500" : "text-navy-300"}`} aria-hidden="true" />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={currentComment}
                    onChange={(event) =>
                      setCommentMap((prev) => ({ ...prev, [journey._id]: event.target.value.slice(0, 500) }))
                    }
                    placeholder="Optional comment (max 500 characters)…"
                    aria-label="Comment"
                    rows={2}
                    maxLength={500}
                    className="w-full resize-none rounded-field border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 placeholder-navy-500 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />

                  <div className="flex flex-wrap gap-2">
                    {ISSUE_TAGS.map((tag) => {
                      const active = currentIssues.includes(tag.value)
                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleIssue(journey._id, tag.value)}
                          aria-pressed={active}
                          className={`min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                            active
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
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
                    <label htmlFor={`actual-${journey._id}`} className="mb-1 block text-sm font-medium text-navy-700">
                      Actual journey duration (optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`actual-${journey._id}`}
                        type="number"
                        min={1}
                        max={1440}
                        inputMode="numeric"
                        value={actualDurationMap[journey._id] ?? ""}
                        onChange={(event) =>
                          setActualDurationMap((prev) => ({ ...prev, [journey._id]: event.target.value }))
                        }
                        placeholder="e.g. 42"
                        className="h-11 w-28 rounded-field border border-navy-200 bg-white px-3 text-sm text-navy-900 placeholder-navy-500 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <span className="text-sm text-navy-600">minutes</span>
                    </div>
                    <p className="mt-1 text-xs text-navy-600">
                      Optional. Enter the approximate time your journey actually took. This helps improve future reliability estimates.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button onClick={() => void submitFeedback(journey._id)} loading={isSubmitting}>
                      {existingFeedback ? "Update Feedback" : "Submit Feedback"}
                    </Button>
                    <div aria-live="polite">
                      {result && (
                        <div className={`flex items-center gap-1.5 text-sm ${result.ok ? "text-go-800" : "text-danger"}`}>
                          {result.ok ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span>{result.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </li>
    )
  }

  const nothingSaved = !loading && !error && journeys.length === 0
  const nothingMatches = !loading && !error && journeys.length > 0 && filtered.length === 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Your journeys"
        title="Travel History & Feedback"
        subtitle="Saved journeys, feedback logs, and TransitDNA learning triggers."
      />

      <div className="mb-6 flex items-start gap-3 rounded-panel bg-brand-50 px-4 py-3">
        <Bookmark className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-brand-900">
          Submitting journey rating & feedback helps TransitSwap refine your TransitDNA learned weights for speed, cost, walking, and reliability.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile tone="brand" icon={<HistoryIcon className="h-4 w-4" />} label="Saved trips" value={journeys.length.toString()} />
        <StatTile tone="go" icon={<Wallet className="h-4 w-4" />} label="Total spent" value={`Rs ${totalFare}`} />
        <StatTile tone="warn" icon={<Clock className="h-4 w-4" />} label="Total travel time" value={formatDuration(totalMinutes)} />
        <StatTile icon={<MapPin className="h-4 w-4" />} label="Saved places" value={destinations.length.toString()} />
      </div>

      {destinations.length > 0 && (
        <section className="mb-8" aria-labelledby="saved-destinations-heading">
          <h2 id="saved-destinations-heading" className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-navy-600">Saved Destinations</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {destinations.map((destination) => (
              <li key={destination._id}>
                <Card padding="none" className="flex items-center gap-3 py-3 pl-4 pr-2">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-700" aria-hidden="true">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">{destination.name}</p>
                    <p className="truncate text-xs text-navy-600">{destination.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteDestination(destination._id)}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-control text-navy-500 transition-colors hover:bg-red-50 hover:text-danger"
                    title="Delete destination"
                    aria-label={`Delete destination ${destination.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-500" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search journeys"
            aria-label="Search journeys"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-full border border-navy-200 bg-white pl-10 pr-4 text-sm text-navy-900 placeholder-navy-500 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <Button variant="outline" onClick={() => void loadData()} icon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
      </div>

      <div aria-live="polite">
        {actionMessage && <p className="mb-4 text-sm text-navy-700">{actionMessage}</p>}
      </div>

      {loading && (
        <div className="space-y-3" role="status" aria-label="Loading journey history">
          {[0, 1, 2].map((i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-4 w-1/2" />
              <Skeleton className="mt-4 h-6 w-2/3" />
            </Card>
          ))}
          <p className="sr-only">Loading journey history...</p>
        </div>
      )}

      {!loading && error && (
        <Card role="alert">
          <p className="text-sm font-semibold text-danger">Could not load history</p>
          <p className="mt-1 text-sm text-navy-600">{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void loadData()}>Try again</Button>
        </Card>
      )}

      {nothingSaved && (
        <Card padding="none" className="overflow-hidden">
          <div className="h-36 sm:h-44">
            <Photo id="green-line-train" decorative sizes="(min-width: 1024px) 64rem, 100vw" className="h-full w-full object-cover" />
          </div>
          <EmptyState
            icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
            title="No journeys saved yet."
            description="Save a route from Plan Trip to see it here."
            action={
              <Link to="/plan">
                <Button variant="go" icon={<Navigation className="h-4 w-4" />}>Plan a trip</Button>
              </Link>
            }
          />
        </Card>
      )}

      {nothingMatches && (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6" aria-hidden="true" />}
            title="No journeys match your search."
            description={`Nothing from or to "${search}". Try a shorter name.`}
            action={<Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>}
          />
        </Card>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`day-${group.key}`}>
              <h2 id={`day-${group.key}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-navy-600">
                {group.label}
              </h2>
              <ul className="space-y-3">{group.items.map(renderJourney)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from "react"
import { User, Shield, CheckCircle2, AlertTriangle, RefreshCw, Dna } from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import { intelligenceService } from "../services/intelligenceService"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import ProfileIcon from "../components/ui/ProfileIcon"
import ModeIcon from "../components/ui/ModeIcon"
import PageHeader from "../components/ui/PageHeader"
import Avatar from "../components/ui/Avatar"
import WeightBar from "../components/ui/WeightBar"
import type { AccessibilityProfile, UserPreferences } from "../types"

const PROFILES = [
  { id: "standard", label: "Standard", desc: "Regular commuter" },
  { id: "wheelchair", label: "Wheelchair", desc: "Requires accessible routes" },
  { id: "senior", label: "Senior Citizen", desc: "Prefers minimal stairs" },
  { id: "pregnant", label: "Pregnant", desc: "Needs accessible & comfortable routes" },
  { id: "stroller", label: "Stroller", desc: "Requires ramp access" },
  { id: "luggage", label: "Heavy Luggage", desc: "Avoids stairs and long walks" },
  { id: "reduced_mobility", label: "Reduced Mobility", desc: "Requires step-free access & elevators" },
]

// Phase 4 fix — each array's `id` is typed to match the corresponding
// UserPreferences field exactly, so setForm(...) below can assign it without
// widening to plain `string`. Previously these were untyped, form's own
// fields were declared as `string`, and intelligenceService.updatePreferences(
// form.*) failed tsc with TS2322 on all 4 fields — `npm run build` never
// caught it because `vite build` doesn't type-check.
const TRANSPORT_MODES: Array<{ id: UserPreferences["preferredMode"]; label: string }> = [
  { id: "any", label: "Any mode" },
  { id: "metro", label: "Metro preferred" },
  { id: "bus", label: "Bus preferred" },
  { id: "auto", label: "Auto preferred" },
]

const WALK_TOLERANCE: Array<{ id: UserPreferences["walkingTolerance"]; label: string; desc: string }> = [
  { id: "low", label: "Low", desc: "< 300 m" },
  { id: "medium", label: "Medium", desc: "300–800 m" },
  { id: "high", label: "High", desc: "> 800 m" },
]

const BUDGET_PREFERENCE: Array<{ id: UserPreferences["budgetPreference"]; label: string; desc: string }> = [
  { id: "cheapest", label: "Cheapest", desc: "Prefer lower fares." },
  { id: "balanced", label: "Balanced", desc: "Balance cost, time and comfort." },
  { id: "comfort", label: "Comfort", desc: "Prefer lower crowd and better weather comfort." },
]

const PRIORITIZE_OPTIONS: Array<{ id: UserPreferences["prioritize"]; label: string }> = [
  { id: "speed", label: "Speed" },
  { id: "reliability", label: "Reliability" },
  { id: "comfort", label: "Comfort" },
  { id: "accessibility", label: "Accessibility" },
]

// A selectable option: filled brand blue with white text when chosen, a quiet outlined tile otherwise.
const optionLook = (on: boolean) =>
  `relative transition-colors ${on ? "bg-brand-500 text-white shadow-card" : "bg-navy-50 text-navy-800 ring-1 ring-inset ring-navy-200 hover:bg-navy-100"}`

export default function ProfilePage() {
  const { user, updateUser } = useAuthContext()

  const [form, setForm] = useState<{
    name: string
    email: string
    accessibilityProfile: AccessibilityProfile
    preferredMode: UserPreferences["preferredMode"]
    walkingTolerance: UserPreferences["walkingTolerance"]
    budgetPreference: UserPreferences["budgetPreference"]
    prioritize: UserPreferences["prioritize"]
  }>({
    name: user?.name || "Commuter",
    email: user?.email || "user@example.com",
    accessibilityProfile: (user?.accessibilityProfile as AccessibilityProfile) || "standard",
    preferredMode: user?.preferences?.preferredMode || "any",
    walkingTolerance: user?.preferences?.walkingTolerance || "medium",
    budgetPreference: user?.preferences?.budgetPreference || "balanced",
    prioritize: user?.preferences?.prioritize || "reliability",
  })

  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")
  // Phase 4 fix (B11) — the catch block below used to set the SAME
  // savedMessage ("Preferences updated in local session.") on a genuine
  // save failure, rendered with the same green checkmark as a real success.
  // Nothing was actually persisted, but the user was told it was. This flag
  // lets the message report what actually happened.
  const [savedMessageIsError, setSavedMessageIsError] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSavedMessage("")
    setSavedMessageIsError(false)
    try {
      // Call backend endpoints to update profile & preferences, then merge both
      // returned user objects so the local AuthContext state never goes stale
      // (each call returns the full user document as of that write).
      const profileResult = await intelligenceService.updateProfile({
        name: form.name,
        accessibilityProfile: form.accessibilityProfile,
      })

      const preferencesResult = await intelligenceService.updatePreferences({
        preferredMode: form.preferredMode,
        walkingTolerance: form.walkingTolerance,
        budgetPreference: form.budgetPreference,
        prioritize: form.prioritize,
      })

      const mergedUser = { ...profileResult, ...preferencesResult }
      if (updateUser && mergedUser) {
        updateUser(mergedUser)
      }
      setSavedMessage("Preferences saved successfully to backend & TransitDNA!")
    } catch (err) {
      setSavedMessageIsError(true)
      setSavedMessage(
        err instanceof Error
          ? `Could not save preferences: ${err.message}`
          : "Could not save preferences. Please try again.",
      )
    } finally {
      setSaving(false)
      setTimeout(() => setSavedMessage(""), 4000)
    }
  }

  const handleResetDna = async () => {
    setResetting(true)
    setSavedMessageIsError(false)
    try {
      const resetUser = await intelligenceService.resetTransitDna()
      if (updateUser && resetUser) {
        updateUser(resetUser)
      }
      setSavedMessage("TransitDNA preference weights reset to baseline defaults!")
    } catch (err) {
      // Phase 12 fix — this used to report "TransitDNA reset in local mode."
      // on a genuine failure, rendered with the same success styling as a
      // real reset (the same class of dishonesty B11 fixed for handleSave
      // above). Nothing was actually reset, but the user was told it was.
      setSavedMessageIsError(true)
      setSavedMessage(
        err instanceof Error ? `Could not reset TransitDNA: ${err.message}` : "Could not reset TransitDNA. Please try again.",
      )
    } finally {
      setResetting(false)
      setTimeout(() => setSavedMessage(""), 4000)
    }
  }

  const weights = user?.transitDNA?.learnedWeights || {
    time: 0.25,
    cost: 0.15,
    walking: 0.2,
    reliability: 0.25,
    accessibility: 0.15,
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Your account"
        title="Profile & Mobility Preferences"
        subtitle="Personalize your TransitSwap travel profile and manage your adaptive TransitDNA learned weights."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="text-center">
            <Avatar name={form.name || "Commuter"} size="lg" className="mx-auto !h-20 !w-20 !text-3xl" />
            <p className="mt-4 font-display font-bold text-navy-900">{form.name}</p>
            <p className="mt-0.5 break-all text-sm text-navy-600">{form.email}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge variant="info">
                <ProfileIcon id={form.accessibilityProfile} className="h-3.5 w-3.5" />
                {PROFILES.find((p) => p.id === form.accessibilityProfile)?.label}
              </Badge>
            </div>
          </Card>

          {/* TransitDNA Status & Weights */}
          <Card className="space-y-3 border-brand-100 bg-brand-50">
            <div className="flex items-center gap-2">
              <Dna className="h-5 w-5 text-brand-700" aria-hidden="true" />
              <h2 className="font-display text-sm font-bold text-brand-900">TransitDNA Learned Weights</h2>
            </div>
            <p className="text-sm leading-relaxed text-brand-900">
              Dynamically refined based on your actual choices and journey feedback.
            </p>
            <div className="space-y-3 border-t border-brand-100 pt-3">
              <WeightBar label="Speed" value={weights.time} barClass="bg-brand-500" />
              <WeightBar label="Cost" value={weights.cost} barClass="bg-go-600" />
              <WeightBar label="Walking" value={weights.walking} barClass="bg-bus-600" />
              <WeightBar label="Reliability" value={weights.reliability} barClass="bg-navy-700" />
              <WeightBar label="Accessibility" value={weights.accessibility} barClass="bg-auto-500" />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              loading={resetting}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => void handleResetDna()}
            >
              Reset Learned Weights
            </Button>
          </Card>
        </div>

        {/* Main Form */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-navy-900">
              <User className="h-5 w-5 text-brand-600" aria-hidden="true" /> Personal Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium text-navy-700">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="min-h-11 w-full rounded-control border border-navy-200 bg-white px-4 py-2.5 text-sm text-navy-900 transition-colors hover:border-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="profile-email" className="text-sm font-medium text-navy-700">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  readOnly
                  aria-describedby="profile-email-note"
                  className="min-h-11 w-full cursor-not-allowed rounded-control border border-navy-100 bg-navy-100 px-4 py-2.5 text-sm text-navy-700"
                />
                <p id="profile-email-note" className="text-xs text-navy-600">Your email is your sign-in and cannot be changed here.</p>
              </div>
            </div>
          </Card>

          {/* Accessibility Profile */}
          <Card>
            <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-navy-900">
              <Shield className="h-5 w-5 text-brand-600" aria-hidden="true" /> Accessibility Profile
            </h2>
            <p className="mb-4 text-sm text-navy-600">
              Routes violating your mobility constraints will be strictly filtered out.
            </p>
            <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
              {PROFILES.map((p) => {
                const on = form.accessibilityProfile === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm((f) => ({ ...f, accessibilityProfile: p.id as AccessibilityProfile }))}
                    className={`flex min-h-24 flex-col items-start gap-1 rounded-panel p-3.5 text-left ${optionLook(on)}`}
                  >
                    {on && <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-white" aria-hidden="true" />}
                    <ProfileIcon id={p.id} className={`h-6 w-6 ${on ? "text-white" : "text-navy-700"}`} />
                    <span className="font-display text-sm font-semibold">{p.label}</span>
                    <span className={`text-xs ${on ? "text-white" : "text-navy-600"}`}>{p.desc}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Travel Preferences */}
          <Card>
            <h2 className="mb-4 font-display font-semibold text-navy-900">Travel Preferences</h2>
            <div className="divide-y divide-navy-100">
              <fieldset className="pb-5">
                <legend className="mb-2.5 text-sm font-medium text-navy-700">Preferred Transport Mode</legend>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={form.preferredMode === m.id}
                      onClick={() => setForm((f) => ({ ...f, preferredMode: m.id }))}
                      className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${optionLook(form.preferredMode === m.id)}`}
                    >
                      <ModeIcon mode={m.id} className="h-4 w-4" /> {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="py-5">
                <legend className="mb-2.5 text-sm font-medium text-navy-700">Walking Tolerance</legend>
                <div className="grid grid-cols-3 gap-2">
                  {WALK_TOLERANCE.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      aria-pressed={form.walkingTolerance === w.id}
                      onClick={() => setForm((f) => ({ ...f, walkingTolerance: w.id }))}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-panel px-2 py-2.5 text-center text-sm ${optionLook(form.walkingTolerance === w.id)}`}
                    >
                      <span className="font-semibold">{w.label}</span>
                      <span className={`mt-0.5 text-xs ${form.walkingTolerance === w.id ? "text-white" : "text-navy-600"}`}>{w.desc}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="py-5">
                <legend className="mb-2.5 text-sm font-medium text-navy-700">Budget Preference</legend>
                <div className="grid grid-cols-3 gap-2">
                  {BUDGET_PREFERENCE.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={form.budgetPreference === b.id}
                      onClick={() => setForm((f) => ({ ...f, budgetPreference: b.id }))}
                      className={`flex min-h-14 min-w-0 flex-col items-center rounded-panel px-2 py-2.5 text-center text-sm sm:px-4 ${optionLook(form.budgetPreference === b.id)}`}
                    >
                      <span className="flex flex-wrap items-center justify-center gap-x-1.5 font-semibold"><ProfileIcon id={b.id} className="h-4 w-4" /> {b.label}</span>
                      <span className={`mt-0.5 text-xs ${form.budgetPreference === b.id ? "text-white" : "text-navy-600"}`}>{b.desc}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="pt-5">
                <legend className="mb-2.5 text-sm font-medium text-navy-700">Primary Priority</legend>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={form.prioritize === opt.id}
                      onClick={() => setForm((f) => ({ ...f, prioritize: opt.id }))}
                      className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ${optionLook(form.prioritize === opt.id)}`}
                    >
                      <ProfileIcon id={opt.id} className="h-4 w-4" /> {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </Card>

          {/* Stays in reach while the long form scrolls (above the phone's tab bar). */}
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center gap-3 rounded-panel border border-navy-100 bg-white/95 p-3 shadow-float backdrop-blur md:bottom-4">
            <Button onClick={() => void handleSave()} size="lg" loading={saving}>
              Save Mobility Profile
            </Button>
            <div aria-live="polite" className="min-w-0 flex-1">
              {savedMessage && (
                <span className={`flex items-start gap-1.5 text-sm font-medium ${savedMessageIsError ? "text-danger" : "text-go-800"}`}>
                  {savedMessageIsError ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  )}{" "}
                  <span>{savedMessage}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

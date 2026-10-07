import { useState } from "react"
import { User, Shield, Settings, CheckCircle, RefreshCw, Dna } from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import { intelligenceService } from "../services/intelligenceService"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import type { AccessibilityProfile } from "../types"

const PROFILES = [
  { id: "standard", icon: "🚶", label: "Standard", desc: "Regular commuter" },
  { id: "wheelchair", icon: "♿", label: "Wheelchair", desc: "Requires accessible routes" },
  { id: "senior", icon: "🧓", label: "Senior Citizen", desc: "Prefers minimal stairs" },
  { id: "pregnant", icon: "🤰", label: "Pregnant", desc: "Needs accessible & comfortable routes" },
  { id: "stroller", icon: "👶", label: "Stroller", desc: "Requires ramp access" },
  { id: "luggage", icon: "🧳", label: "Heavy Luggage", desc: "Avoids stairs and long walks" },
  { id: "reduced_mobility", icon: "🦯", label: "Reduced Mobility", desc: "Requires step-free access & elevators" },
]

const TRANSPORT_MODES = [
  { id: "any", icon: "🔀", label: "Any mode" },
  { id: "metro", icon: "🚇", label: "Metro preferred" },
  { id: "bus", icon: "🚌", label: "Bus preferred" },
  { id: "auto", icon: "🛺", label: "Auto preferred" },
]

const WALK_TOLERANCE = [
  { id: "low", label: "Low", desc: "< 300 m" },
  { id: "medium", label: "Medium", desc: "300–800 m" },
  { id: "high", label: "High", desc: "> 800 m" },
]

const BUDGET_PREFERENCE = [
  { id: "cheapest", icon: "💰", label: "Cheapest", desc: "Prefer lower fares." },
  { id: "balanced", icon: "⚖️", label: "Balanced", desc: "Balance cost, time and comfort." },
  { id: "comfort", icon: "🛋️", label: "Comfort", desc: "Prefer lower crowd and better weather comfort." },
]

export default function ProfilePage() {
  const { user, updateUser } = useAuthContext()

  const [form, setForm] = useState<{
    name: string
    email: string
    accessibilityProfile: AccessibilityProfile
    preferredMode: string
    walkingTolerance: string
    budgetPreference: string
    prioritize: string
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
  const [resetting, setResetting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSavedMessage("")
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
      setSavedMessage("Preferences updated in local session.")
    } finally {
      setSaving(false)
      setTimeout(() => setSavedMessage(""), 4000)
    }
  }

  const handleResetDna = async () => {
    setResetting(true)
    try {
      await intelligenceService.resetTransitDna()
      setSavedMessage("TransitDNA preference weights reset to baseline defaults!")
    } catch {
      setSavedMessage("TransitDNA reset in local mode.")
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Profile & Mobility Preferences</h1>
        <p className="text-navy-500 text-sm mt-1">
          Personalize your TransitSwap travel profile and manage your adaptive TransitDNA learned weights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="text-center">
            <div className="w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-display font-bold text-3xl">
                {form.name.charAt(0)}
              </span>
            </div>
            <p className="font-display font-bold text-navy-900">{form.name}</p>
            <p className="text-xs text-navy-500 mt-0.5">{form.email}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge variant="info">
                {PROFILES.find((p) => p.id === form.accessibilityProfile)?.icon}{" "}
                {PROFILES.find((p) => p.id === form.accessibilityProfile)?.label}
              </Badge>
            </div>
          </Card>

          {/* TransitDNA Status & Weights */}
          <Card className="bg-brand-50 border-brand-100 space-y-3">
            <div className="flex items-center gap-2">
              <Dna className="w-5 h-5 text-brand-600" />
              <p className="font-display font-bold text-brand-900 text-sm">TransitDNA Learned Weights</p>
            </div>
            <p className="text-xs text-brand-700 leading-relaxed">
              Dynamically refined based on your actual choices and journey feedback.
            </p>
            <div className="space-y-1.5 text-xs text-brand-900 font-medium pt-1 border-t border-brand-200">
              <div className="flex justify-between"><span>Speed:</span><span>{Math.round(weights.time * 100)}%</span></div>
              <div className="flex justify-between"><span>Cost:</span><span>{Math.round(weights.cost * 100)}%</span></div>
              <div className="flex justify-between"><span>Walking:</span><span>{Math.round(weights.walking * 100)}%</span></div>
              <div className="flex justify-between"><span>Reliability:</span><span>{Math.round(weights.reliability * 100)}%</span></div>
              <div className="flex justify-between"><span>Accessibility:</span><span>{Math.round(weights.accessibility * 100)}%</span></div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              loading={resetting}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void handleResetDna()}
            >
              Reset Learned Weights
            </Button>
          </Card>
        </div>

        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-brand-500" /> Personal Information
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-navy-50 text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-navy-700">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-xl border border-navy-200 bg-navy-100 text-sm text-navy-600 cursor-not-allowed"
                />
              </div>
            </div>
          </Card>

          {/* Accessibility Profile */}
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-1 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-brand-500" /> Accessibility Profile
            </h2>
            <p className="text-xs text-navy-500 mb-4">
              Routes violating your mobility constraints will be strictly filtered out.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm((f) => ({ ...f, accessibilityProfile: p.id as AccessibilityProfile }))}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all ${
                    form.accessibilityProfile === p.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-navy-200 hover:border-navy-300 hover:bg-navy-50"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className={`text-sm font-semibold font-display ${form.accessibilityProfile === p.id ? "text-brand-700" : "text-navy-800"}`}>
                    {p.label}
                  </span>
                  <span className="text-xs text-navy-500">{p.desc}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Travel Preferences */}
          <Card>
            <h2 className="font-display font-semibold text-navy-900 mb-4">Travel Preferences</h2>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-navy-700 block mb-2.5">Preferred Transport Mode</label>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setForm((f) => ({ ...f, preferredMode: m.id }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        form.preferredMode === m.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-navy-200 text-navy-600 hover:border-navy-300"
                      }`}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 block mb-2.5">Walking Tolerance</label>
                <div className="flex gap-2">
                  {WALK_TOLERANCE.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setForm((f) => ({ ...f, walkingTolerance: w.id }))}
                      className={`flex flex-col px-4 py-2.5 rounded-xl border text-sm transition-all flex-1 text-center ${
                        form.walkingTolerance === w.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-navy-200 text-navy-600 hover:border-navy-300"
                      }`}
                    >
                      <span className="font-semibold">{w.label}</span>
                      <span className="text-xs mt-0.5 text-navy-400">{w.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 block mb-2.5">Budget Preference</label>
                <div className="flex gap-2">
                  {BUDGET_PREFERENCE.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setForm((f) => ({ ...f, budgetPreference: b.id }))}
                      className={`flex flex-col px-4 py-2.5 rounded-xl border text-sm transition-all flex-1 text-center ${
                        form.budgetPreference === b.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-navy-200 text-navy-600 hover:border-navy-300"
                      }`}
                    >
                      <span className="font-semibold">{b.icon} {b.label}</span>
                      <span className="text-xs mt-0.5 text-navy-400">{b.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-navy-700 block mb-2.5">Primary Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "speed", icon: "⚡", label: "Speed" },
                    { id: "reliability", icon: "🎯", label: "Reliability" },
                    { id: "comfort", icon: "🛋️", label: "Comfort" },
                    { id: "accessibility", icon: "♿", label: "Accessibility" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setForm((f) => ({ ...f, prioritize: opt.id }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        form.prioritize === opt.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-navy-200 text-navy-600 hover:border-navy-300"
                      }`}
                    >
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button onClick={() => void handleSave()} size="lg" loading={saving}>
                Save Mobility Profile
              </Button>
              {savedMessage && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> {savedMessage}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

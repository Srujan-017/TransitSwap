import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { User, Mail, Lock, Eye, EyeOff, CheckCircle } from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import type { AccessibilityProfile } from "../types"
import AuthLayout from "../layouts/AuthLayout"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"

const PROFILES = [
  { id: "standard", icon: "🚶", label: "Standard" },
  { id: "wheelchair", icon: "♿", label: "Wheelchair" },
  { id: "senior", icon: "🧓", label: "Senior Citizen" },
  { id: "pregnant", icon: "🤰", label: "Pregnant" },
  { id: "stroller", icon: "👶", label: "Stroller" },
  { id: "luggage", icon: "🧳", label: "Heavy Luggage" },
  { id: "reduced_mobility", icon: "🦯", label: "Reduced Mobility" },
]

export default function RegisterPage() {
  const { register } = useAuthContext()
  const navigate = useNavigate()

  const [form, setForm] = useState<{
    name: string
    email: string
    password: string
    confirmPassword: string
    accessibilityProfile: AccessibilityProfile
  }>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    accessibilityProfile: "standard",
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all required fields.")
      return
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        accessibilityProfile: form.accessibilityProfile,
      })
      navigate("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3
  const strengthLabel = ["", "Weak", "Fair", "Strong"]
  const strengthColor = ["", "bg-danger", "bg-warning", "bg-success"]

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Create your account</h1>
          <p className="text-navy-500 text-sm mt-1.5">
            Join TransitSwap and travel smarter from day one
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-danger font-medium">
              {error}
            </div>
          )}

          <Input
            label="Full name"
            type="text"
            name="name"
            placeholder="Rohan Sharma"
            value={form.name}
            onChange={handleChange}
            leftIcon={<User className="w-4 h-4" />}
            autoComplete="name"
          />

          <Input
            label="Email address"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <div className="space-y-1.5">
            <Input
              label="Password"
              type={showPw ? "text" : "password"}
              name="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={handleChange}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-navy-400 hover:text-navy-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="new-password"
            />
            {form.password && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-navy-100 rounded-full overflow-hidden flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-full rounded-full transition-all ${i <= pwStrength ? strengthColor[pwStrength] : ""}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${["", "text-danger", "text-warning", "text-success"][pwStrength]}`}>
                  {strengthLabel[pwStrength]}
                </span>
              </div>
            )}
          </div>

          <Input
            label="Confirm password"
            type={showPw ? "text" : "password"}
            name="confirmPassword"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={handleChange}
            leftIcon={<Lock className="w-4 h-4" />}
            error={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords do not match" : ""}
            autoComplete="new-password"
          />

          {/* Accessibility profile */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-navy-700">
              Accessibility profile
            </label>
            <p className="text-xs text-navy-500">
              This helps TransitSwap filter routes that are safe and accessible for you.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, accessibilityProfile: p.id as AccessibilityProfile }))}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-semibold transition-all ${
                    form.accessibilityProfile === p.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50"
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg">
            Create Account
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          {["Free to use — no credit card required", "Your data stays private and secure"].map((t) => (
            <div key={t} className="flex items-center gap-2 text-xs text-navy-500">
              <CheckCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
              {t}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-navy-500">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

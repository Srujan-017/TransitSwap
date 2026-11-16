import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff, CircleAlert } from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import AuthLayout from "../layouts/AuthLayout"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"

export default function LoginPage() {
  const { login } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || "/dashboard"

  const [form, setForm] = useState({ email: "", password: "" })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError("Please fill in all fields.")
      return
    }
    setLoading(true)
    try {
      await login(form)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Welcome back</h1>
          <p className="text-navy-500 text-sm mt-1.5">
            Sign in to continue to your TransitSwap account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-control bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

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

          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw} className="text-navy-400 hover:text-navy-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            autoComplete="current-password"
          />

          <Button type="submit" loading={loading} fullWidth size="lg">
            Sign In
          </Button>
        </form>

        {/* Demo hint */}
        <div className="rounded-panel bg-brand-50 px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-brand-700">Demo credentials</p>
          <p className="text-xs text-brand-700">
            Email: <code className="rounded bg-brand-100 px-1">demo@transitswap.app</code>
            &nbsp;· Password: <code className="rounded bg-brand-100 px-1">Demo@1234</code>
          </p>
          <button
            type="button"
            onClick={() => { setForm({ email: "demo@transitswap.app", password: "Demo@1234" }); setError("") }}
            className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Fill in the demo account
          </button>
        </div>

        <p className="text-center text-sm text-navy-500">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

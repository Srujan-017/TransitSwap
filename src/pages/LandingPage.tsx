import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Bus,
  MapPin,
  ArrowRight,
  Shield,
  Zap,
  Users,
  CloudRain,
  Accessibility,
  Star,
  ChevronRight,
  CheckCircle,
} from "lucide-react"
import Button from "../components/ui/Button"

const PROFILES = [
  { id: "standard", icon: "🚶", label: "Standard" },
  { id: "fastest", icon: "⚡", label: "Fastest" },
  { id: "cheapest", icon: "💰", label: "Cheapest" },
  { id: "wheelchair", icon: "♿", label: "Wheelchair" },
  { id: "senior", icon: "🧓", label: "Senior" },
]

export default function LandingPage() {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [profile, setProfile] = useState("standard")
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate("/register")
  }

  return (
    <div className="bg-navy-50 min-h-screen">
      {/* Nav */}
      <header className="bg-white border-b border-navy-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-navy-900 text-lg">TransitSwap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-navy-600 hover:text-navy-900 transition-colors">
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #0ea5e9 1px, transparent 1px), linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-900/80" />

        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/20 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-brand-400 text-sm font-medium mb-6">
              <Star className="w-3.5 h-3.5" />
              Rule-Based Multimodal Urban Mobility Intelligence
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Travel Smarter,{" "}
              <span className="text-brand-400">Not Just Faster</span>
            </h1>
            <p className="text-navy-300 text-lg leading-relaxed max-w-2xl mx-auto">
              TransitSwap evaluates weather, accessibility, and crowd levels using transparent rule-based logic
              to help you find a journey that actually works for you — not just the shortest one on paper.
            </p>
          </div>

          {/* Search box */}
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-2xl shadow-black/30 border border-navy-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white ring-2 ring-brand-500" />
                    <input
                      type="text"
                      placeholder="From — current location or enter an address"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 text-sm border border-navy-200 rounded-xl bg-navy-50 text-navy-900 placeholder-navy-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                    <input
                      type="text"
                      placeholder="To — where do you want to go?"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 text-sm border border-navy-200 rounded-xl bg-navy-50 text-navy-900 placeholder-navy-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Profile selector */}
                <div>
                  <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2.5">
                    Travel Profile
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROFILES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfile(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          profile === p.id
                            ? "bg-brand-500 text-white shadow-sm"
                            : "bg-navy-100 text-navy-600 hover:bg-navy-200"
                        }`}
                      >
                        <span>{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" fullWidth size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                  Find Best Routes
                </Button>
              </div>

              <div className="px-6 py-3 bg-navy-50 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-brand-500" />
                  Accessibility-first routing
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-brand-500" />
                  Crowd intelligence
                </span>
                <span className="flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-brand-500" />
                  Weather-aware
                </span>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Sample route card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-16">
        <p className="text-center text-xs text-navy-500 uppercase tracking-widest font-semibold mt-8 mb-6">
          Sample recommendation output
        </p>
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-navy-200 shadow-md overflow-hidden">
          <div className="flex items-center gap-2 bg-brand-500 px-5 py-3">
            <Star className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-bold font-display">Recommended Route</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🚇</span>
              <span className="text-navy-700 font-medium text-sm">Metro → Walking</span>
              <div className="flex-1" />
              <span className="text-navy-900 font-bold font-display">38 min · ₹35</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { icon: "♿", text: "Fully accessible" },
                { icon: "🚶", text: "420 m walking" },
                { icon: "👥", text: "Low crowd" },
                { icon: "🌧️", text: "Low weather impact" },
                { icon: "🔄", text: "1 transfer" },
                { icon: "💰", text: "₹35 estimated fare" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 bg-navy-50 rounded-lg px-3 py-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs text-navy-700 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="bg-brand-50 rounded-xl px-4 py-3">
              <p className="text-xs text-navy-500 font-medium">Weather-friendly</p>
              <p className="text-navy-900 font-bold font-display text-sm">Less walking than the alternative routes in current conditions</p>
            </div>
            <p className="text-xs text-navy-500 mt-3 italic">
              Illustrative example — an actual "Plan a Trip" search shows the real demo dataset with live weather, accessibility, and crowd context.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-navy-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-navy-900 mb-3">
              More than a route planner
            </h2>
            <p className="text-navy-500 text-lg max-w-xl mx-auto">
              TransitSwap is an intelligent decision-support system that considers every factor that matters in a real journey.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Accessibility className="w-6 h-6 text-brand-500" />,
                title: "Accessibility-First Routing",
                desc: "Wheelchair users, senior citizens, pregnant women and more — inaccessible routes are filtered out as a hard constraint, not just a score.",
                badge: "★ Major Innovation",
              },
              {
                icon: <Shield className="w-6 h-6 text-brand-500" />,
                title: "Accessibility Dataset",
                desc: "A clearly labelled demonstration dataset of station accessibility features (lift, ramp, escalator, tactile paving) with authenticated user reporting for corrections.",
                badge: "Phase 7",
              },
              {
                icon: <CloudRain className="w-6 h-6 text-brand-500" />,
                title: "Weather-Aware Routing",
                desc: "Heavy rain or high heat increases the walking-discomfort score for routes with longer walking segments, using transparent rule-based logic — not machine learning.",
                badge: "Rule-Based",
              },
              {
                icon: <Users className="w-6 h-6 text-brand-500" />,
                title: "Crowd Intelligence",
                desc: "Combines recent authenticated user reports with historical demonstration data using a transparent weighted rule, clearly labelling which source an estimate came from.",
                badge: "Rule-Based",
              },
              {
                icon: <Zap className="w-6 h-6 text-brand-500" />,
                title: "Journey History",
                desc: "Every saved journey stores a snapshot of the route, weather, accessibility, and crowd context at the time you saved it — reproducible, not recalculated later.",
                badge: "Phase 4",
              },
              {
                icon: <MapPin className="w-6 h-6 text-brand-500" />,
                title: "Multimodal Routing",
                desc: "Metro, bus, walking, and auto-rickshaw combinations over a demonstration transit dataset for the Mumbai metropolitan area.",
                badge: "Multimodal",
              },
            ].map((f) => (
              <div key={f.title} className="bg-navy-50 rounded-2xl p-6 border border-navy-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-navy-200 flex items-center justify-center shadow-sm group-hover:border-brand-200 transition-colors">
                    {f.icon}
                  </div>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                    {f.badge}
                  </span>
                </div>
                <h3 className="font-display font-bold text-navy-900 mb-2">{f.title}</h3>
                <p className="text-sm text-navy-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl font-bold text-navy-900 mb-3">How TransitSwap works</h2>
          <p className="text-navy-500 text-lg">From your location to the best journey, in seconds.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Set your journey & profile",
              desc: "Enter origin and destination. Select your travel profile — standard, wheelchair, senior, stroller, or more.",
            },
            {
              step: "02",
              title: "TransitSwap checks accessibility, weather and crowd",
              desc: "Routes that don't meet your accessibility profile are filtered out. The rest are enriched with weather impact and crowd context using transparent rule-based logic.",
            },
            {
              step: "03",
              title: "Compare your route options",
              desc: "See ranked-by-time alternatives with clear labels for weather impact, accessibility status, and crowd level on each one.",
            },
          ].map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-start">
              {i < 2 && (
                <div className="hidden md:block absolute right-0 top-8 w-1/2 h-0.5 bg-gradient-to-r from-brand-200 to-transparent" />
              )}
              <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white font-display font-bold text-xl flex items-center justify-center mb-5 shadow-lg shadow-brand-500/25">
                {s.step}
              </div>
              <h3 className="font-display font-bold text-navy-900 text-lg mb-2">{s.title}</h3>
              <p className="text-navy-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack banner */}
      <section className="bg-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-navy-400 text-sm font-medium uppercase tracking-widest mb-6">Built with</p>
          <div className="flex flex-wrap justify-center gap-4">
            {["React + TypeScript", "Node.js + Express", "MongoDB Atlas", "JWT Auth", "Google Maps Platform", "OpenWeatherMap"].map((t) => (
              <span key={t} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-navy-300 text-sm font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold text-navy-900 mb-4">
          Ready to travel smarter?
        </h2>
        <p className="text-navy-500 text-lg mb-8 max-w-md mx-auto">
          Create your account and start getting personalized journey recommendations today.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register">
            <Button size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              Create Free Account
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
          {["Free to use", "No credit card required", "Accessibility-first", "Student project"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-sm text-navy-500">
              <CheckCircle className="w-4 h-4 text-brand-500" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-navy-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Bus className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-navy-700 text-sm">TransitSwap</span>
          </div>
          <p className="text-navy-400 text-sm">
            Rule-Based Multimodal Urban Mobility Platform · Final Year Engineering Project · 2025
          </p>
        </div>
      </footer>
    </div>
  )
}

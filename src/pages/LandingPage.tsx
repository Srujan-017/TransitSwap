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

  // Phase 12 fix — this used to discard origin/destination/profile entirely
  // and just navigate to /register (PROJECT_MASTER_PLAN.md §9/§32: "search
  // form collects 3 fields and discards them"). An unauthenticated visitor
  // can't search routes directly (routing is behind auth), so this carries
  // what they typed through sessionStorage instead — PlanTripPage reads it
  // once after they register/log in and pre-fills the real search, rather
  // than making them retype everything from scratch.
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (origin.trim() || destination.trim()) {
      try {
        sessionStorage.setItem(
          "ts_landing_search",
          JSON.stringify({ origin: origin.trim(), destination: destination.trim(), profile }),
        )
      } catch {
        // Private-browsing contexts can throw on sessionStorage access —
        // never block navigation over a convenience feature.
      }
    }
    navigate("/register")
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <header className="bg-white/90 backdrop-blur-lg sticky top-0 z-50 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-navy-900 flex items-center justify-center">
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
              className="px-5 py-2 text-sm font-semibold bg-navy-900 text-white rounded-full hover:bg-navy-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — clean, light, map-app style instead of a dark gradient-glow banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-50/70 to-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)] rounded-full px-4 py-1.5 text-brand-600 text-sm font-medium mb-6">
              <Star className="w-3.5 h-3.5" />
              Rule-Based Multimodal Urban Mobility Intelligence
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-navy-900 leading-tight mb-6">
              Travel Smarter,{" "}
              <span className="text-brand-500">Not Just Faster</span>
            </h1>
            <p className="text-navy-500 text-lg leading-relaxed max-w-2xl mx-auto">
              TransitSwap evaluates weather, accessibility, and crowd levels using transparent rule-based logic
              to help you find a journey that actually works for you — not just the shortest one on paper.
            </p>
          </div>

          {/* Search box */}
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-3xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-16px_rgba(15,23,42,0.18)] overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="space-y-2.5">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white ring-2 ring-brand-500" />
                    <input
                      type="text"
                      placeholder="From — current location or enter an address"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-full bg-navy-50/70 text-navy-900 placeholder-navy-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/30 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                    <input
                      type="text"
                      placeholder="To — where do you want to go?"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-full bg-navy-50/70 text-navy-900 placeholder-navy-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/30 transition-all"
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
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          profile === p.id
                            ? "bg-brand-500 text-white shadow-[0_4px_12px_-2px_rgba(14,165,233,0.4)]"
                            : "bg-navy-50 text-navy-600 hover:bg-navy-100"
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

              <div className="px-6 py-3 bg-navy-50/80 flex items-center justify-between text-xs text-navy-500">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <p className="text-center text-xs text-navy-500 uppercase tracking-widest font-semibold mt-8 mb-6">
          Sample recommendation output
        </p>
        <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-12px_rgba(15,23,42,0.16)] overflow-hidden">
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
                <div key={item.text} className="flex items-center gap-2 bg-navy-50 rounded-2xl px-3 py-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs text-navy-700 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
            <div className="bg-brand-50 rounded-2xl px-4 py-3">
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
      <section className="bg-navy-50/60 py-20">
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
                desc: "Metro, bus, walking, and auto-rickshaw combinations over a demonstration transit dataset for the Bengaluru metropolitan area.",
                badge: "Multimodal",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-3xl p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-14px_rgba(15,23,42,0.2)] transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-navy-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                    {f.icon}
                  </div>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
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
              <div className="w-14 h-14 rounded-full bg-navy-900 text-white font-display font-bold text-xl flex items-center justify-center mb-5 shadow-[0_8px_20px_-6px_rgba(15,23,42,0.35)]">
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
          <div className="flex flex-wrap justify-center gap-3">
            {["React + TypeScript", "Node.js + Express", "MongoDB Atlas", "JWT Auth", "Google Maps Platform", "OpenWeatherMap"].map((t) => (
              <span key={t} className="px-4 py-2 bg-white/5 rounded-full text-navy-300 text-sm font-medium">
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
      <footer className="bg-white border-t border-navy-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center">
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

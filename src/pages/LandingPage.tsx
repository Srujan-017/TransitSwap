import { useState, type ReactNode } from "react"
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
  Dna,
} from "lucide-react"
import Button from "../components/ui/Button"
import { CityTransitScene, FloatingArrivalCard } from "../components/landing/LandingIllustrations"
import { useScrollReveal } from "../hooks/useScrollReveal"

const PROFILES = [
  { id: "standard", icon: "🚶", label: "Standard" },
  { id: "fastest", icon: "⚡", label: "Fastest" },
  { id: "cheapest", icon: "💰", label: "Cheapest" },
  { id: "wheelchair", icon: "♿", label: "Wheelchair" },
  { id: "senior", icon: "🧓", label: "Senior" },
]

// A full-bleed, alternating color-block section with a headline + body on
// one side and a floating "proof" card on the other — the structural
// pattern found on transitapp.com's own marketing homepage (colored
// sections, bold multi-line headlines, tilted floating UI-mockup cards),
// applied here to TransitSwap's own real features rather than that site's.
// Animates in once when it first scrolls into view (useScrollReveal).
function RevealSection({
  className = "",
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>()
  return (
    <section
      ref={ref}
      className={`${className} ${isVisible ? "animate-fade-slide-up" : "opacity-0"}`}
    >
      {children}
    </section>
  )
}

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
    <div className="bg-white min-h-screen overflow-x-hidden">
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
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
          <div className="relative max-w-2xl mx-auto">
            <FloatingArrivalCard className="hidden lg:block absolute -right-28 top-6 -rotate-6" />
            <form
              onSubmit={handleSearch}
              className="relative bg-white rounded-3xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-16px_rgba(15,23,42,0.18)] overflow-hidden"
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
        <CityTransitScene className="w-full h-24 sm:h-32" />
      </section>

      {/* Accessibility — full-bleed color block #1 */}
      <RevealSection className="bg-gradient-to-br from-brand-500 to-brand-700 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold text-white bg-white/15 rounded-full px-3 py-1 mb-4">
              ★ Major Innovation
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              Accessibility-first, by default
            </h2>
            <p className="text-brand-50 text-lg leading-relaxed mb-4">
              Wheelchair users, senior citizens, pregnant travellers and more — inaccessible routes are
              filtered out as a hard constraint, not just scored lower. A clearly labelled demonstration
              dataset of station features (lift, ramp, escalator, tactile paving) powers every check, with
              authenticated user reporting for corrections.
            </p>
            <span className="inline-block text-xs font-semibold text-brand-700 bg-white rounded-full px-3 py-1">
              Phase 7 · Rule-Based
            </span>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="bg-white rounded-3xl shadow-[0_24px_48px_-16px_rgba(15,23,42,0.4)] p-5 w-72 -rotate-3">
              <div className="flex items-center gap-2 mb-3">
                <Accessibility className="w-5 h-5 text-brand-600" />
                <span className="font-display font-bold text-navy-900 text-sm">Wheelchair check</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2">
                  <span className="text-xs font-medium text-emerald-800">MG Road Metro</span>
                  <span className="text-xs font-bold text-emerald-600">✓ Accessible</span>
                </div>
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                  <span className="text-xs font-medium text-red-800">Trinity Metro</span>
                  <span className="text-xs font-bold text-red-600">✕ Excluded</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block bg-white rounded-2xl shadow-[0_16px_32px_-12px_rgba(15,23,42,0.35)] px-4 py-3 w-40 absolute -bottom-6 -left-4 rotate-6">
              <p className="text-[10px] font-semibold text-navy-400 uppercase">Hard constraint</p>
              <p className="font-display font-bold text-navy-900 text-sm leading-tight">Never a score — a filter</p>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Weather + crowd — full-bleed color block #2 */}
      <RevealSection className="bg-gradient-to-br from-amber-400 to-orange-500 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative flex justify-center lg:justify-start">
            <div className="bg-white rounded-3xl shadow-[0_24px_48px_-16px_rgba(15,23,42,0.4)] p-5 w-72 rotate-2">
              <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-wide mb-2">Live context</p>
              <div className="flex items-center gap-2 mb-2">
                <CloudRain className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-semibold text-navy-800">Light rain · low impact</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-navy-800">Low crowd at MG Road</span>
              </div>
            </div>
            <div className="hidden sm:block bg-white rounded-2xl shadow-[0_16px_32px_-12px_rgba(15,23,42,0.35)] px-4 py-3 w-44 absolute -top-5 -right-6 -rotate-6">
              <p className="text-[10px] font-semibold text-navy-400 uppercase">Weather-friendly</p>
              <p className="font-display font-bold text-navy-900 text-sm leading-tight">Less walking in current conditions</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-block text-xs font-bold text-orange-900 bg-white/70 rounded-full px-3 py-1 mb-4">
              Rule-Based
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              Weather and crowd, before you leave
            </h2>
            <p className="text-orange-50 text-lg leading-relaxed">
              Heavy rain or high heat raises the walking-discomfort score for routes with longer walking
              segments. Crowd estimates combine recent authenticated user reports with historical
              demonstration data using a transparent weighted rule — always labelled with its actual source,
              never presented as a live sensor feed it isn't.
            </p>
          </div>
        </div>
      </RevealSection>

      {/* Multimodal + history — full-bleed color block #3 */}
      <RevealSection className="bg-gradient-to-br from-navy-900 to-navy-950 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold text-white bg-white/10 rounded-full px-3 py-1 mb-4">
              Multimodal · Phase 4
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              Multimodal, with a memory
            </h2>
            <p className="text-navy-300 text-lg leading-relaxed">
              Metro, bus, walking, and auto-rickshaw combinations over a demonstration transit dataset for the
              Bengaluru metropolitan area. Every saved journey stores a full snapshot of the route, weather,
              accessibility, and crowd context at the time you saved it — reproducible, never silently
              recalculated later.
            </p>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="bg-white rounded-3xl shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)] p-5 w-72 rotate-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🚇</span>
                <span className="font-display font-bold text-navy-900 text-sm">Metro → Walking</span>
                <div className="flex-1" />
                <span className="text-navy-900 font-bold text-sm">38 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Dna className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs text-navy-500">Saved · reproducible snapshot</span>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* How it works */}
      <RevealSection className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </RevealSection>

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

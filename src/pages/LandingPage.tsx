import type { ReactNode } from "react"
import SkipLink from "../components/ui/SkipLink"
import { Link } from "react-router-dom"
import {
  Accessibility,
  ArrowRight,
  Bus,
  BusFront,
  CarTaxiFront,
  CloudRain,
  ListChecks,
  Navigation,
  Search,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import Button from "../components/ui/Button"
import Photo from "../components/ui/Photo"
import ProfileIcon from "../components/ui/ProfileIcon"
import HeroSearch from "../components/landing/HeroSearch"
import { useScrollReveal } from "../hooks/useScrollReveal"
import type { PhotoId } from "../data/photoCredits"

// Section pictures are real photographs served from this site's own files through <Photo>; src/data/photoCredits.ts holds
// each photographer's credit and the /credits page lists them.

/** A section that fades in once, the first time it scrolls into view. The browser skips laying out the contents of the ones below the fold until they are near (content-visibility), which cuts the first-load work on a phone. */
function RevealSection({ id, className = "", children }: { id?: string; className?: string; children: ReactNode }) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>()
  return (
    <section id={id} ref={ref} className={`${className} ${isVisible ? "animate-fade-slide-up" : "opacity-0"}`}>
      {/* The section itself is what is watched for scrolling into view; only its contents are skipped until near. */}
      <div className="[contain-intrinsic-size:auto_700px] [content-visibility:auto]">{children}</div>
    </section>
  )
}

const STEPS = [
  { Icon: Search, title: "Say where, and who is travelling", text: "Enter where you are going and pick a travel profile: standard, wheelchair, senior, stroller and more." },
  { Icon: ShieldCheck, title: "We apply the rules", text: "Weather, crowd, service hours and your profile's limits remove the routes that would not work for you." },
  { Icon: ListChecks, title: "Take the best option", text: "You get a best option with the reasons, plus alternatives. Start live navigation or save it for later." },
]

interface Feature {
  photo: PhotoId
  Icon: typeof Accessibility
  title: string
  text: string
}

const FEATURES: Feature[] = [
  {
    photo: "tactile-platform",
    Icon: Accessibility,
    title: "Accessibility-first, by default",
    text: "Each accessibility profile gets one best option with the reasons. Walking limits, bus rules and crowd limits are fixed rules, not scores that a quick route can outweigh.",
  },
  {
    photo: "bmtc-bus",
    Icon: BusFront,
    title: "Buses with their numbers",
    text: "Every bus leg shows its route number and direction, the next departures and when you arrive, from a demonstration timetable of BMTC-style routes.",
  },
  {
    photo: "autos-vidhana-soudha",
    Icon: CarTaxiFront,
    title: "Autos for the first and last stretch",
    text: "An auto bridges the gap to the station so you walk less. When the weather turns, a long walk becomes an auto.",
  },
  {
    photo: "vidhana-soudha-rain",
    Icon: CloudRain,
    title: "Weather before you leave",
    text: "Live weather from Open-Meteo, with the forecast for the hour you set off. In rain or heat there is no walk over 300 m.",
  },
  {
    photo: "green-line-train",
    Icon: Users,
    title: "How busy it will be",
    text: "An hour-by-hour crowd estimate for the stations and stops on your route, shown on every leg. It is demonstration data, and labelled as such.",
  },
  {
    photo: "streets-of-bangalore",
    Icon: Navigation,
    title: "Live navigation",
    text: "Follow your journey leg by leg with turn prompts and voice guidance, and get a new route if you leave the path. Try the demo journey without moving. Bus and metro positions are not tracked live.",
  },
]

// What each accessibility profile means in practice: the rules the planner enforces, in plain words.
const TRAVELLERS = [
  { id: "wheelchair", name: "Wheelchair", rule: "Autos and metro only, with at most 150 m of walking in a stretch." },
  { id: "senior", name: "Senior", rule: "Short walks, and a bus only when it is quiet." },
  { id: "pregnant", name: "Pregnant", rule: "No buses, and only quiet metro trains." },
  { id: "stroller", name: "Stroller", rule: "No buses, only quiet metro trains, short walks." },
  { id: "luggage", name: "Heavy luggage", rule: "Autos first, short walks, a bus only when it is quiet." },
  { id: "reduced_mobility", name: "Reduced mobility", rule: "Short walks, and buses only when they are quiet." },
]

const SECTION = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

export default function LandingPage() {
  const { isAuthenticated } = useAuthContext()

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <SkipLink />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/90 backdrop-blur-lg">
        <div className={`${SECTION} flex h-16 items-center justify-between`}>
          <Link to="/" aria-label="TransitSwap home" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900">
              <Bus className="h-4 w-4 text-white" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold text-navy-900">TransitSwap</span>
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {[
              ["#how-it-works", "How it works"],
              ["#features", "Features"],
              ["#travellers", "Every traveller"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-4 py-2 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-100 hover:text-navy-900">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-control bg-navy-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-800 sm:px-5">
                Open TransitSwap
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-11 items-center whitespace-nowrap px-3 text-sm font-medium text-navy-600 transition-colors hover:text-navy-900 sm:px-4">
                  Sign In
                </Link>
                <Link to="/register" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-control bg-navy-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-800 sm:px-5">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Hero: a real Bengaluru metro platform, under a dark wash so the headline stays readable. */}
        <section className="relative overflow-hidden">
          <Photo id="metro-sunset" decorative priority className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-900/50 to-navy-950/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/40 via-transparent to-transparent" />
          {/* A soft dark glow behind the headline and subtitle only, so they stay readable while the photo shows elsewhere. */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_42%_at_50%_30%,rgba(6,11,22,0.62),transparent_72%)]" />
          <div className={`${SECTION} relative pb-16 pt-16 sm:pt-20`}>
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-300 backdrop-blur-sm">
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                Rule-Based Multimodal Urban Mobility Intelligence
              </p>
              <h1 className="mb-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Travel Smarter, <span className="text-brand-300">Not Just Faster</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white">
                TransitSwap evaluates weather, accessibility, and crowd levels using transparent rule-based logic to help you find a
                journey that actually works for you — not just the shortest one on paper.
              </p>
            </div>
            <div className="mx-auto max-w-2xl">
              <HeroSearch isAuthenticated={isAuthenticated} />
              <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-navy-200" aria-label="What it plans">
                <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" /> Accessibility-first routing</li>
                <li className="flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-300" aria-hidden="true" /> Crowd intelligence</li>
                <li className="flex items-center gap-1.5"><CloudRain className="h-4 w-4 text-brand-300" aria-hidden="true" /> Weather-aware</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <RevealSection id="how-it-works" className="scroll-mt-20 py-16 sm:py-20">
          <div className={`${SECTION} grid items-center gap-10 lg:grid-cols-2 lg:gap-16`}>
            <div>
              <h2 className="font-display text-3xl font-bold text-navy-900">How TransitSwap works</h2>
              <p className="mt-2 text-lg text-navy-600">From where you are to the best journey, in three steps.</p>
              <ol className="mt-8 space-y-6">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-700">
                      <s.Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-navy-900">
                        <span className="sr-only">Step {i + 1}: </span>
                        {s.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-navy-600">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <Photo id="cubbon-park-station" sizes="(min-width: 1024px) 560px, 100vw" className="aspect-[4/3] w-full rounded-sheet object-cover shadow-float" />
          </div>
        </RevealSection>

        {/* Features */}
        <RevealSection id="features" className="scroll-mt-20 bg-navy-50 py-16 sm:py-20">
          <div className={SECTION}>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-navy-900">Built around the way Bengaluru moves</h2>
              <p className="mt-2 text-lg text-navy-600">Metro, buses, autos and your own two feet, planned together.</p>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex flex-col overflow-hidden rounded-panel border border-navy-100 bg-white shadow-card">
                  <Photo id={f.photo} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10] w-full object-cover" />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-brand-50 text-brand-700">
                      <f.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-lg font-bold text-navy-900">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </RevealSection>

        {/* Every traveller */}
        <RevealSection id="travellers" className="scroll-mt-20 bg-navy-900 py-16 sm:py-20">
          <div className={SECTION}>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-white">One best option for every traveller</h2>
              <p className="mt-2 text-lg text-navy-200">
                Pick a profile and the planner follows its rules, every time. They are written down, and tested.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TRAVELLERS.map((t) => (
                <li key={t.id} className="rounded-panel border border-white/10 bg-white/5 p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-control bg-white/10 text-white">
                    <ProfileIcon id={t.id} className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-white">{t.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-200">{t.rule}</p>
                </li>
              ))}
            </ul>
            <div className="mx-auto mt-12 grid max-w-3xl gap-6 border-t border-white/10 pt-10 text-center sm:grid-cols-2">
              <div>
                <p className="font-display text-4xl font-bold tabular-nums text-white">1,680</p>
                <p className="mt-1 text-sm text-navy-200">route checks: 7 profiles, 12 trips, 5 times of day, 4 kinds of weather</p>
              </div>
              <div>
                <p className="font-display text-4xl font-bold tabular-nums text-white">0</p>
                <p className="mt-1 text-sm text-navy-200">rule violations found in any of them</p>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Call to action */}
        <RevealSection className="relative overflow-hidden py-20 text-center">
          <Photo id="train-dusk" decorative className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-navy-950/75" />
          <div className={`${SECTION} relative`}>
            <h2 className="mb-4 font-display text-3xl font-bold text-white">Ready to travel smarter?</h2>
            <p className="mx-auto mb-8 max-w-md text-lg text-navy-200">
              Create your account and start getting personalized journey recommendations today.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={isAuthenticated ? "/plan" : "/register"}>
                <Button size="lg" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                  {isAuthenticated ? "Plan a Journey" : "Create Free Account"}
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link to="/login">
                  <Button size="lg" variant="outline">Sign In</Button>
                </Link>
              )}
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {["Free to use", "No credit card required", "Accessibility-first", "Student project"].map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-sm text-navy-200">
                  <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </RevealSection>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-100 bg-white py-10">
        <div className={`${SECTION} grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900">
                <Bus className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-bold text-navy-800">TransitSwap</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-navy-600">
              A rule-based multimodal urban mobility platform: a final-year engineering project. The transit, crowd and accessibility
              data in the app are demonstration data.
            </p>
          </div>
          <nav aria-label="Footer" className="text-sm">
            <p className="mb-2 font-semibold text-navy-900">TransitSwap</p>
            <ul className="space-y-1.5">
              <li><Link to="/login" className="text-navy-600 hover:text-navy-900">Sign In</Link></li>
              <li><Link to="/register" className="text-navy-600 hover:text-navy-900">Create an account</Link></li>
              <li><Link to="/credits" className="text-navy-600 hover:text-navy-900">Photo credits</Link></li>
            </ul>
          </nav>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-navy-900">Built with</p>
            <p className="text-navy-600">React, TypeScript, Node.js, MongoDB, OpenStreetMap and Leaflet, Open-Meteo.</p>
          </div>
        </div>
        <p className={`${SECTION} mt-8 text-xs text-navy-500`}>© {new Date().getFullYear()} TransitSwap</p>
      </footer>
    </div>
  )
}

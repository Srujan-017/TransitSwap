import { Link } from "react-router-dom"
import SkipLink from "../components/ui/SkipLink"
import { ArrowLeft, Bus, CloudRain, History, ShieldCheck, Users } from "lucide-react"
import type { ReactNode } from "react"
import Photo from "../components/ui/Photo"

const POINTS = [
  { Icon: ShieldCheck, label: "Accessibility-first", desc: "Wheelchair, senior, stroller and more" },
  { Icon: CloudRain, label: "Weather-aware", desc: "Live weather, no long walks in the rain" },
  { Icon: Users, label: "Crowd intelligence", desc: "Hour-by-hour estimates (demonstration data)" },
  { Icon: History, label: "Journey history", desc: "Saved to your account, private to you" },
]

/**
 * The frame for sign-in and sign-up. On a desktop: a photograph of Vidhana Soudha with what TransitSwap does on the left, the
 * form on the right. On a phone: the same photograph as a banner above the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear()
  return (
    <div className="flex min-h-screen">
      <SkipLink />
      {/* Left panel (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-1/2">
        <Photo id="vidhana-soudha-clear" decorative sizes="50vw" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-navy-900/80 to-navy-950/90" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-navy-950/85 to-transparent" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500">
              <Bus className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-white">TransitSwap</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="space-y-4">
            <p className="font-display text-2xl font-semibold leading-snug text-white">
              "Not just the shortest route —
              <br />
              the <span className="text-brand-300">smartest</span> one."
            </p>
            <p className="text-sm leading-relaxed text-navy-200">
              TransitSwap evaluates weather, crowd levels, accessibility and your journey history using transparent rule-based logic
              to help you plan a journey that actually works for you.
            </p>
          </blockquote>

          <ul className="grid grid-cols-2 gap-3">
            {POINTS.map(({ Icon, label, desc }) => (
              <li key={label} className="rounded-panel border border-white/10 bg-navy-950/45 p-4 backdrop-blur-sm">
                <Icon className="mb-2 h-5 w-5 text-brand-300" aria-hidden="true" />
                <p className="font-display text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs leading-snug text-navy-200">{desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-navy-200">
          © {year} TransitSwap · Urban Mobility Intelligence
          {" · "}
          <Link to="/credits" className="font-medium underline underline-offset-2 hover:text-white">Photo credits</Link>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="lg:hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900">
                <Bus className="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold text-navy-900">TransitSwap</span>
            </Link>
          </div>
          <Photo id="vidhana-soudha-clear" decorative sizes="100vw" className="h-28 w-full object-cover object-[50%_40%]" />
        </div>
        <div className="hidden justify-end px-8 py-5 lg:flex">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-navy-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
          </Link>
        </div>
        <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-6 py-10 outline-none">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <p className="px-6 pb-6 text-center text-xs text-navy-500 lg:hidden">
          © {year} TransitSwap · <Link to="/credits" className="font-medium text-brand-600 underline underline-offset-2">Photo credits</Link>
        </p>
      </div>
    </div>
  )
}

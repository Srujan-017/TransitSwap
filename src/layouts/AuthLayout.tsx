import { Link } from "react-router-dom"
import { Bus } from "lucide-react"
import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, #0ea5e9 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-navy-900 to-navy-900" />

        {/* Content */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-display font-bold text-xl tracking-tight">TransitSwap</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="space-y-4">
            <p className="text-white/90 text-2xl font-display font-semibold leading-snug">
              "Not just the shortest route —
              <br />
              the <span className="text-brand-400">smartest</span> one."
            </p>
            <p className="text-navy-400 text-sm leading-relaxed">
              TransitSwap evaluates weather, crowd levels, accessibility and your journey history
              using transparent rule-based logic to help you plan a journey that actually works for you.
            </p>
          </blockquote>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Accessibility-First", desc: "Wheelchair, Senior & more" },
              { label: "Weather-Aware", desc: "Rule-based walking impact" },
              { label: "Crowd Intelligence", desc: "Recent reports + demo data" },
              { label: "Journey History", desc: "MongoDB-backed and private" },
            ].map((f) => (
              <div key={f.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-brand-400 font-display font-semibold text-sm">{f.label}</p>
                <p className="text-navy-400 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-navy-500 text-xs">© 2025 TransitSwap · Urban Mobility Intelligence</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-navy-900 text-lg">TransitSwap</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}

import { useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, MapPin } from "lucide-react"
import Button from "../ui/Button"
import ProfileIcon from "../ui/ProfileIcon"

const PROFILES = [
  { id: "standard", label: "Standard" },
  { id: "fastest", label: "Fastest" },
  { id: "cheapest", label: "Cheapest" },
  { id: "wheelchair", label: "Wheelchair" },
  { id: "senior", label: "Senior" },
]

/** The same key and shape PlanTripPage reads once, then clears (see readLandingSearch there). */
export const LANDING_SEARCH_KEY = "ts_landing_search"

interface HeroSearchProps {
  /** A signed-in visitor goes straight to the planner; a guest is taken to sign up first. */
  isAuthenticated: boolean
}

/**
 * The "Where to?" box on the Landing page. Routing sits behind sign-in, so what a visitor types (and the travel profile
 * they pick) is carried through sessionStorage and pre-fills the real search once they have an account; nothing is lost
 * and nobody has to type it twice.
 */
export default function HeroSearch({ isAuthenticated }: HeroSearchProps) {
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [profile, setProfile] = useState("standard")
  const navigate = useNavigate()
  const profileLabelId = useId()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (origin.trim() || destination.trim()) {
      try {
        sessionStorage.setItem(LANDING_SEARCH_KEY, JSON.stringify({ origin: origin.trim(), destination: destination.trim(), profile }))
      } catch {
        // Private-browsing contexts can throw on sessionStorage access; never block navigation over a convenience.
      }
    }
    navigate(isAuthenticated ? "/plan" : "/register")
  }

  const field =
    "w-full min-h-12 rounded-control border border-navy-200 bg-white pl-11 pr-4 py-3 text-sm text-navy-900 placeholder-navy-500 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-sheet bg-white shadow-pop" aria-label="Plan a journey">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2.5">
          <div className="relative">
            <span aria-hidden="true" className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-500 bg-white" />
            <input
              type="text"
              aria-label="From"
              placeholder="From — your location or an address"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className={field}
            />
          </div>
          <div className="relative">
            <MapPin aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-danger" />
            <input
              type="text"
              aria-label="To"
              placeholder="To — where do you want to go?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <div role="group" aria-labelledby={profileLabelId}>
          <p id={profileLabelId} className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-navy-500">
            Travel Profile
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={profile === p.id}
                onClick={() => setProfile(p.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  profile === p.id ? "bg-brand-500 text-white" : "bg-navy-100 text-navy-700 hover:bg-navy-200"
                }`}
              >
                <ProfileIcon id={p.id} className="h-4 w-4" />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" fullWidth size="lg" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
          Find Best Routes
        </Button>
      </div>
    </form>
  )
}

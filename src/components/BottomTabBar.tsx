import { NavLink } from "react-router-dom"
import { Bookmark, History, House, Route, UserRound } from "lucide-react"

const TABS = [
  { to: "/dashboard", label: "Home", Icon: House },
  { to: "/plan", label: "Plan Trip", Icon: Route },
  { to: "/saved-routes", label: "Saved", Icon: Bookmark },
  { to: "/history", label: "History", Icon: History },
  { to: "/profile", label: "Profile", Icon: UserRound },
]

/**
 * The phone's main navigation: five tabs fixed to the bottom of the screen, like an app. Shown only below 768 px; on a
 * desktop the top bar carries the same links, and this bar is not in the layout at all (display: none), so a link is
 * never offered twice at the same time. Each tab is at least 64 px tall, past the 44 px touch-target guideline. The live
 * navigation screen sits above this bar (z-index 60 against 40).
 */
export default function BottomTabBar() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-200 bg-white/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors ${
                  isActive ? "text-brand-700" : "text-navy-600 hover:text-navy-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden="true" className={`absolute top-0 h-0.5 w-8 rounded-b-full ${isActive ? "bg-brand-500" : "bg-transparent"}`} />
                  <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={isActive ? 2.4 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

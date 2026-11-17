import { useEffect, useId, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { Bus, ChevronDown, FlaskConical, History, LogOut, Shield, User } from "lucide-react"
import { useAuthContext } from "../context/AuthContext"
import Avatar from "./ui/Avatar"

/**
 * The top bar. On a desktop it holds the logo, the five main links and the account menu. On a phone (below 768 px) the main
 * links live in the bottom tab bar instead (BottomTabBar), so this bar shrinks to the logo and the account menu, which
 * also carries the links the tab bar has no room for (Research, and Admin for admins).
 */
export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthContext()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const firstName = user?.name?.split(" ")[0] ?? ""

  // A new page closes the menu; Escape closes it and puts focus back on its button.
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate("/")
  }

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/plan", label: "Plan Trip" },
    { to: "/history", label: "History" },
    { to: "/saved-routes", label: "Saved Routes" },
    { to: "/research", label: "Research" },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ]

  const menuLink = "flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm text-navy-700 transition-colors hover:bg-navy-50"

  return (
    <header className="sticky top-0 z-50 border-b border-navy-100 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex flex-shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900">
              <Bus className="h-[18px] w-[18px] text-white" aria-hidden="true" />
            </div>
            {/* Between a phone and a laptop the six links need the room, so the wordmark is read aloud but not shown. */}
            <span className="font-display text-lg font-bold tracking-tight text-navy-900 max-lg:sr-only">TransitSwap</span>
          </Link>

          {/* Main links: desktop only (a phone uses the bottom tab bar) */}
          {isAuthenticated && (
            <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-navy-100/70 p-1 md:flex">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors lg:px-4 ${
                      isActive ? "bg-white text-navy-900 shadow-card" : "text-navy-600 hover:text-navy-900"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Account */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label="Account menu"
                className="flex min-h-11 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors hover:bg-navy-100"
              >
                <Avatar name={user?.name ?? "?"} size="sm" />
                <span className="hidden text-sm font-medium text-navy-700 sm:inline">{firstName}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-navy-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {open && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setOpen(false)} />
                  <div id={menuId} className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-panel border border-navy-100 bg-white py-2 shadow-float">
                    <div className="border-b border-navy-100 px-4 py-3">
                      <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
                      <p className="mt-0.5 truncate text-xs text-navy-500">{user?.email}</p>
                    </div>
                    <Link to="/profile" className={menuLink}><User className="h-4 w-4" aria-hidden="true" /> Profile &amp; Preferences</Link>
                    <Link to="/history" className={menuLink}><History className="h-4 w-4" aria-hidden="true" /> Travel History</Link>
                    {/* On a phone the bottom tab bar has no room for these, so they live here. */}
                    <Link to="/research" className={`${menuLink} md:hidden`}><FlaskConical className="h-4 w-4" aria-hidden="true" /> Research</Link>
                    {user?.role === "admin" && (
                      <Link to="/admin" className={`${menuLink} md:hidden`}><Shield className="h-4 w-4" aria-hidden="true" /> Admin</Link>
                    )}
                    <hr className="my-1 border-navy-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-navy-700 transition-colors hover:text-navy-900">
                Sign In
              </Link>
              <Link to="/register" className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

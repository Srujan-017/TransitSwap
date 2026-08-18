import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Bus, Menu, X, ChevronDown, LogOut, User, History, MapPin } from "lucide-react"
import { useAuthContext } from "../context/AuthContext"

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/plan", label: "Plan Trip" },
    { to: "/history", label: "History" },
    { to: "/saved-routes", label: "Saved Routes" },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ]

  return (
    <header className="bg-white border-b border-navy-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Bus className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-bold text-navy-900 text-lg tracking-tight">TransitSwap</span>
          </Link>

          {/* Desktop nav */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-navy-600 hover:text-navy-900 hover:bg-navy-100"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* User dropdown */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-navy-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-navy-700">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-navy-400" />
                  </button>
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-navy-200 py-1 z-20">
                        <div className="px-4 py-3 border-b border-navy-100">
                          <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
                          <p className="text-xs text-navy-500 mt-0.5">{user?.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
                        >
                          <User className="w-4 h-4" /> Profile & Preferences
                        </Link>
                        <Link
                          to="/history"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
                        >
                          <History className="w-4 h-4" /> Travel History
                        </Link>
                        <hr className="my-1 border-navy-100" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile hamburger */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-navy-100 transition-colors"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {menuOpen ? <X className="w-5 h-5 text-navy-700" /> : <Menu className="w-5 h-5 text-navy-700" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && isAuthenticated && (
          <div className="md:hidden border-t border-navy-100 py-3 space-y-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-navy-600 hover:bg-navy-100"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <NavLink
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-navy-600 hover:bg-navy-100"
                }`
              }
            >
              <User className="w-4 h-4" /> Profile
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

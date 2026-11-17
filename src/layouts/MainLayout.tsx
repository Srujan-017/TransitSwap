import { Outlet, useLocation } from "react-router-dom"
import Navbar from "../components/Navbar"
import SkipLink from "../components/ui/SkipLink"
import BottomTabBar from "../components/BottomTabBar"
import AppFooter from "../components/AppFooter"

/**
 * The frame around every signed-in page: a skip link for keyboard users, the top bar, the page itself (with a short
 * fade-in on each new page), the footer, and, on a phone only, the bottom tab bar.
 */
export default function MainLayout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col bg-navy-50">
      <SkipLink />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <div key={pathname} className="animate-page-in">
          <Outlet />
        </div>
      </main>
      <AppFooter />
      {/* Room under the footer so the fixed tab bar never covers it (phone only). */}
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />
      <BottomTabBar />
    </div>
  )
}

import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuthContext } from "./context/AuthContext"
import MainLayout from "./layouts/MainLayout"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import NotFoundPage from "./pages/NotFoundPage"
import LoadingSpinner from "./components/ui/LoadingSpinner"

// Phase 11 (P11) — Landing/Login/Register stay eager (they're the first
// screen an unauthenticated visitor loads), but everything behind
// ProtectedRoute is route-split into its own chunk and only fetched once a
// user actually navigates there, instead of all 6 pages — including the
// admin console most users never open — inflating the one 459 kB main
// bundle every visitor downloads upfront (PROJECT_MASTER_PLAN.md §26 P11 /
// §9 "459 kB main chunk"). MapView.tsx was already lazy-loaded this same way.
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const PlanTripPage = lazy(() => import("./pages/PlanTripPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const HistoryPage = lazy(() => import("./pages/HistoryPage"))
const SavedRoutesPage = lazy(() => import("./pages/SavedRoutesPage"))
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"))
const ResearchPage = lazy(() => import("./pages/ResearchPage"))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext()
  if (isLoading) return <LoadingSpinner fullPage size="lg" text="Loading TransitSwap…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Problem 23 — frontend gate is a UX convenience only; the backend independently
// enforces requireAdmin on every /api/admin/* route regardless of what this shows.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthContext()
  if (isLoading) return <LoadingSpinner fullPage size="lg" text="Loading TransitSwap…" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext()
  if (isLoading) return <LoadingSpinner fullPage size="lg" text="Loading TransitSwap…" />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />

      {/* Guest-only (redirect to dashboard if logged in) */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Protected app */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/plan"
          element={
            <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
              <PlanTripPage />
            </Suspense>
          }
        />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
              <ProfilePage />
            </Suspense>
          }
        />
        <Route
          path="/history"
          element={
            <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route
          path="/saved-routes"
          element={
            <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
              <SavedRoutesPage />
            </Suspense>
          }
        />
        <Route
          path="/research"
          element={
            <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
              <ResearchPage />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<LoadingSpinner fullPage size="lg" text="Loading…" />}>
                <AdminDashboardPage />
              </Suspense>
            </AdminRoute>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

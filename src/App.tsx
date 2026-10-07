import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuthContext } from "./context/AuthContext"
import MainLayout from "./layouts/MainLayout"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import DashboardPage from "./pages/DashboardPage"
import PlanTripPage from "./pages/PlanTripPage"
import ProfilePage from "./pages/ProfilePage"
import HistoryPage from "./pages/HistoryPage"
import SavedRoutesPage from "./pages/SavedRoutesPage"
import AdminDashboardPage from "./pages/AdminDashboardPage"
import NotFoundPage from "./pages/NotFoundPage"
import LoadingSpinner from "./components/ui/LoadingSpinner"

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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/plan" element={<PlanTripPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/saved-routes" element={<SavedRoutesPage />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
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

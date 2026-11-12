import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
})

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ts_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Bug fix — a 401 (expired/invalid token) from any authenticated request was
// previously just surfaced as a normal error message wherever that call's
// .catch() happened to render it; isAuthenticated stayed stale-true and the
// user was left on a protected page with a dead session instead of being
// routed back to /login. AuthContext listens for this event and clears its
// user/token state, which flips isAuthenticated and lets ProtectedRoute's
// existing <Navigate to="/login" /> handle the redirect — no router import
// needed here, avoiding a circular dependency with AuthContext.
export const AUTH_EXPIRED_EVENT = "ts:auth-expired"

/** An Error from the API, optionally carrying the response body's structured `data`. */
export interface ApiError extends Error {
  details?: unknown
}

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("ts_token")
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    const message = err.response?.data?.message || err.message || "An unexpected error occurred"
    // Some errors carry structured detail in the response's `data` (e.g. the list
    // of routes excluded when no accessible route is left) — keep it on the Error
    // so callers can show it, instead of flattening everything to a message.
    const error = new Error(message) as ApiError
    error.details = err.response?.data?.data
    return Promise.reject(error)
  },
)

export default api

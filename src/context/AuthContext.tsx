import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User, LoginCredentials, RegisterData } from "../types"
import { authService } from "../services/authService"
import { AUTH_EXPIRED_EVENT } from "../services/api"

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("ts_token"))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("ts_token")
    if (stored) {
      setToken(stored)
      authService
        .getMe()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem("ts_token")
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const { user: u, token: t } = await authService.login(credentials)
    localStorage.setItem("ts_token", t)
    setToken(t)
    setUser(u)
  }

  const register = async (data: RegisterData) => {
    const { user: u, token: t } = await authService.register(data)
    localStorage.setItem("ts_token", t)
    setToken(t)
    setUser(u)
  }

  const logout = useCallback(() => {
    localStorage.removeItem("ts_token")
    setToken(null)
    setUser(null)
  }, [])

  // A 401 from any API call (expired/invalid token) dispatches this event;
  // clearing state here flips isAuthenticated so ProtectedRoute redirects to
  // /login instead of leaving the user stuck on a page with a dead session.
  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout)
  }, [logout])

  const updateUser = (u: User) => setUser(u)

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated: !!user, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}

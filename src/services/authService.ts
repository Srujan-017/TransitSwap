import api from "./api"
import type { User, LoginCredentials, RegisterData } from "../types"

interface AuthResult {
  user: User
  token: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { data } = await api.post<{ success: boolean; data: AuthResult }>("/auth/login", credentials)
    return data.data
  },

  async register(payload: RegisterData): Promise<AuthResult> {
    const { data } = await api.post<{ success: boolean; data: AuthResult }>("/auth/register", payload)
    return data.data
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<{ success: boolean; data: User }>("/auth/me")
    return data.data
  },
}

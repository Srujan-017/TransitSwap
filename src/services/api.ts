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

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || err.message || "An unexpected error occurred"
    return Promise.reject(new Error(message))
  },
)

export default api

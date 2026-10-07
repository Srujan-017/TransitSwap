import dotenv from "dotenv"
dotenv.config()

const DEV_JWT_FALLBACK = "transitswap_dev_secret_change_in_production"

export const env = {
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || DEV_JWT_FALLBACK,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  OSRM_API_URL: process.env.OSRM_API_URL || "",
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || "",
  OPENWEATHER_API_URL: process.env.OPENWEATHER_API_URL || "https://api.openweathermap.org/data/2.5/weather",
}

if (env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_FALLBACK) {
    throw new Error("FATAL: JWT_SECRET must be set to a strong secret in production.")
  }
}

if (!env.MONGODB_URI) {
  console.warn("MONGODB_URI not set - database features will not work.")
}

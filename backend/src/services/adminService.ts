import mongoose from "mongoose"
import { User } from "../models/User"
import { Journey } from "../models/Journey"
import { SavedRoute } from "../models/SavedRoute"
import { SavedDestination } from "../models/SavedDestination"
import { CrowdReport } from "../models/CrowdReport"
import { Accessibility } from "../models/Accessibility"
import { DEMO_ACCESSIBILITY_DATA } from "../data/accessibilityData"
import { AppError } from "../middleware/errorHandler"

function dbReady() {
  return mongoose.connection.readyState === 1
}

// N/A when the database isn't connected — never a fabricated count.
async function safeCount(model: { countDocuments(): mongoose.Query<number, unknown> }): Promise<number | "N/A"> {
  if (!dbReady()) return "N/A"
  try {
    return await model.countDocuments()
  } catch {
    return "N/A"
  }
}

export const adminService = {
  /**
   * Problem 23, Part 7 — real counts only, "N/A" when a count can't be retrieved.
   */
  async getOverview() {
    const [users, journeys, savedRoutes, savedDestinations, crowdReports] = await Promise.all([
      safeCount(User),
      safeCount(Journey),
      safeCount(SavedRoute),
      safeCount(SavedDestination),
      safeCount(CrowdReport),
    ])

    const accessibilityRecords = dbReady()
      ? await Accessibility.countDocuments().catch(() => DEMO_ACCESSIBILITY_DATA.length)
      : DEMO_ACCESSIBILITY_DATA.length

    let feedbackCount: number | "N/A" = "N/A"
    if (dbReady()) {
      try {
        feedbackCount = await Journey.countDocuments({ userFeedback: { $exists: true } })
      } catch {
        feedbackCount = "N/A"
      }
    }

    return {
      users,
      journeys,
      savedRoutes,
      savedDestinations,
      crowdReports,
      accessibilityRecords,
      feedback: feedbackCount,
      databaseConnected: dbReady(),
    }
  },

  // ── Stations (Part 11/12) — reuses the existing Accessibility collection as
  // the station registry rather than introducing a duplicate Station model,
  // since it already carries stationId/stationName/coordinates/transportMode. ──

  async listStations() {
    if (!dbReady()) return DEMO_ACCESSIBILITY_DATA
    const stored = await Accessibility.find().sort({ stationName: 1 })
    return stored.length > 0 ? stored : DEMO_ACCESSIBILITY_DATA
  },

  async createStation(input: {
    stationId: string
    stationName: string
    transportMode: "metro" | "bus"
    latitude?: number | null
    longitude?: number | null
  }) {
    if (!dbReady()) throw new AppError("Database not configured — station management requires MongoDB.", 503)
    if (!input.stationId?.trim() || !input.stationName?.trim()) {
      throw new AppError("stationId and stationName are required.", 400)
    }
    if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
      throw new AppError("Invalid latitude.", 400)
    }
    if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
      throw new AppError("Invalid longitude.", 400)
    }
    const existing = await Accessibility.findOne({ stationId: input.stationId.trim() })
    if (existing) throw new AppError(`Station ID "${input.stationId}" already exists.`, 409)

    return Accessibility.create({
      stationId: input.stationId.trim(),
      stationName: input.stationName.trim(),
      transportMode: input.transportMode,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status: "unknown",
      lastVerified: new Date(),
      verificationSource: "synthetic_demo",
      active: true,
    })
  },

  async updateStation(stationId: string, updates: Record<string, unknown>) {
    if (!dbReady()) throw new AppError("Database not configured — station management requires MongoDB.", 503)
    const station = await Accessibility.findOne({ stationId })
    if (!station) throw new AppError("Station not found.", 404)

    const allowed = ["stationName", "latitude", "longitude", "active", "notes"] as const
    for (const key of allowed) {
      if (key in updates) (station as any)[key] = updates[key]
    }
    await station.save()
    return station
  },

  async deactivateStation(stationId: string) {
    if (!dbReady()) throw new AppError("Database not configured — station management requires MongoDB.", 503)
    const station = await Accessibility.findOne({ stationId })
    if (!station) throw new AppError("Station not found.", 404)
    station.active = false
    await station.save()
    return station
  },

  async deleteStation(stationId: string) {
    if (!dbReady()) throw new AppError("Database not configured — station management requires MongoDB.", 503)
    const inUse = await CrowdReport.exists({ stationId })
    if (inUse) {
      throw new AppError("This station has associated crowd reports — deactivate it instead of deleting.", 409)
    }
    const deleted = await Accessibility.findOneAndDelete({ stationId })
    if (!deleted) throw new AppError("Station not found.", 404)
    return deleted
  },

  // ── Accessibility / lift status (Parts 13-17) ──────────────────────────────

  async updateAccessibility(stationId: string, updates: Record<string, unknown>) {
    if (!dbReady()) throw new AppError("Database not configured — accessibility management requires MongoDB.", 503)
    const record = await Accessibility.findOne({ stationId })
    if (!record) throw new AppError("Accessibility record not found.", 404)

    const allowed = [
      "hasLift", "hasRamp", "hasEscalator", "stairCount", "tactilePaving",
      "accessibleToilet", "wheelchairAccessible", "stepFreeEntrance", "stepFreePlatform", "notes",
    ] as const
    for (const key of allowed) {
      if (key in updates) (record as any)[key] = updates[key]
    }

    // A broken lift is a hard, immediate downgrade — the next route search reads
    // this record directly from Mongo (accessibilityService.listStations /
    // getStation have no caching layer), so this takes effect right away.
    //
    // BUG FIX (Problem 23 completion): this used to only recompute "accessible"
    // when the record was previously "not_accessible" — so a brand-new station
    // (status: "unknown" from createStation) that was immediately given a
    // working lift + ramp + wheelchair access stayed stuck at "unknown" forever.
    // Recompute status any time hasLift is explicitly set true, regardless of
    // the prior status, so newly-configured stations reflect their real fields.
    if ("hasLift" in updates && updates.hasLift === false) {
      record.wheelchairAccessible = false
      record.status = "not_accessible"
    } else if ("hasLift" in updates && updates.hasLift === true) {
      record.status = record.hasRamp || record.wheelchairAccessible ? "accessible" : "partially_accessible"
    }

    record.lastVerified = new Date()
    await record.save()
    return record
  },

  async setLiftStatus(stationId: string, liftStatus: "working" | "broken") {
    if (liftStatus !== "working" && liftStatus !== "broken") {
      throw new AppError('liftStatus must be "working" or "broken".', 400)
    }
    return this.updateAccessibility(stationId, { hasLift: liftStatus === "working" })
  },

  // ── Crowd (Part 18/19) ──────────────────────────────────────────────────────

  async listCrowdReports(limit = 100) {
    if (!dbReady()) return []
    return CrowdReport.find().sort({ reportedAt: -1 }).limit(limit)
  },

  async deleteCrowdReport(reportId: string) {
    if (!dbReady()) throw new AppError("Database not configured.", 503)
    const deleted = await CrowdReport.findByIdAndDelete(reportId)
    if (!deleted) throw new AppError("Crowd report not found.", 404)
    return deleted
  },

  // ── Feedback (Part 21-23) — reuses Journey.userFeedback, never a new collection ──

  async listFeedback(filters: { rating?: number; issue?: string } = {}) {
    if (!dbReady()) return []
    const query: Record<string, unknown> = { userFeedback: { $exists: true } }
    if (filters.rating) query["userFeedback.rating"] = filters.rating
    if (filters.issue) query["userFeedback.issues"] = filters.issue

    const journeys = await Journey.find(query)
      .sort({ "userFeedback.createdAt": -1 })
      .limit(200)
      .populate("userId", "name email")
      .select("origin destination userFeedback userId createdAt")

    // Never leak password/token — select() above already excludes them, and the
    // populate only requests name/email, but strip defensively in case the
    // populated user document shape ever changes.
    return journeys.map((j) => {
      const obj = j.toObject() as any
      if (obj.userId && typeof obj.userId === "object") {
        delete obj.userId.password
      }
      return obj
    })
  },

  // ── Dataset (Part 24-26) ────────────────────────────────────────────────────

  async getDatasetInfo() {
    const accessibilityCount = dbReady()
      ? await Accessibility.countDocuments().catch(() => DEMO_ACCESSIBILITY_DATA.length)
      : DEMO_ACCESSIBILITY_DATA.length
    const crowdCount = await safeCount(CrowdReport)

    return [
      {
        dataset: "Accessibility dataset",
        records: accessibilityCount,
        source: dbReady() && accessibilityCount !== DEMO_ACCESSIBILITY_DATA.length ? "Admin-managed + synthetic demo baseline" : "Synthetic demo dataset",
        status: "active",
      },
      {
        dataset: "Crowd reports",
        records: crowdCount,
        source: "Authenticated user reports (real, timestamped)",
        status: "active",
      },
      {
        dataset: "Transit route dataset",
        records: "static demo corridor",
        source: "Synthetic demo dataset (backend/src/data/transitData.ts) — not live GTFS",
        status: "active",
      },
    ]
  },
}

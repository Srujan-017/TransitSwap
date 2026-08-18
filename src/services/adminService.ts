import api from "./api"
import type { AdminOverview, AdminStation, AdminCrowdReport, AdminFeedbackRecord, AdminDatasetInfo } from "../types/admin"

export const adminService = {
  async getOverview(): Promise<AdminOverview> {
    const { data } = await api.get("/admin/overview")
    return data.data
  },

  async listStations(): Promise<AdminStation[]> {
    const { data } = await api.get("/admin/stations")
    return data.data
  },

  async createStation(input: {
    stationId: string
    stationName: string
    transportMode: "metro" | "bus"
    latitude?: number
    longitude?: number
  }): Promise<AdminStation> {
    const { data } = await api.post("/admin/stations", input)
    return data.data
  },

  async updateStation(stationId: string, updates: Partial<AdminStation>): Promise<AdminStation> {
    const { data } = await api.put(`/admin/stations/${stationId}`, updates)
    return data.data
  },

  async deactivateStation(stationId: string): Promise<AdminStation> {
    const { data } = await api.put(`/admin/stations/${stationId}/deactivate`)
    return data.data
  },

  async deleteStation(stationId: string): Promise<void> {
    await api.delete(`/admin/stations/${stationId}`)
  },

  async updateAccessibility(stationId: string, updates: Partial<AdminStation>): Promise<AdminStation> {
    const { data } = await api.put(`/admin/accessibility/${stationId}`, updates)
    return data.data
  },

  async setLiftStatus(stationId: string, liftStatus: "working" | "broken"): Promise<AdminStation> {
    const { data } = await api.put(`/admin/accessibility/${stationId}/lift`, { liftStatus })
    return data.data
  },

  async listCrowdReports(): Promise<AdminCrowdReport[]> {
    const { data } = await api.get("/admin/crowd")
    return data.data
  },

  async deleteCrowdReport(reportId: string): Promise<void> {
    await api.delete(`/admin/crowd/${reportId}`)
  },

  async listFeedback(filters?: { rating?: number; issue?: string }): Promise<AdminFeedbackRecord[]> {
    const { data } = await api.get("/admin/feedback", { params: filters })
    return data.data
  },

  async getDataset(): Promise<AdminDatasetInfo[]> {
    const { data } = await api.get("/admin/dataset")
    return data.data
  },
}

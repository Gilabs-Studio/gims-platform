import apiClient from "@/lib/api-client";
import type {
  HolidayListResponse,
  HolidayResponse,
  HolidayCalendarResponse,
  CheckHolidayResponse,
  ImportHolidaysResponse,
  CreateHolidayRequest,
  UpdateHolidayRequest,
  DeleteResponse,
} from "../types";

export const holidayService = {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    year?: number;
    type?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: string;
  }): Promise<HolidayListResponse> {
    const response = await apiClient.get<HolidayListResponse>(
      "/hrd/holidays",
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<HolidayResponse> {
    const response = await apiClient.get<HolidayResponse>(
      `/hrd/holidays/${id}`
    );
    return response.data;
  },

  async getByYear(year: number): Promise<HolidayListResponse> {
    const response = await apiClient.get<HolidayListResponse>(
      `/hrd/holidays/year/${year}`
    );
    return response.data;
  },

  async getCalendar(year: number): Promise<HolidayCalendarResponse> {
    const response = await apiClient.get<HolidayCalendarResponse>(
      `/hrd/holidays/calendar/${year}`
    );
    return response.data;
  },

  async checkDate(date: string): Promise<CheckHolidayResponse> {
    const response = await apiClient.get<CheckHolidayResponse>(
      "/hrd/holidays/check",
      { params: { date } }
    );
    return response.data;
  },

  async create(data: CreateHolidayRequest): Promise<HolidayResponse> {
    const response = await apiClient.post<HolidayResponse>(
      "/hrd/holidays",
      data
    );
    return response.data;
  },

  async createBatch(holidays: CreateHolidayRequest[]): Promise<{
    success: boolean;
    data: { created: number; errors: string[] };
  }> {
    const response = await apiClient.post<{
      success: boolean;
      data: { created: number; errors: string[] };
    }>("/hrd/holidays/batch", { holidays });
    return response.data;
  },

  async importCSV(file: File, year: number): Promise<ImportHolidaysResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("year", year.toString());

    const response = await apiClient.post<ImportHolidaysResponse>(
      "/hrd/holidays/import",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateHolidayRequest
  ): Promise<HolidayResponse> {
    const response = await apiClient.put<HolidayResponse>(
      `/hrd/holidays/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>(
      `/hrd/holidays/${id}`
    );
    return response.data;
  },
};

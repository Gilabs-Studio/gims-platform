import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  ListJournalLinesParams,
  ListJournalLinesResponse,
} from "../types";

const BASE_URL = "/finance/journal-lines";

export const journalLinesService = {
  /**
   * List journal lines with filter, pagination, and running balance.
   * Running balance is only calculated when chart_of_account_id is provided.
   */
  list: async (
    params?: ListJournalLinesParams
  ): Promise<ApiResponse<ListJournalLinesResponse>> => {
    const response = await apiClient.get<
      ApiResponse<ListJournalLinesResponse>
    >(BASE_URL, { params });
    return response.data;
  },

  /**
   * Export filtered journal lines as CSV.
   * Returns a Blob for browser download.
   */
  export: async (params?: ListJournalLinesParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};

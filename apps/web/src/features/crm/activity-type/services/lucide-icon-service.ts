import type { ApiResponse, PaginationMeta } from "../types";

export interface LucideIconItem {
  name: string;
  label: string;
}

export interface LucideIconListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

type LucideIconListResponse = ApiResponse<LucideIconItem[]> & {
  meta?: {
    pagination?: PaginationMeta;
  };
};

export const lucideIconService = {
  list: async (params?: LucideIconListParams): Promise<LucideIconListResponse> => {
    const query = new URLSearchParams();

    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.search?.trim()) query.set("search", params.search.trim());

    const response = await fetch(`/api/lucide-icons?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch icon catalog");
    }

    return (await response.json()) as LucideIconListResponse;
  },
};

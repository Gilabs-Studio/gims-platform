import { apiClient as request } from "@/lib/api-client";
import { StockMovementFilter, StockMovementResponse } from "../types";

const BASE_URL = "/stock/movements";

export const stockMovementService = {
  getMovements: async (filter: StockMovementFilter) => {
    const params = new URLSearchParams();
    params.append("page", filter.page.toString());
    params.append("per_page", filter.per_page.toString());
    
    if (filter.search) params.append("search", filter.search);
    if (filter.warehouse_id) params.append("warehouse_id", filter.warehouse_id);
    if (filter.product_id) params.append("product_id", filter.product_id);
    if (filter.type && filter.type !== "all") params.append("type", filter.type);
    if (filter.start_date) params.append("start_date", filter.start_date);
    if (filter.end_date) params.append("end_date", filter.end_date);

    return request.get<StockMovementResponse>(`${BASE_URL}?${params.toString()}`);
  },
};

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard-service";
import type { Invoice, InvoiceSummary } from "../types";

interface UseInvoicesParams {
  page?: number;
  per_page?: number;
  status?: "all" | "unpaid" | "paid" | "recent_request";
}

interface UseInvoicesResult {
  invoices: Invoice[];
  summary?: InvoiceSummary;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export function useInvoices(params?: UseInvoicesParams) {
  return useQuery<UseInvoicesResult>({
    queryKey: ["dashboard", "invoices", params],
    queryFn: async () => {
      const response = await dashboardService.getInvoices(params);
      return {
        invoices: response.data,
        summary: response.meta.summary,
        pagination: response.meta.pagination,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}


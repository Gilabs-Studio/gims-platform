// import apiClient from "@/lib/api-client";
import type {
  DashboardOverviewResponse,
  ListInvoicesResponse,
  Invoice,
} from "../types";

// Mock data for dashboard overview
const mockDashboardOverview: DashboardOverviewResponse = {
  success: true,
  data: {
    deliveries: {
      total: 156,
      pending: 23,
      completed: 133,
      total_formatted: "156",
      pending_formatted: "23",
      completed_formatted: "133",
      change_percent: 12.5,
    },
    revenue_costs: {
      revenue: {
        label: "Revenue",
        data: [
          45000000, 52000000, 48000000, 55000000, 60000000, 58000000,
          62000000, 59000000, 65000000, 68000000, 70000000, 72000000,
        ],
        formatted: [
          "Rp 45.000.000",
          "Rp 52.000.000",
          "Rp 48.000.000",
          "Rp 55.000.000",
          "Rp 60.000.000",
          "Rp 58.000.000",
          "Rp 62.000.000",
          "Rp 59.000.000",
          "Rp 65.000.000",
          "Rp 68.000.000",
          "Rp 70.000.000",
          "Rp 72.000.000",
        ],
      },
      costs: {
        label: "Costs",
        data: [
          35000000, 40000000, 38000000, 42000000, 45000000, 44000000,
          48000000, 46000000, 50000000, 52000000, 54000000, 55000000,
        ],
        formatted: [
          "Rp 35.000.000",
          "Rp 40.000.000",
          "Rp 38.000.000",
          "Rp 42.000.000",
          "Rp 45.000.000",
          "Rp 44.000.000",
          "Rp 48.000.000",
          "Rp 46.000.000",
          "Rp 50.000.000",
          "Rp 52.000.000",
          "Rp 54.000.000",
          "Rp 55.000.000",
        ],
      },
      period: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
    },
    balance: {
      current: 125000000,
      previous: 110000000,
      change_percent: 13.6,
      current_formatted: "Rp 125.000.000",
      previous_formatted: "Rp 110.000.000",
      chart_data: [
        { period: "Jan", value: 95000000, formatted: "Rp 95.000.000" },
        { period: "Feb", value: 105000000, formatted: "Rp 105.000.000" },
        { period: "Mar", value: 100000000, formatted: "Rp 100.000.000" },
        { period: "Apr", value: 115000000, formatted: "Rp 115.000.000" },
        { period: "May", value: 120000000, formatted: "Rp 120.000.000" },
        { period: "Jun", value: 125000000, formatted: "Rp 125.000.000" },
        { period: "Jul", value: 130000000, formatted: "Rp 130.000.000" },
        { period: "Aug", value: 128000000, formatted: "Rp 128.000.000" },
        { period: "Sep", value: 135000000, formatted: "Rp 135.000.000" },
        { period: "Oct", value: 140000000, formatted: "Rp 140.000.000" },
        { period: "Nov", value: 145000000, formatted: "Rp 145.000.000" },
        { period: "Dec", value: 150000000, formatted: "Rp 150.000.000" },
      ],
    },
    costs_by_category: [
      {
        category: "Operational",
        amount: 25000000,
        amount_formatted: "Rp 25.000.000",
        percentage: 45.5,
        color: "#3b82f6",
      },
      {
        category: "Marketing",
        amount: 15000000,
        amount_formatted: "Rp 15.000.000",
        percentage: 27.3,
        color: "#10b981",
      },
      {
        category: "Administration",
        amount: 8000000,
        amount_formatted: "Rp 8.000.000",
        percentage: 14.5,
        color: "#f59e0b",
      },
      {
        category: "Other",
        amount: 7000000,
        amount_formatted: "Rp 7.000.000",
        percentage: 12.7,
        color: "#ef4444",
      },
    ],
    invoices_summary: {
      total: 45,
      unpaid: 12,
      paid: 28,
      recent_requests: 5,
      total_formatted: "45",
      unpaid_formatted: "12",
      paid_formatted: "28",
      recent_requests_formatted: "5",
    },
  },
  timestamp: new Date().toISOString(),
  request_id: `req_${Date.now()}`,
};

// Mock invoices data
const mockInvoices: Invoice[] = [
  {
    id: "inv_001",
    company: "PT ABC Sejahtera",
    issue_date: "2024-01-15",
    contact: "John Doe",
    value: 5000000,
    value_formatted: "Rp 5.000.000",
    status: "unpaid",
  },
  {
    id: "inv_002",
    company: "CV XYZ Mandiri",
    issue_date: "2024-01-14",
    contact: "Jane Smith",
    value: 7500000,
    value_formatted: "Rp 7.500.000",
    status: "paid",
  },
  {
    id: "inv_003",
    company: "PT Global Tech",
    issue_date: "2024-01-13",
    contact: "Bob Johnson",
    value: 12000000,
    value_formatted: "Rp 12.000.000",
    status: "unpaid",
  },
  {
    id: "inv_004",
    company: "PT Digital Solutions",
    issue_date: "2024-01-12",
    contact: "Alice Williams",
    value: 3500000,
    value_formatted: "Rp 3.500.000",
    status: "recent_request",
  },
  {
    id: "inv_005",
    company: "CV Modern Enterprise",
    issue_date: "2024-01-11",
    contact: "Charlie Brown",
    value: 9000000,
    value_formatted: "Rp 9.000.000",
    status: "paid",
  },
  {
    id: "inv_006",
    company: "PT Innovation Hub",
    issue_date: "2024-01-10",
    contact: "Diana Prince",
    value: 15000000,
    value_formatted: "Rp 15.000.000",
    status: "unpaid",
  },
  {
    id: "inv_007",
    company: "PT Smart Systems",
    issue_date: "2024-01-09",
    contact: "Edward Norton",
    value: 6000000,
    value_formatted: "Rp 6.000.000",
    status: "paid",
  },
  {
    id: "inv_008",
    company: "CV Tech Solutions",
    issue_date: "2024-01-08",
    contact: "Fiona Green",
    value: 4200000,
    value_formatted: "Rp 4.200.000",
    status: "recent_request",
  },
  {
    id: "inv_009",
    company: "PT Future Corp",
    issue_date: "2024-01-07",
    contact: "George White",
    value: 11000000,
    value_formatted: "Rp 11.000.000",
    status: "unpaid",
  },
  {
    id: "inv_010",
    company: "PT Advanced Systems",
    issue_date: "2024-01-06",
    contact: "Helen Black",
    value: 8000000,
    value_formatted: "Rp 8.000.000",
    status: "paid",
  },
  {
    id: "inv_011",
    company: "CV Dynamic Solutions",
    issue_date: "2024-01-05",
    contact: "Ian Gray",
    value: 5500000,
    value_formatted: "Rp 5.500.000",
    status: "unpaid",
  },
  {
    id: "inv_012",
    company: "PT Mega Corp",
    issue_date: "2024-01-04",
    contact: "Julia Red",
    value: 13000000,
    value_formatted: "Rp 13.000.000",
    status: "paid",
  },
  {
    id: "inv_013",
    company: "PT Cloud Services",
    issue_date: "2024-01-03",
    contact: "Kevin Blue",
    value: 7200000,
    value_formatted: "Rp 7.200.000",
    status: "recent_request",
  },
  {
    id: "inv_014",
    company: "CV Data Analytics",
    issue_date: "2024-01-02",
    contact: "Laura Yellow",
    value: 9500000,
    value_formatted: "Rp 9.500.000",
    status: "unpaid",
  },
  {
    id: "inv_015",
    company: "PT Network Solutions",
    issue_date: "2024-01-01",
    contact: "Mike Orange",
    value: 4800000,
    value_formatted: "Rp 4.800.000",
    status: "paid",
  },
];

// Helper function to filter invoices by status
function filterInvoicesByStatus(
  invoices: Invoice[],
  status?: "all" | "unpaid" | "paid" | "recent_request",
): Invoice[] {
  if (!status || status === "all") {
    return invoices;
  }
  return invoices.filter((invoice) => invoice.status === status);
}

export const dashboardService = {
  async getOverview(): Promise<DashboardOverviewResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock data
    return mockDashboardOverview;

    // Uncomment below when API is ready
    // const response = await apiClient.get<DashboardOverviewResponse>(
    //   "/general/dashboard/overview",
    // );
    // return response.data;
  },

  async getInvoices(params?: {
    page?: number;
    per_page?: number;
    status?: "all" | "unpaid" | "paid" | "recent_request";
  }): Promise<ListInvoicesResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 10;
    const status = params?.status ?? "all";

    // Filter invoices by status
    const filteredInvoices = filterInvoicesByStatus(mockInvoices, status);

    // Calculate pagination
    const total = filteredInvoices.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    // Calculate summary based on all invoices (not filtered)
    const summary = {
      total: mockInvoices.length,
      unpaid: mockInvoices.filter((inv) => inv.status === "unpaid").length,
      paid: mockInvoices.filter((inv) => inv.status === "paid").length,
      recent_requests: mockInvoices.filter(
        (inv) => inv.status === "recent_request",
      ).length,
      total_formatted: String(mockInvoices.length),
      unpaid_formatted: String(
        mockInvoices.filter((inv) => inv.status === "unpaid").length,
      ),
      paid_formatted: String(
        mockInvoices.filter((inv) => inv.status === "paid").length,
      ),
      recent_requests_formatted: String(
        mockInvoices.filter((inv) => inv.status === "recent_request").length,
      ),
    };

    const response: ListInvoicesResponse = {
      success: true,
      data: paginatedInvoices,
      meta: {
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
        summary,
      },
      timestamp: new Date().toISOString(),
      request_id: `req_${Date.now()}`,
    };

    return response;

    // Uncomment below when API is ready
    // const response = await apiClient.get<ListInvoicesResponse>(
    //   "/general/dashboard/invoices",
    //   { params },
    // );
    // return response.data;
  },
};


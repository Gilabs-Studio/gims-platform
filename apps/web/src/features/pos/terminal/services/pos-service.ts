import apiClient from "@/lib/api-client";
import type {
  ApiResponse,
  POSOrder,
  CreateOrderRequest,
  ConfirmOrderRequest,
  VoidOrderRequest,
  AddOrderItemRequest,
  UpdateOrderItemRequest,
  AssignTableRequest,
  POSOrderListParams,
  POSCatalogItem,
  POSPayment,
  ProcessPaymentRequest,
  POSConfig,
} from "../types";

const BASE = "/pos";

// ─── Orders ───────────────────────────────────────────────────────────────────

export const posOrderService = {
  create(data: CreateOrderRequest) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders`, data)
      .then((r) => r.data);
  },

  getById(id: string) {
    return apiClient
      .get<ApiResponse<POSOrder>>(`${BASE}/orders/${id}`)
      .then((r) => r.data);
  },

  list(params?: POSOrderListParams) {
    return apiClient
      .get<ApiResponse<POSOrder[]>>(`${BASE}/orders`, { params })
      .then((r) => r.data);
  },

  confirm(id: string, data: ConfirmOrderRequest) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders/${id}/confirm`, data)
      .then((r) => r.data);
  },

  void(id: string, data: VoidOrderRequest) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders/${id}/void`, data)
      .then((r) => r.data);
  },

  addItem(orderId: string, data: AddOrderItemRequest) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/items`, data)
      .then((r) => r.data);
  },

  updateItem(orderId: string, itemId: string, data: UpdateOrderItemRequest) {
    return apiClient
      .put<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/items/${itemId}`, data)
      .then((r) => r.data);
  },

  removeItem(orderId: string, itemId: string) {
    return apiClient
      .delete<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/items/${itemId}`)
      .then((r) => r.data);
  },

  assignTable(orderId: string, data: AssignTableRequest) {
    return apiClient
      .put<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/table`, data)
      .then((r) => r.data);
  },

  serve(orderId: string) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/serve`)
      .then((r) => r.data);
  },

  complete(orderId: string) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/complete`)
      .then((r) => r.data);
  },

  getCatalog(outletId: string) {
    return apiClient
      .get<ApiResponse<POSCatalogItem[]>>(`${BASE}/catalog/outlet/${outletId}`)
      .then((r) => r.data);
  },
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const posPaymentService = {
  processCash(orderId: string, data: ProcessPaymentRequest) {
    return apiClient
      .post<ApiResponse<POSPayment>>(`${BASE}/orders/${orderId}/payments/cash`, data)
      .then((r) => r.data);
  },

  initiateMidtrans(orderId: string, data: ProcessPaymentRequest) {
    return apiClient
      .post<ApiResponse<POSPayment>>(`${BASE}/orders/${orderId}/payments/midtrans`, data)
      .then((r) => r.data);
  },

  getByOrderId(orderId: string) {
    return apiClient
      .get<ApiResponse<POSPayment[]>>(`${BASE}/orders/${orderId}/payments`)
      .then((r) => r.data);
  },
};

// ─── Config ───────────────────────────────────────────────────────────────────

export const posConfigService = {
  getByOutlet(outletId: string) {
    return apiClient
      .get<ApiResponse<POSConfig>>(`${BASE}/config/outlet/${outletId}`)
      .then((r) => r.data);
  },
};

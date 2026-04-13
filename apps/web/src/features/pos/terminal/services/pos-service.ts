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
  XenditConfig,
  XenditConnectionStatusResponse,
  ConnectXenditRequest,
  UpdateXenditConfigRequest,
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

  serveItem(orderId: string, itemId: string) {
    return apiClient
      .post<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/items/${itemId}/serve`)
      .then((r) => r.data);
  },

  /** Returns the absolute URL for opening the HTML receipt in a new tab. */
  getReceiptUrl(orderId: string): string {
    return `/api/v1/pos/orders/${orderId}/receipt`;
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

  initiateDigital(orderId: string, data: ProcessPaymentRequest) {
    return apiClient
      .post<ApiResponse<POSPayment>>(`${BASE}/orders/${orderId}/payments/digital`, data)
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

// ─── Xendit Payment Config ─────────────────────────────────────────────────────

export const xenditConfigService = {
  getConnectionStatus() {
    return apiClient
      .get<ApiResponse<XenditConnectionStatusResponse>>(`${BASE}/payment/status`)
      .then((r) => r.data);
  },

  getConfig() {
    return apiClient
      .get<ApiResponse<XenditConfig>>(`${BASE}/payment/config`)
      .then((r) => r.data);
  },

  connect(data: ConnectXenditRequest) {
    return apiClient
      .post<ApiResponse<XenditConfig>>(`${BASE}/payment/config/connect`, data)
      .then((r) => r.data);
  },

  update(data: UpdateXenditConfigRequest) {
    return apiClient
      .patch<ApiResponse<XenditConfig>>(`${BASE}/payment/config`, data)
      .then((r) => r.data);
  },

  disconnect() {
    return apiClient
      .delete<ApiResponse<XenditConfig>>(`${BASE}/payment/config/disconnect`)
      .then((r) => r.data);
  },
};

import apiClient from "@/lib/api-client";
import type {
  ApiResponse,
  POSOrder,
  CreateOrderRequest,
  ConfirmOrderRequest,
  VoidOrderRequest,
  AddOrderItemRequest,
  UpdateOrderItemRequest,
  SyncOrderItemsRequest,
  AssignTableRequest,
  POSOrderListParams,
  POSCatalogItem,
  POSPayment,
  ProcessPaymentRequest,
  POSConfig,
  UpdatePOSReceiptWhatsAppTemplateRequest,
  XenditConfig,
  XenditConnectionStatusResponse,
  ConnectXenditRequest,
  UpdateXenditConfigRequest,
  POSSettlementOverview,
  POSSettlementPayoutChannel,
  CreatePOSSettlementPayoutRequest,
  POSSettlementPayout,
  ValidatePOSBankAccountResponse,
} from "../types";
import type {
  Outlet,
  OutletListResponse,
} from "@/features/master-data/outlet/types";

const BASE = "/pos";
const API_BASE_URL_FALLBACK = "http://localhost:8087";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveReceiptApiBaseUrl(): string {
  const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredApiBase) {
    return normalizeBaseUrl(configuredApiBase);
  }

  // In browser runtime, prefer current origin to avoid localhost fallback on production.
  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return API_BASE_URL_FALLBACK;
}

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

  delete(id: string) {
    return apiClient
      .delete<ApiResponse<{ deleted: boolean }>>(`${BASE}/orders/${id}`)
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

  syncItems(orderId: string, data: SyncOrderItemsRequest) {
    return apiClient
      .put<ApiResponse<POSOrder>>(`${BASE}/orders/${orderId}/items/sync`, data)
      .then((r) => r.data);
  },

  updateItem(orderId: string, itemId: string, data: UpdateOrderItemRequest) {
    return apiClient
      .put<
        ApiResponse<POSOrder>
      >(`${BASE}/orders/${orderId}/items/${itemId}`, data)
      .then((r) => r.data);
  },

  removeItem(orderId: string, itemId: string) {
    return apiClient
      .delete<
        ApiResponse<POSOrder>
      >(`${BASE}/orders/${orderId}/items/${itemId}`)
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
      .post<
        ApiResponse<POSOrder>
      >(`${BASE}/orders/${orderId}/items/${itemId}/serve`)
      .then((r) => r.data);
  },

  /** Returns the absolute URL for opening the HTML receipt in a new tab. */
  getReceiptUrl(orderId: string): string {
    return `${resolveReceiptApiBaseUrl()}/api/v1/pos/orders/${orderId}/receipt`;
  },

  getCatalog(outletId: string) {
    return apiClient
      .get<ApiResponse<POSCatalogItem[]>>(`${BASE}/catalog/outlet/${outletId}`)
      .then((r) => r.data);
  },

  listOutlets() {
    return apiClient
      .get<OutletListResponse<Outlet>>(`${BASE}/outlets`)
      .then((r) => r.data);
  },
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const posPaymentService = {
  processCash(orderId: string, data: ProcessPaymentRequest) {
    return apiClient
      .post<
        ApiResponse<POSPayment>
      >(`${BASE}/orders/${orderId}/payments/cash`, data)
      .then((r) => r.data);
  },

  initiateDigital(orderId: string, data: ProcessPaymentRequest) {
    return apiClient
      .post<
        ApiResponse<POSPayment>
      >(`${BASE}/orders/${orderId}/payments/digital`, data)
      .then((r) => r.data);
  },

  syncDigital(orderId: string, paymentId: string) {
    return apiClient
      .post<
        ApiResponse<POSPayment>
      >(`${BASE}/orders/${orderId}/payments/${paymentId}/sync`)
      .then((r) => r.data);
  },

  getByOrderId(orderId: string) {
    return apiClient
      .get<ApiResponse<POSPayment[]>>(`${BASE}/orders/${orderId}/payments`)
      .then((r) => r.data);
  },

  cancelPending(orderId: string, paymentId: string, reason?: string) {
    return apiClient
      .post<ApiResponse<{ cancelled: boolean }>>(
        `${BASE}/orders/${orderId}/payments/${paymentId}/cancel`,
        {
          reason,
        },
      )
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

  updateReceiptWhatsAppTemplate(
    outletId: string,
    data: UpdatePOSReceiptWhatsAppTemplateRequest,
  ) {
    return apiClient
      .put<
        ApiResponse<POSConfig>
      >(`${BASE}/config/outlet/${outletId}/receipt-whatsapp-template`, data)
      .then((r) => r.data);
  },
};

// ─── Xendit Payment Config ─────────────────────────────────────────────────────

export const xenditConfigService = {
  getConnectionStatus() {
    return apiClient
      .get<
        ApiResponse<XenditConnectionStatusResponse>
      >(`${BASE}/payment/status`)
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

// ─── Settlement ───────────────────────────────────────────────────────────────

export const posSettlementService = {
  getOverview() {
    return apiClient
      .get<ApiResponse<POSSettlementOverview>>(`${BASE}/settlement/overview`)
      .then((r) => r.data);
  },

  getPayoutChannels() {
    return apiClient
      .get<ApiResponse<POSSettlementPayoutChannel[]>>(
        `${BASE}/settlement/payout-channels`,
        {
          params: {
            currency: "IDR",
          },
        },
      )
      .then((r) => r.data);
  },

  createPayout(data: CreatePOSSettlementPayoutRequest) {
    return apiClient
      .post<ApiResponse<POSSettlementPayout>>(
        `${BASE}/settlement/payouts`,
        data,
        {
          headers: {
            "X-Idempotency-Key": data.idempotency_key,
          },
        },
      )
      .then((r) => r.data);
  },

  getPayouts() {
    return apiClient
      .get<ApiResponse<POSSettlementPayout[]>>(`${BASE}/settlement/payouts`)
      .then((r) => r.data);
  },

  validateBankAccount(bankCode: string, accountNumber: string) {
    return apiClient
      .post<ApiResponse<ValidatePOSBankAccountResponse>>(
        `${BASE}/settlement/validate-bank-account`,
        { bank_code: bankCode, account_number: accountNumber }
      )
      .then((r) => r.data);
  },

  requestPayoutOTP(amount: number) {
    return apiClient
      .post<ApiResponse<{ message: string }>>(
        `${BASE}/settlement/payouts/request-otp`,
        { amount }
      )
      .then((r) => r.data);
  },
};

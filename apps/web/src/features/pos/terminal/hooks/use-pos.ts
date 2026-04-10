import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { posOrderService, posPaymentService, posConfigService, xenditConfigService } from "../services/pos-service";
import type {
  CreateOrderRequest,
  ConfirmOrderRequest,
  VoidOrderRequest,
  AddOrderItemRequest,
  UpdateOrderItemRequest,
  AssignTableRequest,
  POSOrderListParams,
  ProcessPaymentRequest,
  ConnectXenditRequest,
  UpdateXenditConfigRequest,
} from "../types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const posKeys = {
  all: ["pos"] as const,
  orders: () => [...posKeys.all, "orders"] as const,
  order: (id: string) => [...posKeys.orders(), id] as const,
  orderList: (params?: POSOrderListParams) => [...posKeys.orders(), "list", params] as const,
  catalog: (outletId: string) => [...posKeys.all, "catalog", outletId] as const,
  payments: (orderId: string) => [...posKeys.all, "payments", orderId] as const,
  config: (outletId: string) => [...posKeys.all, "config", outletId] as const,
  xenditStatus: () => [...posKeys.all, "xendit", "status"] as const,
  xenditConfig: () => [...posKeys.all, "xendit", "config"] as const,
};

// ─── Catalog hook ─────────────────────────────────────────────────────────────

export function usePOSCatalog(outletId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.catalog(outletId),
    queryFn: () => posOrderService.getCatalog(outletId),
    enabled: !!outletId && options?.enabled !== false,
    staleTime: 30_000, // catalog is relatively stable; refresh every 30s
  });
}

// ─── Order hooks ─────────────────────────────────────────────────────────────

export function usePOSOrder(
  id: string,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: posKeys.order(id),
    queryFn: () => posOrderService.getById(id),
    enabled: !!id && options?.enabled !== false,
    // Stop polling automatically once the order reaches a terminal state so we
    // don't spam the server after checkout. Callers may override via options.
    refetchInterval:
      options?.refetchInterval !== undefined
        ? options.refetchInterval
        : (query) => {
            const status = (
              query.state.data as { data?: { status: string } } | undefined
            )?.data?.status;
            if (
              status === "PAID" ||
              status === "COMPLETED" ||
              status === "VOIDED"
            )
              return false;
            return 5_000;
          },
  });
}

export function usePOSOrderList(params?: POSOrderListParams, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: posKeys.orderList(params),
    queryFn: () => posOrderService.list(params),
    enabled: !!params?.outlet_id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderRequest) => posOrderService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

export function useConfirmOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmOrderRequest }) =>
      posOrderService.confirm(id, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
    },
  });
}

export function useVoidOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoidOrderRequest }) =>
      posOrderService.void(id, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

export function useAddOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: AddOrderItemRequest }) =>
      posOrderService.addItem(orderId, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
    },
  });
}

export function useUpdateOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      data,
    }: {
      orderId: string;
      itemId: string;
      data: UpdateOrderItemRequest;
    }) => posOrderService.updateItem(orderId, itemId, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
    },
  });
}

export function useRemoveOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      posOrderService.removeItem(orderId, itemId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
    },
  });
}

export function useAssignTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: AssignTableRequest }) =>
      posOrderService.assignTable(orderId, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
    },
  });
}

// ─── Payment hooks ────────────────────────────────────────────────────────────

export function usePOSPayments(orderId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.payments(orderId),
    queryFn: () => posPaymentService.getByOrderId(orderId),
    enabled: !!orderId && options?.enabled !== false,
  });
}

export function useProcessCashPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: ProcessPaymentRequest }) =>
      posPaymentService.processCash(orderId, data),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: posKeys.order(orderId) });
      qc.invalidateQueries({ queryKey: posKeys.payments(orderId) });
    },
    onError: () => {
      toast.error("Payment failed. Please try again.");
    },
  });
}

export function useInitiateDigitalPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: ProcessPaymentRequest }) =>
      posPaymentService.initiateDigital(orderId, data),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: posKeys.payments(orderId) });
    },
    onError: () => {
      toast.error("Failed to initiate digital payment.");
    },
  });
}

// ─── Xendit config hooks ──────────────────────────────────────────────────────

export function useXenditConnectionStatus() {
  return useQuery({
    queryKey: posKeys.xenditStatus(),
    queryFn: () => xenditConfigService.getConnectionStatus(),
    staleTime: 60_000,
  });
}

export function useXenditConfig() {
  return useQuery({
    queryKey: posKeys.xenditConfig(),
    queryFn: () => xenditConfigService.getConfig(),
    staleTime: 60_000,
  });
}

export function useConnectXendit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConnectXenditRequest) => xenditConfigService.connect(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.xenditStatus() });
      qc.invalidateQueries({ queryKey: posKeys.xenditConfig() });
      toast.success("Xendit account connected successfully.");
    },
    onError: () => {
      toast.error("Failed to connect Xendit account.");
    },
  });
}

export function useUpdateXenditConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateXenditConfigRequest) => xenditConfigService.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.xenditConfig() });
      toast.success("Payment settings updated.");
    },
    onError: () => {
      toast.error("Failed to update payment settings.");
    },
  });
}

export function useDisconnectXendit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => xenditConfigService.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.xenditStatus() });
      qc.invalidateQueries({ queryKey: posKeys.xenditConfig() });
      toast.success("Xendit account disconnected.");
    },
    onError: () => {
      toast.error("Failed to disconnect Xendit account.");
    },
  });
}

// ─── Config hook ──────────────────────────────────────────────────────────────

export function usePOSConfig(outletId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.config(outletId),
    queryFn: () => posConfigService.getByOutlet(outletId),
    enabled: !!outletId && options?.enabled !== false,
    staleTime: 5 * 60_000, // config rarely changes
  });
}

// ─── Serve & Complete order ───────────────────────────────────────────────────

export function useServeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => posOrderService.serve(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

export function useCompleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => posOrderService.complete(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

export function useServeOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      posOrderService.serveItem(orderId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

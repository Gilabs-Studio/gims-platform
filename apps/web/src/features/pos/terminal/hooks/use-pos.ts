import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { posOrderService, posPaymentService, posConfigService } from "../services/pos-service";
import type {
  CreateOrderRequest,
  ConfirmOrderRequest,
  VoidOrderRequest,
  AddOrderItemRequest,
  UpdateOrderItemRequest,
  AssignTableRequest,
  POSOrderListParams,
  ProcessPaymentRequest,
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

export function usePOSOrder(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.order(id),
    queryFn: () => posOrderService.getById(id),
    enabled: !!id && options?.enabled !== false,
    refetchInterval: 5_000, // poll for kitchen status updates
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

export function useInitiateMidtrans() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: ProcessPaymentRequest }) =>
      posPaymentService.initiateMidtrans(orderId, data),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: posKeys.payments(orderId) });
    },
    onError: () => {
      toast.error("Failed to initiate payment gateway.");
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

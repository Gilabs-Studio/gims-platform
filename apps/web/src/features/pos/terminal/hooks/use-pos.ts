import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  posOrderService,
  posPaymentService,
  posConfigService,
  xenditConfigService,
  posSettlementService,
} from "../services/pos-service";
import type {
  CreateOrderRequest,
  ConfirmOrderRequest,
  VoidOrderRequest,
  AddOrderItemRequest,
  UpdateOrderItemRequest,
  AssignTableRequest,
  POSOrderListParams,
  ProcessPaymentRequest,
  POSOrder,
  POSPayment,
  UpdatePOSReceiptWhatsAppTemplateRequest,
  ConnectXenditRequest,
  UpdateXenditConfigRequest,
  CreatePOSSettlementPayoutRequest,
} from "../types";

type POSOrderListCache = { data?: POSOrder[] };
type POSOrderDetailCache = { data?: POSOrder };
type POSMutationOptions = { invalidateOnSuccess?: boolean };

function updateOrderInListCaches(
  qc: ReturnType<typeof useQueryClient>,
  orderId: string,
  updater: (order: POSOrder) => POSOrder,
) {
  qc.setQueriesData<POSOrderListCache>(
    { queryKey: [...posKeys.orders(), "list"] },
    (current) => {
      if (!current?.data?.length) return current;
      return {
        ...current,
        data: current.data.map((order) =>
          order.id === orderId ? updater(order) : order,
        ),
      };
    },
  );
}

function deriveOrderStatusFromItems(
  items: POSOrder["items"],
): POSOrder["status"] {
  if (!items.length) return "PAID";
  const pendingExists = items.some(
    (item) => item.status !== "SERVED" && item.status !== "CANCELLED",
  );
  if (!pendingExists) return "SERVED";
  const servedExists = items.some((item) => item.status === "SERVED");
  return servedExists ? "PARTIAL_SERVED" : "PAID";
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const posKeys = {
  all: ["pos"] as const,
  orders: () => [...posKeys.all, "orders"] as const,
  order: (id: string) => [...posKeys.orders(), id] as const,
  orderList: (params?: POSOrderListParams) =>
    [...posKeys.orders(), "list", params] as const,
  catalog: (outletId: string) => [...posKeys.all, "catalog", outletId] as const,
  payments: (orderId: string) => [...posKeys.all, "payments", orderId] as const,
  config: (outletId: string) => [...posKeys.all, "config", outletId] as const,
  xenditStatus: () => [...posKeys.all, "xendit", "status"] as const,
  xenditConfig: () => [...posKeys.all, "xendit", "config"] as const,
  settlementOverview: () => [...posKeys.all, "settlement", "overview"] as const,
  settlementPayoutChannels: () =>
    [...posKeys.all, "settlement", "payout-channels"] as const,
  settlementPayouts: () => [...posKeys.all, "settlement", "payouts"] as const,
};

// ─── Catalog hook ─────────────────────────────────────────────────────────────

export function usePOSCatalog(
  outletId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: posKeys.catalog(outletId),
    queryFn: () => posOrderService.getCatalog(outletId),
    enabled: !!outletId && options?.enabled !== false,
    staleTime: 30_000, // catalog is relatively stable; refresh every 30s
  });
}

export function usePOSOutlets(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...posKeys.all, "outlets"],
    queryFn: () => posOrderService.listOutlets(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60_000,
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
    refetchInterval: options?.refetchInterval,
  });
}

export function usePOSOrderList(
  params?: POSOrderListParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  },
) {
  return useQuery({
    queryKey: posKeys.orderList(params),
    queryFn: () => posOrderService.list(params),
    enabled: !!params?.outlet_id && options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    staleTime: options?.staleTime ?? Infinity,
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

export function useVoidOrder(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoidOrderRequest }) =>
      posOrderService.void(id, data),
    onSuccess: (result) => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
        qc.invalidateQueries({ queryKey: posKeys.orders() });
      }
    },
  });
}

export function useDeleteOrder(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: (id: string) => posOrderService.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: posKeys.orders() });

      qc.setQueriesData<POSOrderListCache>(
        { queryKey: posKeys.orders() },
        (current) => {
          if (!current?.data?.length) return current;
          return {
            ...current,
            data: current.data.filter((order) => order.id !== id),
          };
        },
      );

      qc.removeQueries({ queryKey: posKeys.order(id) });
    },
    onSuccess: () => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.orders() });
      }
    },
  });
}

export function useAddOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: AddOrderItemRequest;
    }) => posOrderService.addItem(orderId, data),
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

export function useAssignTable(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: AssignTableRequest;
    }) => posOrderService.assignTable(orderId, data),
    onMutate: async ({ orderId }) => {
      await qc.cancelQueries({ queryKey: posKeys.orders() });

      qc.setQueriesData<POSOrderListCache>(
        { queryKey: posKeys.orders() },
        (current) => {
          if (!current?.data?.length) return current;
          return {
            ...current,
            data: current.data.filter((order) => order.id !== orderId),
          };
        },
      );
    },
    onSuccess: (result) => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.order(result.data.id) });
        qc.invalidateQueries({ queryKey: posKeys.orders() });
      }
    },
  });
}

// ─── Payment hooks ────────────────────────────────────────────────────────────

export function usePOSPayments(
  orderId: string,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  },
) {
  return useQuery({
    queryKey: posKeys.payments(orderId),
    queryFn: () => posPaymentService.getByOrderId(orderId),
    enabled: !!orderId && options?.enabled !== false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    staleTime: options?.staleTime,
  });
}

export function useProcessCashPayment(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: ProcessPaymentRequest;
    }) => posPaymentService.processCash(orderId, data),
    onMutate: async ({ orderId }) => {
      await qc.cancelQueries({ queryKey: posKeys.order(orderId) });
      await qc.cancelQueries({ queryKey: posKeys.orders() });

      const previousOrder = qc.getQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
      );

      const orderResponse = qc.getQueryData<{
        data?: {
          outlet_id?: string;
          items?: Array<{ product_id: string; quantity: number }>;
        };
      }>(posKeys.order(orderId));
      const outletId = orderResponse?.data?.outlet_id;

      if (!outletId) {
        return {
          outletId: undefined,
          previousCatalog: undefined as
            | {
                data?: Array<{
                  product_id: string;
                  product_kind: string;
                  stock: number;
                  is_available: boolean;
                }>;
              }
            | undefined,
        };
      }

      await qc.cancelQueries({ queryKey: posKeys.catalog(outletId) });
      const previousCatalog = qc.getQueryData<{
        data?: Array<{
          product_id: string;
          product_kind: string;
          stock: number;
          is_available: boolean;
        }>;
      }>(posKeys.catalog(outletId));

      const qtyMap = new Map<string, number>();
      for (const item of orderResponse?.data?.items ?? []) {
        qtyMap.set(
          item.product_id,
          (qtyMap.get(item.product_id) ?? 0) + item.quantity,
        );
      }

      qc.setQueryData<{
        data?: Array<{
          product_id: string;
          product_kind: string;
          stock: number;
          is_available: boolean;
        }>;
      }>(posKeys.catalog(outletId), (current) => {
        if (!current?.data) {
          return current;
        }
        return {
          ...current,
          data: current.data.map((p) => {
            const soldQty = qtyMap.get(p.product_id) ?? 0;
            if (soldQty <= 0) {
              return p;
            }

            const nextStock = Math.max(0, p.stock - soldQty);
            if (p.product_kind !== "STOCK") {
              return p;
            }

            return {
              ...p,
              stock: nextStock,
              is_available: nextStock > 0,
            };
          }),
        };
      });

      qc.setQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
        (current) => {
          if (!current?.data) return current;
          return {
            ...current,
            data: {
              ...current.data,
              status: "PAID",
            },
          };
        },
      );

      updateOrderInListCaches(qc, orderId, (order) => ({
        ...order,
        status: "PAID",
      }));

      return { outletId, previousCatalog, previousOrder };
    },
    onSuccess: (_, { orderId }) => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.order(orderId) });
        qc.invalidateQueries({ queryKey: posKeys.payments(orderId) });
        qc.invalidateQueries({ queryKey: posKeys.orders() });
        qc.invalidateQueries({ queryKey: [...posKeys.all, "catalog"] });
        return;
      }
      qc.invalidateQueries({ queryKey: posKeys.payments(orderId) });
    },
    onError: (_, variables, context) => {
      if (context?.outletId && context.previousCatalog) {
        qc.setQueryData(
          posKeys.catalog(context.outletId),
          context.previousCatalog,
        );
      }
      if (context?.previousOrder) {
        qc.setQueryData(
          posKeys.order(variables.orderId),
          context.previousOrder,
        );
      }
      qc.invalidateQueries({ queryKey: posKeys.orders() });
      toast.error("Payment failed. Please try again.");
    },
  });
}

export function useInitiateDigitalPayment(options?: POSMutationOptions) {
  void options;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: ProcessPaymentRequest;
    }) => posPaymentService.initiateDigital(orderId, data),
    onSuccess: (result, { orderId }) => {
      if (result.data) {
        qc.setQueryData<{ data?: POSPayment[] }>(
          posKeys.payments(orderId),
          (current) => ({
            ...(current ?? {}),
            data: [result.data],
          }),
        );
      }
    },
    onError: () => {
      toast.error("Failed to initiate digital payment.");
    },
  });
}

export function useCancelPendingPOSPayment(options?: POSMutationOptions) {
  void options;
  return useMutation({
    mutationFn: ({
      orderId,
      paymentId,
      reason,
    }: {
      orderId: string;
      paymentId: string;
      reason?: string;
    }) => posPaymentService.cancelPending(orderId, paymentId, reason),
    onError: () => {
      toast.error("Failed to cancel digital payment.");
    },
  });
}

export function useSyncPOSDigitalPayment(options?: POSMutationOptions) {
  void options;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      paymentId,
    }: {
      orderId: string;
      paymentId: string;
    }) => posPaymentService.syncDigital(orderId, paymentId),
    onSuccess: (result, { orderId }) => {
      if (result.data) {
        qc.setQueryData<{ data?: POSPayment[] }>(
          posKeys.payments(orderId),
          (current) => {
            const existing = current?.data ?? [];
            const exists = existing.some(
              (payment) => payment.id === result.data.id,
            );
            const data = exists
              ? existing.map((payment) =>
                  payment.id === result.data.id ? result.data : payment,
                )
              : [result.data, ...existing];
            return {
              ...(current ?? {}),
              data,
            };
          },
        );
      }
    },
    onError: () => {
      toast.error("Failed to refresh payment status.");
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
    mutationFn: (data: ConnectXenditRequest) =>
      xenditConfigService.connect(data),
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
    mutationFn: (data: UpdateXenditConfigRequest) =>
      xenditConfigService.update(data),
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

// ─── Settlement hooks ────────────────────────────────────────────────────────

export function usePOSSettlementOverview(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.settlementOverview(),
    queryFn: () => posSettlementService.getOverview(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function usePOSSettlementPayoutChannels(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.settlementPayoutChannels(),
    queryFn: () => posSettlementService.getPayoutChannels(),
    enabled: options?.enabled !== false,
    staleTime: 10 * 60_000,
  });
}

export function usePOSSettlementPayouts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posKeys.settlementPayouts(),
    queryFn: () => posSettlementService.getPayouts(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useCreatePOSSettlementPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOSSettlementPayoutRequest) =>
      posSettlementService.createPayout(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.settlementOverview() });
      toast.success("Payout request sent to Xendit.");
    },
    onError: () => {
      toast.error("Failed to create payout.");
    },
  });
}

// ─── Config hook ──────────────────────────────────────────────────────────────

export function usePOSConfig(
  outletId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: posKeys.config(outletId),
    queryFn: () => posConfigService.getByOutlet(outletId),
    enabled: !!outletId && options?.enabled !== false,
    staleTime: 5 * 60_000, // config rarely changes
  });
}

export function useUpdatePOSReceiptWhatsAppTemplate(outletId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePOSReceiptWhatsAppTemplateRequest) =>
      posConfigService.updateReceiptWhatsAppTemplate(outletId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posKeys.config(outletId) });
      toast.success("Receipt WhatsApp template updated.");
    },
    onError: () => {
      toast.error("Failed to update receipt WhatsApp template.");
    },
  });
}

// ─── Serve & Complete order ───────────────────────────────────────────────────

export function useServeOrder(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: (orderId: string) => posOrderService.serve(orderId),
    onMutate: async (orderId) => {
      await qc.cancelQueries({ queryKey: posKeys.order(orderId) });
      await qc.cancelQueries({ queryKey: posKeys.orders() });

      const previousOrder = qc.getQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
      );

      qc.setQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
        (current) => {
          if (!current?.data) return current;
          const nextItems = current.data.items.map((item) => ({
            ...item,
            status: "SERVED" as const,
          }));
          return {
            ...current,
            data: {
              ...current.data,
              items: nextItems,
              status: "SERVED",
            },
          };
        },
      );

      updateOrderInListCaches(qc, orderId, (order) => {
        const nextItems = order.items.map((item) => ({
          ...item,
          status: "SERVED" as const,
        }));
        return {
          ...order,
          items: nextItems,
          status: "SERVED",
        };
      });

      return { previousOrder };
    },
    onSuccess: () => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.orders() });
      }
    },
    onError: (_, orderId, context) => {
      if (context?.previousOrder) {
        qc.setQueryData(posKeys.order(orderId), context.previousOrder);
      }
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

export function useCompleteOrder(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: (orderId: string) => posOrderService.complete(orderId),
    onMutate: async (orderId) => {
      await qc.cancelQueries({ queryKey: posKeys.order(orderId) });
      await qc.cancelQueries({ queryKey: posKeys.orders() });

      const previousOrder = qc.getQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
      );

      qc.setQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
        (current) => {
          if (!current?.data) return current;
          return {
            ...current,
            data: {
              ...current.data,
              status: "COMPLETED",
            },
          };
        },
      );

      updateOrderInListCaches(qc, orderId, (order) => ({
        ...order,
        status: "COMPLETED",
      }));

      return { previousOrder };
    },
    onSuccess: () => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.orders() });
      }
    },
    onError: (_, orderId, context) => {
      if (context?.previousOrder) {
        qc.setQueryData(posKeys.order(orderId), context.previousOrder);
      }
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

export function useServeOrderItem(options?: POSMutationOptions) {
  const qc = useQueryClient();
  const invalidateOnSuccess = options?.invalidateOnSuccess !== false;

  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      posOrderService.serveItem(orderId, itemId),
    onMutate: async ({ orderId, itemId }) => {
      await qc.cancelQueries({ queryKey: posKeys.order(orderId) });
      await qc.cancelQueries({ queryKey: posKeys.orders() });

      const previousOrder = qc.getQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
      );

      qc.setQueryData<POSOrderDetailCache>(
        posKeys.order(orderId),
        (current) => {
          if (!current?.data) return current;
          const nextItems = current.data.items.map((item) =>
            item.id === itemId ? { ...item, status: "SERVED" as const } : item,
          );
          return {
            ...current,
            data: {
              ...current.data,
              items: nextItems,
              status: deriveOrderStatusFromItems(nextItems),
            },
          };
        },
      );

      updateOrderInListCaches(qc, orderId, (order) => {
        const nextItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: "SERVED" as const } : item,
        );
        return {
          ...order,
          items: nextItems,
          status: deriveOrderStatusFromItems(nextItems),
        };
      });

      return { previousOrder };
    },
    onSuccess: () => {
      if (invalidateOnSuccess) {
        qc.invalidateQueries({ queryKey: posKeys.orders() });
      }
    },
    onError: (_, variables, context) => {
      if (context?.previousOrder) {
        qc.setQueryData(
          posKeys.order(variables.orderId),
          context.previousOrder,
        );
      }
      qc.invalidateQueries({ queryKey: posKeys.orders() });
    },
  });
}

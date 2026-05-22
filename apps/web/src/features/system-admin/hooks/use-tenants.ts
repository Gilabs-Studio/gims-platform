import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { systemAdminService } from "../services/system-admin-service";
import { useSystemAdminStore } from "../stores/use-system-admin-store";
import type {
  TenantListParams,
  TenantOwnerPasswordResetQueueParams,
  SystemAdminResetTenantOwnerPasswordRequest,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8087";

function toWebsocketBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim();
  if (normalized.startsWith("https://")) {
    return `wss://${normalized.slice(8)}`;
  }
  if (normalized.startsWith("http://")) {
    return `ws://${normalized.slice(7)}`;
  }
  if (normalized.startsWith("wss://") || normalized.startsWith("ws://")) {
    return normalized;
  }
  return `ws://${normalized}`;
}

export const systemAdminTenantResetQueryKeys = {
  all: ["system-admin", "tenant-owner-password-reset"] as const,
  list: (params?: TenantOwnerPasswordResetQueueParams) =>
    ["system-admin", "tenant-owner-password-reset", "list", params] as const,
  pendingCount: ["system-admin", "tenant-owner-password-reset", "pending-count"] as const,
};

export function useTenants(params?: TenantListParams) {
  return useQuery({
    queryKey: ["system-admin", "tenants", params],
    queryFn: async () => {
      const res = await systemAdminService.getTenants(params);
      return res;
    },
  });
}

export function useTenantDetail(id: string | null) {
  return useQuery({
    queryKey: ["system-admin", "tenants", id],
    queryFn: async () => {
      const res = await systemAdminService.getTenantDetail(id!);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSystemAdminDashboard() {
  return useQuery({
    queryKey: ["system-admin", "dashboard"],
    queryFn: async () => {
      const res = await systemAdminService.getDashboard();
      return res.data;
    },
  });
}

export function useRecoverTenantDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantID: string) => systemAdminService.recoverTenantDeletion(tenantID),
    onSuccess: async () => {
      toast.success("Tenant deletion has been recovered.");
      await queryClient.invalidateQueries({ queryKey: ["system-admin", "tenants"] });
    },
    onError: () => {
      toast.error("Failed to recover tenant deletion.");
    },
  });
}

export function useTenantOwnerPasswordResetQueue(params?: TenantOwnerPasswordResetQueueParams) {
  return useQuery({
    queryKey: systemAdminTenantResetQueryKeys.list(params),
    queryFn: async () => {
      const res = await systemAdminService.getTenantOwnerPasswordResetQueue(params);
      return res;
    },
  });
}

export function useTenantOwnerPasswordResetPendingCount() {
  return useQuery({
    queryKey: systemAdminTenantResetQueryKeys.pendingCount,
    queryFn: async () => {
      const res = await systemAdminService.getTenantOwnerPasswordResetPendingCount();
      return res.data.pending_count;
    },
    staleTime: 30_000,
  });
}

export function useSystemAdminResetTenantOwnerPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SystemAdminResetTenantOwnerPasswordRequest) =>
      systemAdminService.resetTenantOwnerPassword(payload),
    onSuccess: async () => {
      toast.success("Password reset berhasil diproses.");
      await queryClient.invalidateQueries({ queryKey: systemAdminTenantResetQueryKeys.all });
    },
    onError: () => {
      toast.error("Gagal memproses reset password.");
    },
  });
}

export function useSystemAdminTenantOwnerResetRealtime() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSystemAdminStore();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const wsBase = toWebsocketBaseUrl(API_BASE_URL);
    const wsUrl = `${wsBase}/internal/ws/notifications`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          event?: string;
          data?: {
            entity_type?: string;
          };
        };
        const eventType = payload.type ?? payload.event;
        const entityType = payload.data?.entity_type;

        if (entityType !== "password_reset_request") {
          return;
        }

        if (eventType === "notification.created") {
          queryClient.setQueryData<number>(
            systemAdminTenantResetQueryKeys.pendingCount,
            (current) => (current ?? 0) + 1,
          );
          queryClient.invalidateQueries({ queryKey: systemAdminTenantResetQueryKeys.all });
          return;
        }

        if (eventType === "notification.updated" || eventType === "notification.deleted") {
          queryClient.invalidateQueries({ queryKey: systemAdminTenantResetQueryKeys.all });
        }
      } catch {
        // Ignore malformed event payloads from unrelated channels.
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "component_unmount");
      }
    };
  }, [isAuthenticated, queryClient]);
}

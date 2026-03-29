"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationService } from "../services/notification.service";
import type { ListNotificationsParams } from "../types";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (params?: ListNotificationsParams) => ["notifications", params] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

function decrementUnreadCount(current: number | undefined, by = 1): number {
  const safeCurrent = current ?? 0;
  return Math.max(0, safeCurrent - by);
}

export function useNotifications(params?: ListNotificationsParams) {
  return useQuery({
    queryKey: notificationQueryKeys.list(params),
    queryFn: () => notificationService.list(params),
    retry: (failureCount, error) => {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return false;
        }
      }
      return failureCount < 1;
    },
  });
}

export function useNotificationCount() {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount,
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (response, id) => {
      let hasUnreadTransition = false;

      queryClient.setQueriesData({ queryKey: notificationQueryKeys.all }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object" || !("data" in oldData)) {
          return oldData;
        }

        const currentData = oldData as {
          data?: Array<{ id: string; is_read: boolean; read_at?: string | null }>;
        };
        if (!Array.isArray(currentData.data)) {
          return oldData;
        }

        const nextItems = currentData.data.map((item) => {
          if (item.id !== id || item.is_read) {
            return item;
          }

          hasUnreadTransition = true;
          return {
            ...item,
            is_read: true,
            read_at: response.data.read_at,
          };
        });

        return {
          ...currentData,
          data: nextItems,
        };
      });

      if (hasUnreadTransition) {
        queryClient.setQueryData<number>(notificationQueryKeys.unreadCount, (current) =>
          decrementUnreadCount(current)
        );
      } else {
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount });
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to mark notification as read";
      toast.error(message);
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: notificationQueryKeys.all }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== "object" || !("data" in oldData)) {
          return oldData;
        }

        const currentData = oldData as {
          data?: Array<{ is_read: boolean; read_at?: string | null }>;
        };
        if (!Array.isArray(currentData.data)) {
          return oldData;
        }

        const nowIso = new Date().toISOString();
        return {
          ...currentData,
          data: currentData.data.map((item) =>
            item.is_read
              ? item
              : {
                  ...item,
                  is_read: true,
                  read_at: item.read_at ?? nowIso,
                }
          ),
        };
      });

      queryClient.setQueryData<number>(notificationQueryKeys.unreadCount, 0);
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "notifications" && query.queryKey[1] !== "unread-count",
      });
      toast.success("All notifications marked as read");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to mark all notifications as read";
      toast.error(message);
    },
  });
}


import type {
  ApiEnvelope,
  ListNotificationsParams,
  ListNotificationsResponse,
  NotificationResponse,
  UnreadCountResponse,
} from "../types";
import { apiClient } from "@/lib/api-client";

const BASE_PATH = "/notifications";

export const notificationService = {
  async list(params?: ListNotificationsParams): Promise<ListNotificationsResponse> {
    const response = await apiClient.get<ListNotificationsResponse>(BASE_PATH, { params });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(`${BASE_PATH}/unread-count`);
    return response.data.data.unread_count;
  },

  async markAsRead(id: string): Promise<NotificationResponse> {
    const response = await apiClient.post<NotificationResponse>(`${BASE_PATH}/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<ApiEnvelope<{ marked: number }>> {
    const unread = await notificationService.list({ page: 1, per_page: 100, is_read: false });
    const items = unread.data ?? [];
    for (const item of items) {
      await notificationService.markAsRead(item.id);
    }
    return {
      success: true,
      data: { marked: items.length },
      timestamp: new Date().toISOString(),
      request_id: "local_mark_all",
    };
  },
};


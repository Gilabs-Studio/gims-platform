import type {
  ListNotificationsParams,
  ListNotificationsResponse,
  NotificationResponse,
  Notification,
} from "../types";

// Dummy data storage (simulate backend state)
let dummyNotifications: Notification[] = [
  {
    id: "1",
    user_id: "user-1",
    title: "New task assigned",
    message: "You have been assigned a new task: Complete project documentation",
    type: "task",
    is_read: false,
    read_at: null,
    data: JSON.stringify({ task_id: "task-1", task_title: "Complete project documentation" }),
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "2",
    user_id: "user-1",
    title: "Reminder: Meeting in 1 hour",
    message: "Team standup meeting is scheduled in 1 hour",
    type: "reminder",
    is_read: false,
    read_at: null,
    data: JSON.stringify({
      reminder_id: "reminder-1",
      remind_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    }),
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "3",
    user_id: "user-1",
    title: "Deal status updated",
    message: "Deal 'Acme Corp Partnership' has been updated to 'Negotiation'",
    type: "deal",
    is_read: true,
    read_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    data: JSON.stringify({ deal_id: "deal-1" }),
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "4",
    user_id: "user-1",
    title: "Activity: New comment",
    message: "John Doe commented on your post",
    type: "activity",
    is_read: false,
    read_at: null,
    data: JSON.stringify({ activity_id: "activity-1" }),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "5",
    user_id: "user-1",
    title: "Task completed",
    message: "Your task 'Review code changes' has been marked as completed",
    type: "task",
    is_read: true,
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    data: JSON.stringify({ task_id: "task-2", task_title: "Review code changes" }),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "6",
    user_id: "user-1",
    title: "Reminder: Follow up with client",
    message: "Don't forget to follow up with client about the proposal",
    type: "reminder",
    is_read: false,
    read_at: null,
    data: JSON.stringify({
      reminder_id: "reminder-2",
      remind_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    }),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const notificationService = {
  async list(params?: ListNotificationsParams): Promise<ListNotificationsResponse> {
    await delay(300); // Simulate network delay

    let filtered = [...dummyNotifications];

    // Filter by type
    if (params?.type) {
      filtered = filtered.filter((n) => n.type === params.type);
    }

    // Filter by read status
    if (params?.is_read !== undefined) {
      filtered = filtered.filter((n) => n.is_read === params.is_read);
    }

    // Sort by created_at (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Pagination
    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 20;
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginated,
      meta: {
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
        filters: params ? { ...params } as Record<string, unknown> : undefined,
      },
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
    };
  },

  async getUnreadCount(): Promise<number> {
    await delay(200);
    return dummyNotifications.filter((n) => !n.is_read).length;
  },

  async markAsRead(id: string): Promise<NotificationResponse> {
    await delay(200);

    const notification = dummyNotifications.find((n) => n.id === id);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date().toISOString();
      notification.updated_at = new Date().toISOString();
    }

    return {
      success: true,
      data: notification,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
    };
  },

  async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    await delay(300);

    const now = new Date().toISOString();
    dummyNotifications = dummyNotifications.map((n) => {
      if (!n.is_read) {
        return {
          ...n,
          is_read: true,
          read_at: now,
          updated_at: now,
        };
      }
      return n;
    });

    return {
      success: true,
      message: "All notifications marked as read",
    };
  },

  async delete(id: string): Promise<void> {
    await delay(200);

    const index = dummyNotifications.findIndex((n) => n.id === id);
    if (index === -1) {
      throw new Error("Notification not found");
    }

    dummyNotifications.splice(index, 1);
  },
};


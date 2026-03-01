import { apiClient } from "@/lib/api-client";
import type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  AssignTaskData,
  TaskFormData,
  TaskListParams,
  Reminder,
  CreateReminderData,
  UpdateReminderData,
  ApiResponse,
  PaginationMeta,
} from "../types";

const BASE = "/crm/tasks";

export const taskService = {
  list: async (params: TaskListParams = {}): Promise<ApiResponse<Task[]> & { meta: { pagination: PaginationMeta } }> => {
    const response = await apiClient.get<ApiResponse<Task[]> & { meta: { pagination: PaginationMeta } }>(BASE, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await apiClient.get<ApiResponse<Task>>(`${BASE}/${id}`);
    return response.data;
  },

  create: async (data: CreateTaskData): Promise<ApiResponse<Task>> => {
    const response = await apiClient.post<ApiResponse<Task>>(BASE, data);
    return response.data;
  },

  update: async (id: string, data: UpdateTaskData): Promise<ApiResponse<Task>> => {
    const response = await apiClient.put<ApiResponse<Task>>(`${BASE}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`);
    return response.data;
  },

  assign: async (id: string, data: AssignTaskData): Promise<ApiResponse<Task>> => {
    const response = await apiClient.put<ApiResponse<Task>>(`${BASE}/${id}/assign`, data);
    return response.data;
  },

  complete: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await apiClient.put<ApiResponse<Task>>(`${BASE}/${id}/complete`);
    return response.data;
  },

  markInProgress: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await apiClient.put<ApiResponse<Task>>(`${BASE}/${id}/in-progress`);
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<TaskFormData>> => {
    const response = await apiClient.get<ApiResponse<TaskFormData>>(`${BASE}/form-data`);
    return response.data;
  },

  // Reminder endpoints
  listReminders: async (taskId: string): Promise<ApiResponse<Reminder[]>> => {
    const response = await apiClient.get<ApiResponse<Reminder[]>>(`${BASE}/${taskId}/reminders`);
    return response.data;
  },

  getReminderById: async (taskId: string, reminderId: string): Promise<ApiResponse<Reminder>> => {
    const response = await apiClient.get<ApiResponse<Reminder>>(`${BASE}/${taskId}/reminders/${reminderId}`);
    return response.data;
  },

  createReminder: async (taskId: string, data: CreateReminderData): Promise<ApiResponse<Reminder>> => {
    const response = await apiClient.post<ApiResponse<Reminder>>(`${BASE}/${taskId}/reminders`, data);
    return response.data;
  },

  updateReminder: async (taskId: string, reminderId: string, data: UpdateReminderData): Promise<ApiResponse<Reminder>> => {
    const response = await apiClient.put<ApiResponse<Reminder>>(`${BASE}/${taskId}/reminders/${reminderId}`, data);
    return response.data;
  },

  deleteReminder: async (taskId: string, reminderId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE}/${taskId}/reminders/${reminderId}`);
    return response.data;
  },
};

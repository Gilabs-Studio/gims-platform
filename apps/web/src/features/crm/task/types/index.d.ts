import type { PaginationMeta, ApiResponse } from "../activity/types";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType = "general" | "call" | "email" | "meeting" | "follow_up";
export type ReminderType = "in_app" | "email";

export interface TaskEmployeeInfo {
  id: string;
  name: string;
  employee_code: string;
}

export interface TaskCustomerInfo {
  id: string;
  name: string;
  code: string;
}

export interface TaskContactInfo {
  id: string;
  name: string;
  email: string;
}

export interface TaskDealInfo {
  id: string;
  title: string;
}

export interface TaskLeadInfo {
  id: string;
  code: string;
  name: string;
}

export interface Reminder {
  id: string;
  task_id: string;
  remind_at: string;
  reminder_type: ReminderType;
  is_sent: boolean;
  sent_at: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  assigned_to_employee: TaskEmployeeInfo | null;
  assigned_from_employee: TaskEmployeeInfo | null;
  customer: TaskCustomerInfo | null;
  contact: TaskContactInfo | null;
  deal: TaskDealInfo | null;
  lead: TaskLeadInfo | null;
  reminders: Reminder[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_from?: string | null;
  customer_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  status?: TaskStatus;
}

export interface AssignTaskData {
  assigned_to: string;
}

export interface CreateReminderData {
  remind_at: string;
  reminder_type: ReminderType;
  message: string;
}

export interface UpdateReminderData {
  remind_at?: string;
  reminder_type?: ReminderType;
  message?: string;
}

export interface TaskFormData {
  employees: TaskEmployeeInfo[];
  customers: TaskCustomerInfo[];
  contacts: TaskContactInfo[];
  deals: TaskDealInfo[];
  leads: TaskLeadInfo[];
  statuses: { value: string; label: string }[];
  priorities: { value: string; label: string }[];
  types: { value: string; label: string }[];
}

export interface TaskListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
  assigned_to?: string;
  lead_id?: string;
  is_overdue?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export type { PaginationMeta, ApiResponse };

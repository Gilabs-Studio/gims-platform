import type { PaginationMeta, ApiResponse } from "../activity/types";

export type ScheduleStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface ScheduleEmployeeInfo {
  id: string;
  name: string;
  employee_code: string;
}

export interface ScheduleTaskInfo {
  id: string;
  title: string;
}

export interface Schedule {
  id: string;
  title: string;
  description: string;
  task_id: string | null;
  employee_id: string;
  scheduled_at: string;
  end_at: string | null;
  location: string;
  status: ScheduleStatus;
  reminder_minutes_before: number;
  task: ScheduleTaskInfo | null;
  employee: ScheduleEmployeeInfo | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleData {
  title: string;
  description?: string;
  task_id?: string | null;
  employee_id: string;
  scheduled_at: string;
  end_at?: string | null;
  location?: string;
  status?: ScheduleStatus;
  reminder_minutes_before?: number;
}

export interface UpdateScheduleData extends Partial<CreateScheduleData> {}

export interface ScheduleFormData {
  employees: ScheduleEmployeeInfo[];
  tasks: ScheduleTaskInfo[];
  statuses: { value: string; label: string }[];
}

export interface ScheduleListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  employee_id?: string;
  sort_by?: string;
  sort_dir?: string;
}

export type { PaginationMeta, ApiResponse };

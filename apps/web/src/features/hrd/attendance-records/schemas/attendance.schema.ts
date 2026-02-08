import { z } from "zod";

// Attendance status enum - aligned with backend
export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "HOLIDAY",
  "LEAVE",
  "WFH",
  "OFF_DAY",
]);

// Check-in type enum
export const checkInTypeSchema = z.enum(["NORMAL", "WFH", "FIELD_WORK"]);

// Clock In schema
export const clockInSchema = z.object({
  check_in_type: checkInTypeSchema,
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export type ClockInFormData = z.infer<typeof clockInSchema>;

// Clock Out schema
export const clockOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export type ClockOutFormData = z.infer<typeof clockOutSchema>;

// Manual attendance entry schema (admin use) - aligned with backend ManualAttendanceRequest
export const manualAttendanceSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  check_in_type: checkInTypeSchema,
  status: attendanceStatusSchema,
  notes: z.string().max(1000).optional(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type ManualAttendanceFormData = z.infer<typeof manualAttendanceSchema>;

// Update attendance schema - aligned with backend UpdateAttendanceRecordRequest
export const updateAttendanceSchema = z.object({
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  check_in_type: checkInTypeSchema.optional(),
  status: attendanceStatusSchema.optional(),
  notes: z.string().max(1000).optional(),
  manual_entry_reason: z.string().max(500).optional(),
});

export type UpdateAttendanceFormData = z.infer<typeof updateAttendanceSchema>;

// Attendance record schema (for calendar/list form - admin use)
export const attendanceRecordSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  check_in_type: checkInTypeSchema,
  status: attendanceStatusSchema,
  notes: z.string().max(1000).optional(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;

// Status options for dropdowns
export const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "ABSENT", label: "Absent" },
  { value: "LEAVE", label: "Leave" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "WFH", label: "WFH" },
] as const;

// Check-in type options for dropdowns
export const CHECK_IN_TYPE_OPTIONS = [
  { value: "NORMAL", label: "Office" },
  { value: "WFH", label: "Work From Home" },
  { value: "FIELD_WORK", label: "Field Work" },
] as const;

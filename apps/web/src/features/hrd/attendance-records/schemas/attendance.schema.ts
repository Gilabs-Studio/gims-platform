import { z } from "zod";

// Attendance status enum
export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "EARLY_LEAVE",
  "HALF_DAY",
  "HOLIDAY",
  "LEAVE",
]);

// Clock In schema (GPS required)
export const clockInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  note: z.string().optional(),
});

export type ClockInFormData = z.infer<typeof clockInSchema>;

// Clock Out schema (GPS required)
export const clockOutSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  note: z.string().optional(),
});

export type ClockOutFormData = z.infer<typeof clockOutSchema>;

// Manual attendance entry schema (admin use)
export const manualAttendanceSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  status: attendanceStatusSchema,
  note: z.string().optional(),
});

export type ManualAttendanceFormData = z.infer<typeof manualAttendanceSchema>;

// Update attendance schema
export const updateAttendanceSchema = z.object({
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  status: attendanceStatusSchema.optional(),
  note: z.string().optional(),
});

export type UpdateAttendanceFormData = z.infer<typeof updateAttendanceSchema>;

// Attendance record schema (for calendar form - admin use)
export const attendanceRecordSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  date: z.union([z.string(), z.date()]).transform((val) =>
    typeof val === "string" ? val : val.toISOString().split("T")[0]
  ),
  check_in_time: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (!val) return undefined;
    if (typeof val === "string") return val;
    return val.toTimeString().slice(0, 5);
  }),
  check_out_time: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (!val) return undefined;
    if (typeof val === "string") return val;
    return val.toTimeString().slice(0, 5);
  }),
  status: attendanceStatusSchema,
  note: z.string().optional(),
});

export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;

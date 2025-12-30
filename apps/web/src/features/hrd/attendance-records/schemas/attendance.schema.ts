import { z } from "zod";

export const attendanceRecordSchema = z.object({
  employee_id: z.number({
    message: "Employee is required",
  }).min(1, "Employee is required"),
  date: z.date({
    message: "Date is required",
  }),
  check_in_time: z.date().nullable().optional(),
  check_out_time: z.date().nullable().optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "LEAVE", "HALF_DAY"], {
    message: "Status is required",
  }),
  note: z.string().default(""),
});

export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;

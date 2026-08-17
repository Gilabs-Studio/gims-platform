import { z } from "zod";

export const payrollRunSchema = z.object({
  period: z.string().min(1, "Periode wajib diisi"),
  cutoffDate: z.string().min(1, "Tanggal cutoff wajib diisi"),
  scope: z.enum(["ALL", "DIVISION"]),
  divisionId: z.string().optional(),
});

export type PayrollRunFormValues = z.infer<typeof payrollRunSchema>;

export const payrollSettingsSchema = z.object({
  cutoffDay: z.number().min(1).max(31),
  paymentDay: z.number().min(1).max(31),
  enablePph21Ter: z.boolean(),
  bpjsHealthCap: z.number().min(0),
  syncAttendance: z.boolean().optional(),
  syncWorkScheduleHolidays: z.boolean().optional(),
});

export type PayrollSettingsFormValues = z.infer<typeof payrollSettingsSchema>;

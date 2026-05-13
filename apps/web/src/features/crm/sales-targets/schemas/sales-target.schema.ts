import { z } from "zod";

export const monthlyTargetSchema = z.object({
  month: z.number().min(1).max(12),
  target_amount: z.number().min(0, "Target must be >= 0"),
  notes: z.string().optional(),
});

export const createSalesTargetSchema = z.object({
  employee_id: z.string().min(1, "Invalid employee ID"),
  year: z.number().min(2020, "Year must be 2020+").max(2100),
  total_target: z.number().min(0),
  notes: z.string().optional(),
  months: z
    .array(monthlyTargetSchema)
    .length(12, "Must have exactly 12 months"),
});

export const updateSalesTargetSchema = z.object({
  total_target: z.number().min(0).optional(),
  notes: z.string().optional(),
  months: z
    .array(monthlyTargetSchema)
    .length(12, "Must have exactly 12 months")
    .optional(),
});

export type CreateSalesTargetFormData = z.infer<typeof createSalesTargetSchema>;
export type UpdateSalesTargetFormData = z.infer<typeof updateSalesTargetSchema>;

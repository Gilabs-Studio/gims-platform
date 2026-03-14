import { z } from "zod";

export const salarySchema = z.object({
  employee_id: z.string().uuid("Please select a valid employee"),
  basic_salary: z
    .number()
    .gt(0, "Basic salary must be greater than 0"),
  effective_date: z
    .string()
    .min(1, "Effective date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  notes: z
    .string()
    .max(500, "Notes must not exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

export type SalaryFormValues = z.infer<typeof salarySchema>;

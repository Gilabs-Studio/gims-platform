import { z } from "zod";

export const salaryFormSchema = z.object({
  employee_id: z.string().uuid(),
  effective_date: z.string().trim().min(1),
  basic_salary: z.number().positive(),
  notes: z.string().optional(),
});

export type SalaryFormValues = z.infer<typeof salaryFormSchema>;

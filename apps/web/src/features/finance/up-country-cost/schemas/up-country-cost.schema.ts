import { z } from "zod";

export const upCountryCostItemSchema = z.object({
  cost_type: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
});

export const upCountryCostFormSchema = z.object({
  purpose: z.string().min(1),
  location: z.string().optional(),
  start_date: z.string().trim().min(1),
  end_date: z.string().trim().min(1),
  notes: z.string().optional(),
  employees: z.array(z.object({ employee_id: z.string().uuid() })).min(1),
  items: z.array(upCountryCostItemSchema).min(1),
});

export type UpCountryCostFormValues = z.infer<typeof upCountryCostFormSchema>;

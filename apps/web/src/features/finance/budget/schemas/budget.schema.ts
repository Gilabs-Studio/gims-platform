import { z } from "zod";

export const budgetItemSchema = z.object({
  chart_of_account_id: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string(),
});

export const budgetFormSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  department: z.string().optional(),
  fiscal_year: z.string().optional(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  items: z.array(budgetItemSchema).min(1),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

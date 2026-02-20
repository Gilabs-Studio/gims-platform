import { z } from "zod";

export const nonTradePayableSchema = z.object({
  transaction_date: z.string().trim().min(1),
  description: z.string().optional(),
  chart_of_account_id: z.string().uuid(),
  amount: z.number().positive(),
  vendor_name: z.string().optional(),
  due_date: z.string().nullable().optional(),
  reference_no: z.string().optional(),
});

export type NonTradePayableValues = z.infer<typeof nonTradePayableSchema>;

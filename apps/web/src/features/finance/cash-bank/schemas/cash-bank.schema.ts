import { z } from "zod";

export const cashBankLineSchema = z.object({
  chart_of_account_id: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string(),
});

export const cashBankFormSchema = z.object({
  transaction_date: z.string().min(1),
  type: z.enum(["cash_in", "cash_out", "transfer"]),
  description: z.string(),
  bank_account_id: z.string().min(1),
  lines: z.array(cashBankLineSchema).min(1),
});

export type CashBankFormValues = z.infer<typeof cashBankFormSchema>;

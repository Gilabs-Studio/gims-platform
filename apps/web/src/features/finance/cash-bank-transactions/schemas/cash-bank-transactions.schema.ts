import { z } from "zod";

export const createCashBankTransactionSchema = z.object({
  company_id: z.string().min(1),
  bank_account_id: z.string().min(1),
  type: z.enum(["payment_in", "payment_out"]),
  date: z.string().min(1),
  amount: z.number().positive(),
  reference: z.string().optional(),
  description: z.string().optional(),
  contra_account_id: z.string().optional().nullable(),
  attachment_url: z.string().optional().nullable(),
  auto_post: z.boolean().optional(),
});

export type CreateCashBankTransactionSchema = z.infer<typeof createCashBankTransactionSchema>;

export const reverseCashBankTransactionSchema = z.object({
  reason: z.string().min(1),
});

export type ReverseCashBankTransactionSchema = z.infer<typeof reverseCashBankTransactionSchema>;

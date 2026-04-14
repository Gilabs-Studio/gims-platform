import { z } from "zod";

export const createBankTransferSchema = z.object({
  company_id: z.string().min(1),
  from_bank_account_id: z.string().min(1),
  to_bank_account_id: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
  reference: z.string().optional(),
  description: z.string().optional(),
});

export type CreateBankTransferSchema = z.infer<typeof createBankTransferSchema>;

export const cancelBankTransferSchema = z.object({
  reason: z.string().min(1),
});

export type CancelBankTransferSchema = z.infer<typeof cancelBankTransferSchema>;

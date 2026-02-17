import { z } from "zod";

export const purchasePaymentSchema = z.object({
  invoice_id: z.string().min(1),
  bank_account_id: z.string().min(1),
  payment_date: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["BANK", "CASH"]),
  reference_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type PurchasePaymentFormData = z.infer<typeof purchasePaymentSchema>;

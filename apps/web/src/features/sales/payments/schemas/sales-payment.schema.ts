import { z } from "zod";

export const salesPaymentSchema = z
  .object({
    invoice_id: z.string().nullable().optional(),
    dp_id: z.string().nullable().optional(),
    bank_account_id: z.string().nullable().optional(),
    payment_date: z.string().min(1),
    amount: z.number().positive(),
    method: z.enum(["BANK", "CASH"]),
    reference_number: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.invoice_id && !data.dp_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either invoice or down payment must be selected",
        path: ["invoice_id"],
      });
    }
    if (data.method === "BANK" && !data.bank_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bank account is required for bank transfers",
        path: ["bank_account_id"],
      });
    }
  });

export type SalesPaymentFormData = z.infer<typeof salesPaymentSchema>;

import { z } from "zod";

const paymentAllocationSchema = z.object({
  chart_of_account_id: z.number().min(1, "Chart of account is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
});

export const createPaymentPOSchema = z.object({
  invoice_id: z.number().min(1, "Invoice is required"),
  bank_account_id: z.number().min(1, "Bank account is required").optional(),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["CASH", "BANK"], {
    required_error: "Payment method is required",
  }),
  notes: z.string().optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
});

export const updatePaymentPOSchema = z.object({
  invoice_id: z.number().min(1, "Invoice is required").optional(),
  bank_account_id: z.number().min(1, "Bank account is required").optional(),
  payment_date: z.string().min(1, "Payment date is required").optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0").optional(),
  method: z.enum(["CASH", "BANK"]).optional(),
  notes: z.string().optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
});

export type CreatePaymentPOFormData = z.infer<typeof createPaymentPOSchema>;
export type UpdatePaymentPOFormData = z.infer<typeof updatePaymentPOSchema>;

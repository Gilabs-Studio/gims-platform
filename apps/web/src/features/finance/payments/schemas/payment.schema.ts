import { z } from "zod";

export const paymentAllocationSchema = z.object({
  chart_of_account_id: z.string().min(1),
  amount: z.number().positive(),
  memo: z.string(),
  reference_type: z.string().min(1),
  reference_id: z.string().uuid(),
});

export const paymentFormSchema = z.object({
  payment_date: z.string().min(1),
  description: z.string(),
  bank_account_id: z.string().min(1),
  total_amount: z.number().positive(),
  allocations: z.array(paymentAllocationSchema).min(1),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

import { z } from "zod";

export const bankAccountFormSchema = z.object({
  name: z.string().min(1),
  account_number: z.string().min(1),
  account_holder: z.string().min(1),
  currency: z.string().min(1),
  chart_of_account_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;

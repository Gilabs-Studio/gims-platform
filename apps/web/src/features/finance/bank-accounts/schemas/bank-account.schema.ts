import { z } from "zod";

export const bankAccountFormSchema = z.object({
  name: z.string().min(1),
  account_number: z.string().min(1),
  account_holder: z.string().min(1),
  currency_id: z.string().uuid("Select a valid currency"),
  chart_of_account_id: z.string().nullable().optional(),
  village_id: z.string().uuid("Pilih wilayah/desa yang valid").nullable().optional(),
  bank_address: z.string().optional(),
  bank_phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;

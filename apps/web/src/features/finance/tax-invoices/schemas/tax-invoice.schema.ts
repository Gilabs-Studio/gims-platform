import { z } from "zod";

export const taxInvoiceFormSchema = z.object({
  tax_invoice_number: z.string().trim().min(1),
  tax_invoice_date: z.string().trim().min(1),
  dpp_amount: z.number().nonnegative().optional(),
  vat_amount: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type TaxInvoiceFormValues = z.infer<typeof taxInvoiceFormSchema>;

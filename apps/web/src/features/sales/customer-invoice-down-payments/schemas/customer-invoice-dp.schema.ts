import { z } from "zod";

export const customerInvoiceDPSchema = z.object({
  sales_order_id: z.string().uuid(),
  invoice_date: z.string().min(1),
  due_date: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().nullable().optional(),
});

export type CustomerInvoiceDPFormData = z.infer<typeof customerInvoiceDPSchema>;

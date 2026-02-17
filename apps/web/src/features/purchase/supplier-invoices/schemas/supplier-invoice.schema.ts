import { z } from "zod";

export const supplierInvoiceItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  discount: z.number().min(0).max(100).optional(),
});

export const supplierInvoiceSchema = z.object({
  purchase_order_id: z.string().uuid(),
  payment_terms_id: z.string().uuid(),
  invoice_number: z.string().min(1),
  invoice_date: z.string().min(1),
  due_date: z.string().min(1),
  tax_rate: z.number().min(0).max(100),
  delivery_cost: z.number().min(0),
  other_cost: z.number().min(0),
  notes: z.string().nullable().optional(),
  items: z.array(supplierInvoiceItemSchema).min(1),
});

export type SupplierInvoiceFormData = z.infer<typeof supplierInvoiceSchema>;

import { z } from "zod";

export const supplierInvoiceItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  discount: z.number().min(0).max(100).optional(),
});

export const supplierInvoiceSchema = z.object({
  goods_receipt_id: z.string().min(1, "Goods receipt is required").uuid({ message: "Please select a valid goods receipt" }),
  payment_terms_id: z.string().min(1, "Payment terms is required").uuid({ message: "Please select valid payment terms" }),
  invoice_number: z.string().min(1, "Invoice number is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  tax_rate: z.number().min(0).max(100),
  delivery_cost: z.number().min(0),
  other_cost: z.number().min(0),
  notes: z.string().nullable().optional(),
  items: z.array(supplierInvoiceItemSchema).min(1, "At least one item is required"),
});

export type SupplierInvoiceFormData = z.infer<typeof supplierInvoiceSchema>;

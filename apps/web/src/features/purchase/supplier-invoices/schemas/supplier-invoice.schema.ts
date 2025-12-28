import { z } from "zod";

const supplierInvoiceItemSchema = z.object({
  product_id: z.number().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be 0 or greater"),
  discount: z
    .number()
    .min(0, "Discount must be 0 or greater")
    .max(100, "Discount cannot exceed 100%"),
});

export const createSupplierInvoiceSchema = z.object({
  purchase_order_id: z.number().min(1, "Purchase order is required"),
  payment_terms_id: z.number().min(1, "Payment terms is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  tax_rate: z
    .number()
    .min(0, "Tax rate must be 0 or greater")
    .max(100, "Tax rate cannot exceed 100%"),
  delivery_cost: z.number().min(0, "Delivery cost must be 0 or greater"),
  other_cost: z.number().min(0, "Other cost must be 0 or greater"),
  notes: z.string().optional(),
  items: z.array(supplierInvoiceItemSchema).min(1, "At least one item is required"),
});

export const updateSupplierInvoiceSchema = z.object({
  payment_terms_id: z.number().min(1, "Payment terms is required").optional(),
  invoice_number: z.string().min(1, "Invoice number is required").optional(),
  invoice_date: z.string().min(1, "Invoice date is required").optional(),
  due_date: z.string().min(1, "Due date is required").optional(),
  tax_rate: z
    .number()
    .min(0, "Tax rate must be 0 or greater")
    .max(100, "Tax rate cannot exceed 100%")
    .optional(),
  delivery_cost: z.number().min(0, "Delivery cost must be 0 or greater").optional(),
  other_cost: z.number().min(0, "Other cost must be 0 or greater").optional(),
  notes: z.string().optional(),
  items: z.array(supplierInvoiceItemSchema).min(1, "At least one item is required").optional(),
});

export type CreateSupplierInvoiceFormData = z.infer<typeof createSupplierInvoiceSchema>;
export type UpdateSupplierInvoiceFormData = z.infer<typeof updateSupplierInvoiceSchema>;





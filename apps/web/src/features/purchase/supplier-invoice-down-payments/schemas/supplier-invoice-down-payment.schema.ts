import { z } from "zod";

export const createSupplierInvoiceDownPaymentSchema = z.object({
  purchase_order_id: z.number().min(1, "Purchase order is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  amount: z.number().min(0, "Amount must be 0 or greater"),
  notes: z.string().optional(),
});

export const updateSupplierInvoiceDownPaymentSchema = z.object({
  purchase_order_id: z.number().min(1, "Purchase order is required").optional(),
  invoice_date: z.string().min(1, "Invoice date is required").optional(),
  due_date: z.string().min(1, "Due date is required").optional(),
  amount: z.number().min(0, "Amount must be 0 or greater").optional(),
  notes: z.string().optional(),
});

export type CreateSupplierInvoiceDownPaymentFormData = z.infer<
  typeof createSupplierInvoiceDownPaymentSchema
>;
export type UpdateSupplierInvoiceDownPaymentFormData = z.infer<
  typeof updateSupplierInvoiceDownPaymentSchema
>;





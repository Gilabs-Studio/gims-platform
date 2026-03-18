import { z } from "zod";

export const salesReturnItemSchema = z.object({
  invoice_item_id: z.string().optional(),
  product_id: z.string().min(1),
  uom_id: z.string().optional(),
  condition: z.string().min(1),
  notes: z.string().optional(),
  qty: z.number().positive(),
  unit_price: z.number().min(0),
});

export const salesReturnSchema = z.object({
  invoice_id: z.string().optional(),
  delivery_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  customer_id: z.string().optional(),
  reason: z.string().min(1),
  action: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(salesReturnItemSchema).min(1),
});

export type SalesReturnFormData = z.infer<typeof salesReturnSchema>;

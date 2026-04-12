import { z } from "zod";

// ─── Order schemas ────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  outlet_id: z.string().uuid("Invalid outlet"),
  order_type: z.enum(["DINE_IN", "TAKE_AWAY", "DELIVERY"]),
  table_id: z.string().optional(),
  table_label: z.string().optional(),
  customer_name: z.string().optional(),
  guest_count: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

export const voidOrderSchema = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});

export const addOrderItemSchema = z.object({
  product_id: z.string().uuid("Invalid product"),
  quantity: z.number().min(0.001, "Quantity must be positive"),
  notes: z.string().optional(),
});

// ─── Payment schema ───────────────────────────────────────────────────────────

export const processPaymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "QRIS", "TRANSFER", "DIGITAL"]),
  amount: z.number().min(0.01, "Amount must be positive"),
  notes: z.string().optional(),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
export type VoidOrderFormData = z.infer<typeof voidOrderSchema>;
export type ProcessPaymentFormData = z.infer<typeof processPaymentSchema>;

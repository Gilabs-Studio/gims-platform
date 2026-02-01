import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Delivery Order Item Schema
export const getDeliveryItemSchema = (t?: TranslationFn) => z.object({
  product_id: z.string()
    .min(1, getMsg(t, "validation.required", "Product is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid product ID")),
  sales_order_item_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId")).optional().or(z.literal("")),
  inventory_batch_id: z.string()
    .min(1, getMsg(t, "validation.required", "Batch is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid batch ID")),
  warehouse_id: z.string().uuid().optional().or(z.literal("")),
  quantity: z.number()
    .positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0"))
    .min(0.001, getMsg(t, "validation.quantityMin", "Quantity must be at least 0.001")),
  max_quantity: z.number().optional(),
  price: z.number().min(0, getMsg(t, "validation.priceMin", "Price must be positive")).optional(),
  installation_status: z.string().optional().or(z.literal("")),
  function_test_status: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.max_quantity !== undefined && data.quantity > data.max_quantity) {
    return false;
  }
  return true;
}, {
  message: getMsg(t, "validation.insufficientStock", "Quantity exceeds available stock"),
  path: ["quantity"],
});

// Delivery Order Schema
export const getDeliveryOrderSchema = (t?: TranslationFn) => z.object({
  delivery_date: z.string()
    .min(1, getMsg(t, "validation.required", "Delivery date is required")),
  // warehouse_id moved to items aggregation validation
  warehouse_id: z.string().optional(), 
  sales_order_id: z.string()
    .min(1, getMsg(t, "validation.required", "Sales order is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid sales order ID")),
  delivered_by_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId")).optional().or(z.literal("")),
  courier_agency_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId")).optional().or(z.literal("")),
  tracking_number: z.string().optional(),
  receiver_name: z.string().optional(),
  receiver_phone: z.string().optional(),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(getDeliveryItemSchema(t))
    .min(1, getMsg(t, "validation.itemsMin", "At least one item is required")),
});

export const getUpdateDeliveryOrderSchema = (t?: TranslationFn) => getDeliveryOrderSchema(t).partial().extend({
  items: z.array(getDeliveryItemSchema(t)).min(1).optional(),
});

export const getUpdateDeliveryOrderStatusSchema = (t?: TranslationFn) => z.object({
  status: z.enum(["draft", "prepared", "shipped", "delivered", "cancelled"] as const, {
    message: getMsg(t, "validation.invalidStatus", "Invalid status"),
  }),
  cancellation_reason: z.string().optional(),
});

export const getShipDeliveryOrderSchema = (t?: TranslationFn) => z.object({
  tracking_number: z.string()
    .min(1, getMsg(t, "validation.required", "Tracking number is required")),
});

export const getDeliverDeliveryOrderSchema = (t?: TranslationFn) => z.object({
  receiver_signature: z.string()
    .min(1, getMsg(t, "validation.required", "Receiver signature is required")),
  receiver_name: z.string().optional(),
  receiver_phone: z.string().optional(),
});

export const getBatchSelectionSchema = (t?: TranslationFn) => z.object({
  product_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid product ID"))
    .min(1, getMsg(t, "validation.required", "Product is required")),
  quantity: z.number()
    .positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0"))
    .min(0.001, getMsg(t, "validation.quantityMin", "Quantity must be at least 0.001")),
  method: z.enum(["FIFO", "FEFO"] as const, {
    message: getMsg(t, "validation.invalidMethod", "Method must be FIFO or FEFO"),
  }),
  warehouse_id: z.string().uuid().optional(),
});

// Inferred types
export type CreateDeliveryOrderFormData = z.infer<ReturnType<typeof getDeliveryOrderSchema>>;
export type UpdateDeliveryOrderFormData = z.infer<ReturnType<typeof getUpdateDeliveryOrderSchema>>;
export type UpdateDeliveryOrderStatusFormData = z.infer<ReturnType<typeof getUpdateDeliveryOrderStatusSchema>>;
export type ShipDeliveryOrderFormData = z.infer<ReturnType<typeof getShipDeliveryOrderSchema>>;
export type DeliverDeliveryOrderFormData = z.infer<ReturnType<typeof getDeliverDeliveryOrderSchema>>;
export type BatchSelectionFormData = z.infer<ReturnType<typeof getBatchSelectionSchema>>;
export type DeliveryOrderItemFormData = z.infer<ReturnType<typeof getDeliveryItemSchema>>;

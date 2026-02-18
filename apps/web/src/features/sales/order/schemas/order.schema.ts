import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Sales Order Item Schema
export const getOrderItemSchema = (t?: TranslationFn) => z.object({
  product_id: z.string()
    .min(1, getMsg(t, "validation.required", "Product is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid product ID")),
  quantity: z.number()
    .positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0"))
    .min(0.001, getMsg(t, "validation.quantityMin", "Quantity must be at least 0.001")),
  price: z.number()
    .positive(getMsg(t, "validation.pricePositive", "Price must be greater than 0"))
    .min(0.01, getMsg(t, "validation.priceMin", "Price must be at least 0.01")),
  discount: z.number()
    .min(0, getMsg(t, "validation.discountMin", "Discount cannot be negative"))
    .default(0),
});

// Sales Order Schema
export const getOrderSchema = (t?: TranslationFn) => z.object({
  order_date: z.string()
    .min(1, getMsg(t, "validation.required", "Order date is required")),
  sales_quotation_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId")).optional().or(z.literal("")),
  payment_terms_id: z.string()
    .min(1, getMsg(t, "validation.required", "Payment terms is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid payment terms")),
  sales_rep_id: z.string()
    .min(1, getMsg(t, "validation.required", "Sales representative is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid sales representative")),
  business_unit_id: z.string()
    .min(1, getMsg(t, "validation.required", "Business unit is required"))
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId", "Invalid business unit ID")),
  business_type_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId")).optional().or(z.literal("")),
  delivery_area_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, getMsg(t, "validation.invalidId")).optional().or(z.literal("")),
  tax_rate: z.number()
    .min(0, getMsg(t, "validation.taxRateMin", "Tax rate cannot be negative"))
    .max(100, getMsg(t, "validation.taxRateMax", "Tax rate cannot exceed 100%"))
    .default(11),
  delivery_cost: z.number()
    .min(0, getMsg(t, "validation.deliveryCostMin", "Delivery cost cannot be negative"))
    .default(0),
  other_cost: z.number()
    .min(0, getMsg(t, "validation.otherCostMin", "Other cost cannot be negative"))
    .default(0),
  discount_amount: z.number()
    .min(0, getMsg(t, "validation.discountAmountMin", "Discount amount cannot be negative"))
    .default(0),
  notes: z.string().optional(),
  customer_name: z.string().optional(),
  customer_contact: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email(getMsg(t, "validation.invalidEmail", "Invalid email format")).optional().or(z.literal("")),
  items: z.array(getOrderItemSchema(t))
    .min(1, getMsg(t, "validation.itemsMin", "At least one item is required")),
});

export const getUpdateOrderSchema = (t?: TranslationFn) => getOrderSchema(t).partial().extend({
  items: z.array(getOrderItemSchema(t)).min(1).optional(),
});

export const getUpdateOrderStatusSchema = (t?: TranslationFn) => z.object({
  status: z.enum(["draft", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const, {
    message: getMsg(t, "validation.invalidStatus", "Invalid status"),
  }),
  cancellation_reason: z.string().optional(),
});

export const getConvertQuotationToOrderSchema = (t?: TranslationFn) => z.object({
  sales_quotation_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid quotation ID"))
    .min(1, getMsg(t, "validation.required", "Quotation is required")),
  order_date: z.string()
    .min(1, getMsg(t, "validation.required", "Order date is required")),
  customer_name: z.string().optional(),
  customer_contact: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email(getMsg(t, "validation.invalidEmail", "Invalid email format")).optional().or(z.literal("")),
  notes: z.string().optional(),
});

// Inferred types
export type CreateOrderFormData = z.infer<ReturnType<typeof getOrderSchema>>;
export type UpdateOrderFormData = z.infer<ReturnType<typeof getUpdateOrderSchema>>;
export type UpdateOrderStatusFormData = z.infer<ReturnType<typeof getUpdateOrderStatusSchema>>;
export type ConvertQuotationToOrderFormData = z.infer<ReturnType<typeof getConvertQuotationToOrderSchema>>;
export type OrderItemFormData = z.infer<ReturnType<typeof getOrderItemSchema>>;

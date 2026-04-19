import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Use permissive UUID format (hex + hyphen groups) to match backend IDs.
// z.uuid() is RFC4122 strict and can reject valid IDs used in this codebase.
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uuidRequired = (
  t: TranslationFn | undefined,
  requiredMessage: string,
  invalidMessage: string,
) =>
  z
    .string()
    .refine((val) => (val ?? "").trim().length > 0, {
      message: requiredMessage,
    })
    .refine((val) => UUID_FORMAT.test((val ?? "").trim()), {
      message: invalidMessage,
    });

const uuidOptional = (t: TranslationFn | undefined, invalidMessage: string) =>
  z
    .string()
    .optional()
    .refine((val) => !val || UUID_FORMAT.test((val ?? "").trim()), {
      message: invalidMessage,
    });

// Customer Invoice Item Schema
export const getInvoiceItemSchema = (t?: TranslationFn) =>
  z.object({
    product_id: uuidRequired(
      t,
      getMsg(t, "validation.required", "Product is required") ?? "Product is required",
      getMsg(t, "validation.invalidId", "Invalid product ID") ?? "Invalid product ID",
    ),
    quantity: z
      .number()
      .positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0"))
      .min(0.001, getMsg(t, "validation.quantityMin", "Quantity must be at least 0.001")),
    price: z
      .number()
      .positive(getMsg(t, "validation.pricePositive", "Price must be greater than 0"))
      .min(0.01, getMsg(t, "validation.priceMin", "Price must be at least 0.01")),
    discount: z
      .number()
      .min(0, getMsg(t, "validation.discountMin", "Discount cannot be negative"))
      .default(0),
    hpp_amount: z
      .number()
      .min(0, getMsg(t, "validation.hppMin", "HPP amount cannot be negative"))
      .default(0),
  });

// Customer Invoice Schema
export const getInvoiceSchema = (t?: TranslationFn) =>
  z.object({
    invoice_date: z.string().min(1, getMsg(t, "validation.required", "Invoice date is required")),
    due_date: z.string().min(1, getMsg(t, "validation.required", "Due date is required")),
    type: z.enum(["regular", "proforma"] as const).default("regular"),
    sales_order_id: uuidRequired(
      t,
      getMsg(t, "validation.required", "Sales order is required") ?? "Sales order is required",
      getMsg(t, "validation.invalidId", "Invalid sales order ID") ?? "Invalid sales order ID",
    ),
    delivery_order_id: uuidOptional(
      t,
      getMsg(t, "validation.invalidId", "Invalid delivery order ID") ?? "Invalid delivery order ID",
    ),
    payment_terms_id: uuidRequired(
      t,
      getMsg(t, "validation.required", "Payment terms is required") ?? "Payment terms is required",
      getMsg(t, "validation.invalidId", "Invalid payment terms ID") ?? "Invalid payment terms ID",
    ),
    tax_rate: z
      .number()
      .min(0, getMsg(t, "validation.taxRateMin", "Tax rate cannot be negative"))
      .max(100, getMsg(t, "validation.taxRateMax", "Tax rate cannot exceed 100%"))
      .default(11),
    delivery_cost: z
      .number()
      .min(0, getMsg(t, "validation.deliveryCostMin", "Delivery cost cannot be negative"))
      .default(0),
    other_cost: z
      .number()
      .min(0, getMsg(t, "validation.otherCostMin", "Other cost cannot be negative"))
      .default(0),
    notes: z.string().optional(),
    items: z.array(getInvoiceItemSchema(t)).min(1, getMsg(t, "validation.itemsMin", "At least one item is required")),
  });

export const getUpdateInvoiceSchema = (t?: TranslationFn) =>
  getInvoiceSchema(t).partial().extend({
    items: z.array(getInvoiceItemSchema(t)).min(1).optional(),
  });

export const getUpdateInvoiceStatusSchema = () =>
  z.object({
    status: z.enum(["unpaid", "partial", "paid", "cancelled"] as const),
    paid_amount: z.number().min(0).optional(),
    payment_at: z.string().optional(),
  });

// Inferred types
export type CreateInvoiceFormData = z.infer<ReturnType<typeof getInvoiceSchema>>;
export type UpdateInvoiceFormData = z.infer<ReturnType<typeof getUpdateInvoiceSchema>>;
export type UpdateInvoiceStatusFormData = z.infer<ReturnType<typeof getUpdateInvoiceStatusSchema>>;
export type InvoiceItemFormData = z.infer<ReturnType<typeof getInvoiceItemSchema>>;

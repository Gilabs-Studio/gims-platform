import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Sales Estimation Item Schema
export const getEstimationItemSchema = (t?: TranslationFn) => z.object({
  product_id: z.string().uuid(getMsg(t, "validation.invalidId", "Invalid product ID")),
  quantity: z.coerce.number()
    .positive(getMsg(t, "validation.quantityPositive", "Quantity must be greater than 0"))
    .min(0.001, getMsg(t, "validation.quantityMin", "Quantity must be at least 0.001")),
  estimated_price: z.coerce.number()
    .positive(getMsg(t, "validation.pricePositive", "Price must be greater than 0"))
    .min(0.01, getMsg(t, "validation.priceMin", "Price must be at least 0.01")),
  discount: z.coerce.number()
    .min(0, getMsg(t, "validation.discountMin", "Discount cannot be negative"))
    .default(0),
  notes: z.string().optional(),
});

// Sales Estimation Schema
export const getEstimationSchema = (t?: TranslationFn) => z.object({
  estimation_date: z.string()
    .min(1, getMsg(t, "validation.required", "Estimation date is required")),
  customer_name: z.string()
    .min(1, getMsg(t, "validation.required", "Customer name is required"))
    .max(255, getMsg(t, "validation.customerNameMax", "Customer name is too long")),
  customer_contact: z.string().max(255).optional(),
  customer_email: z.string()
    .email(getMsg(t, "validation.invalidEmail", "Invalid email format"))
    .optional()
    .or(z.literal("")),
  customer_phone: z.string().max(20).optional(),
  expected_close_date: z.string().optional(),
  probability: z.coerce.number()
    .min(0, getMsg(t, "validation.probabilityMin", "Probability cannot be less than 0"))
    .max(100, getMsg(t, "validation.probabilityMax", "Probability cannot exceed 100"))
    .default(50),
  area_id: z.string().uuid().optional(),
  sales_rep_id: z.string()
    .min(1, getMsg(t, "validation.required", "Sales representative is required")),
  business_unit_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid business unit ID"))
    .min(1, getMsg(t, "validation.required", "Business unit is required")),
  business_type_id: z.string().uuid().optional(),
  tax_rate: z.coerce.number()
    .min(0, getMsg(t, "validation.taxRateMin", "Tax rate cannot be negative"))
    .max(100, getMsg(t, "validation.taxRateMax", "Tax rate cannot exceed 100%"))
    .default(11),
  delivery_cost: z.coerce.number()
    .min(0, getMsg(t, "validation.deliveryCostMin", "Delivery cost cannot be negative"))
    .default(0),
  other_cost: z.coerce.number()
    .min(0, getMsg(t, "validation.otherCostMin", "Other cost cannot be negative"))
    .default(0),
  discount_amount: z.coerce.number()
    .min(0, getMsg(t, "validation.discountAmountMin", "Discount amount cannot be negative"))
    .default(0),
  notes: z.string().optional(),
  items: z.array(getEstimationItemSchema(t))
    .min(1, getMsg(t, "validation.itemsMin", "At least one item is required")),
});

export const getUpdateEstimationSchema = (t?: TranslationFn) => getEstimationSchema(t).partial().extend({
  items: z.array(getEstimationItemSchema(t)).min(1).optional(),
});

export const getUpdateEstimationStatusSchema = () => z.object({
  status: z.enum(["submitted", "approved", "rejected", "converted"] as const, {
    message: "Invalid status",
  }),
  rejection_reason: z.string().optional(),
});

export const getConvertToQuotationSchema = (t?: TranslationFn) => z.object({
  quotation_date: z.string().optional(),
  valid_until: z.string().optional(),
  payment_terms_id: z.string()
    .uuid(getMsg(t, "validation.invalidId", "Invalid payment terms ID"))
    .min(1, getMsg(t, "validation.required", "Payment terms is required")),
  inherit_items: z.boolean().default(true),
});

// Inferred types
export type CreateEstimationFormData = z.infer<ReturnType<typeof getEstimationSchema>>;
export type UpdateEstimationFormData = z.infer<ReturnType<typeof getUpdateEstimationSchema>>;
export type UpdateEstimationStatusFormData = z.infer<ReturnType<typeof getUpdateEstimationStatusSchema>>;
export type EstimationItemFormData = z.infer<ReturnType<typeof getEstimationItemSchema>>;
export type ConvertToQuotationFormData = z.infer<ReturnType<typeof getConvertToQuotationSchema>>;

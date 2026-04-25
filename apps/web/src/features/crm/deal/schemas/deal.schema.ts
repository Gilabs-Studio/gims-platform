import { z } from "zod";

// Zod v4 is stricter about null/undefined. Use preprocess to normalize
// null → appropriate fallback so API responses with nullable fields don't fail.
const nullToStr = (fallback = "") =>
  (v: unknown) => (v === null || v === undefined ? fallback : v);

const dealProductItemSchema = z.object({
  // product_id can be null from the API (nullable *string in Go).
  // Backend validates existence by DB lookup — no need for strict UUID check here.
  product_id: z.preprocess(nullToStr(""), z.string()),
  product_name: z.preprocess(nullToStr(""), z.string().max(200)),
  product_sku: z.preprocess(nullToStr(""), z.string().max(50)),
  // unit_price and quantity are required numbers — normalize null/undefined/NaN
  // that can appear if NumericInput is cleared or form state is stale.
  // Explicit invalid values (negative price, zero qty) still trigger validation errors.
  unit_price: z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v))
        ? 0
        : v,
    z.number().min(0, "Unit price must be non-negative"),
  ),
  quantity: z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v))
        ? 1
        : v,
    z.number().int().min(1, "Quantity must be at least 1"),
  ),
  discount_percent: z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v))
        ? 0
        : v,
    z
      .number()
      .min(0, "Discount must be non-negative")
      .max(100, "Discount cannot exceed 100%")
      .optional()
      .default(0),
  ),
  discount_amount: z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v))
        ? 0
        : v,
    z
      .number()
      .min(0, "Discount amount must be non-negative")
      .optional()
      .default(0),
  ),
  notes: z.preprocess(nullToStr(""), z.string().max(500)),
});

export const createDealSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().optional().or(z.literal("")),
  pipeline_stage_id: z.string().min(1, "Pipeline stage is required"),
  value: z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v))
        ? 0
        : v,
    z.number().min(0, "Value must be non-negative"),
  ).optional(),
  expected_close_date: z.string().optional().or(z.literal("")),
  customer_id: z.string().optional(),
  contact_id: z.string().optional(),
  assigned_to: z.string().optional(),
  lead_id: z.string().optional(),
  // BANT
  budget_confirmed: z.boolean().optional().default(false),
  budget_amount: z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "number" && isNaN(v))
        ? 0
        : v,
    z.number().min(0).optional().default(0),
  ),
  auth_confirmed: z.boolean().optional().default(false),
  auth_person: z.string().max(200).optional().or(z.literal("")),
  need_confirmed: z.boolean().optional().default(false),
  need_description: z.string().optional().or(z.literal("")),
  time_confirmed: z.boolean().optional().default(false),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(dealProductItemSchema).optional().default([]),
});

export type CreateDealFormData = z.infer<typeof createDealSchema>;

export const updateDealSchema = createDealSchema.partial();
export type UpdateDealFormData = z.infer<typeof updateDealSchema>;

export const moveDealStageSchema = z.object({
  to_stage_id: z.string().min(1, "Target stage is required"),
  reason: z.string().min(2, "Reason must be at least 2 characters"),
  notes: z.string().max(500).optional().or(z.literal("")),
  close_reason: z.string().optional().or(z.literal("")),
  convert_to_quotation: z.boolean(),
});

export type MoveDealStageFormData = z.infer<typeof moveDealStageSchema>;

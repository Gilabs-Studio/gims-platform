import { z } from "zod";

const dealProductItemSchema = z.object({
  product_id: z.string().uuid("Invalid product ID").optional().or(z.literal("")),
  product_name: z.string().max(200).optional().default(""),  // auto-filled when product is selected
  product_sku: z.string().max(50).optional().or(z.literal("")),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  discount_percent: z
    .number()
    .min(0, "Discount must be non-negative")
    .max(100, "Discount cannot exceed 100%")
    .optional()
    .default(0),
  discount_amount: z
    .number()
    .min(0, "Discount amount must be non-negative")
    .optional()
    .default(0),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const createDealSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().optional().or(z.literal("")),
  pipeline_stage_id: z.string().min(1, "Pipeline stage is required"),
  value: z.number().min(0, "Value must be non-negative").optional().default(0),
  expected_close_date: z.string().optional().or(z.literal("")),
  customer_id: z.string().uuid("Invalid customer ID").optional().or(z.literal("")),
  contact_id: z.string().uuid("Invalid contact ID").optional().or(z.literal("")),
  assigned_to: z.string().uuid("Invalid employee ID").optional().or(z.literal("")),
  lead_id: z.string().uuid("Invalid lead ID").optional().or(z.literal("")),
  // BANT
  budget_confirmed: z.boolean().optional().default(false),
  budget_amount: z.number().min(0).optional().default(0),
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
});

export type MoveDealStageFormData = z.infer<typeof moveDealStageSchema>;

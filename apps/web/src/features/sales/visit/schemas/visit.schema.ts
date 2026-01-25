import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Sales Visit Detail Schema
export const getVisitDetailSchema = (t?: TranslationFn) => z.object({
  product_id: z.string().uuid(getMsg(t, "validation.invalidId", "Invalid product ID")),
  interest_level: z.number()
    .min(0, getMsg(t, "validation.interestLevelMin", "Interest level cannot be negative"))
    .max(5, getMsg(t, "validation.interestLevelMax", "Interest level cannot exceed 5"))
    .default(0),
  notes: z.string().optional(),
  quantity: z.coerce.number()
    .min(0, getMsg(t, "validation.quantityMin", "Quantity cannot be negative"))
    .optional(),
  price: z.coerce.number()
    .min(0, getMsg(t, "validation.priceMin", "Price cannot be negative"))
    .optional(),
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    option_id: z.string().uuid()
  })).optional()
});

// Sales Visit Schema
export const getVisitSchema = (t?: TranslationFn) => z.object({
  visit_date: z.string()
    .min(1, getMsg(t, "validation.required", "Visit date is required")),
  scheduled_time: z.string().optional(),
  employee_id: z.string()
    .min(1, getMsg(t, "validation.required", "Sales representative is required")),
  company_id: z.string().uuid().optional().nullable(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  village_id: z.string().uuid().optional().nullable(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  details: z.array(getVisitDetailSchema(t)).optional(),
});

export const getUpdateVisitSchema = (t?: TranslationFn) => getVisitSchema(t).partial().extend({
  result: z.string().optional(),
  details: z.array(getVisitDetailSchema(t)).optional(),
});

export const getUpdateVisitStatusSchema = () => z.object({
  status: z.enum(["planned", "in_progress", "completed", "cancelled"], {
    message: "Invalid status",
  }),
  notes: z.string().optional(),
});

export const getCheckInSchema = () => z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export const getCheckOutSchema = () => z.object({
  result: z.string().optional(),
});

// Inferred types
export type CreateVisitFormData = z.infer<ReturnType<typeof getVisitSchema>>;
export type UpdateVisitFormData = z.infer<ReturnType<typeof getUpdateVisitSchema>>;
export type UpdateVisitStatusFormData = z.infer<ReturnType<typeof getUpdateVisitStatusSchema>>;
export type VisitDetailFormData = z.infer<ReturnType<typeof getVisitDetailSchema>>;
export type CheckInFormData = z.infer<ReturnType<typeof getCheckInSchema>>;
export type CheckOutFormData = z.infer<ReturnType<typeof getCheckOutSchema>>;

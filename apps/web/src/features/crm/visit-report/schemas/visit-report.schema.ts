import { z } from "zod";

type TranslationFn = (key: string) => string;

const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

export const getVisitReportDetailSchema = (t?: TranslationFn) =>
  z.object({
    product_id: z.string().min(1, getMsg(t, "validation.invalidId", "Invalid product ID")),
    interest_level: z
      .number()
      .min(0, getMsg(t, "validation.interestLevelMin", "Interest level cannot be negative"))
      .max(5, getMsg(t, "validation.interestLevelMax", "Interest level cannot exceed 5")),
    notes: z.string().optional(),
    quantity: z
      .number()
      .min(0, getMsg(t, "validation.quantityMin", "Quantity cannot be negative"))
      .optional(),
    price: z
      .number()
      .min(0, getMsg(t, "validation.priceMin", "Price cannot be negative"))
      .optional(),
    answers: z
      .array(
        z.object({
          question_id: z.string(),
          option_id: z.string(),
        })
      )
      .optional(),
  });

export const getVisitReportSchema = (t?: TranslationFn) =>
  z.object({
    visit_date: z.string().min(1, getMsg(t, "validation.visitDateRequired", "Visit date is required")),
    scheduled_time: z.string().optional(),
    employee_id: z.string().min(1, getMsg(t, "validation.employeeRequired", "Sales representative is required")),
    customer_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid().optional().nullable(),
    deal_id: z.string().uuid().optional().nullable(),
    lead_id: z.string().uuid().optional().nullable(),
    contact_person: z.string().max(200).optional(),
    contact_phone: z.string().max(20).optional(),
    address: z.string().optional(),
    village_id: z.string().uuid().optional().nullable(),
    purpose: z.string().optional(),
    notes: z.string().optional(),
    details: z.array(getVisitReportDetailSchema(t)).optional(),
  });

export const getUpdateVisitReportSchema = (t?: TranslationFn) =>
  getVisitReportSchema(t).partial().extend({
    result: z.string().optional(),
    outcome: z.enum(["positive", "neutral", "negative", "very_positive"]).optional(),
    next_steps: z.string().optional(),
    details: z.array(getVisitReportDetailSchema(t)).optional(),
  });

export const getCheckInSchema = () =>
  z.object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    accuracy: z.coerce.number().optional(),
  });

export const getCheckOutSchema = () =>
  z.object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    accuracy: z.coerce.number().optional(),
    result: z.string().optional(),
    outcome: z.enum(["positive", "neutral", "negative", "very_positive"]).optional(),
    next_steps: z.string().optional(),
  });

export const getRejectSchema = (t?: TranslationFn) =>
  z.object({
    reason: z.string().min(5, getMsg(t, "validation.rejectionReasonMin", "Rejection reason must be at least 5 characters")),
    notes: z.string().optional(),
  });

// Inferred types
export type CreateVisitReportFormData = z.infer<ReturnType<typeof getVisitReportSchema>>;
export type UpdateVisitReportFormData = z.infer<ReturnType<typeof getUpdateVisitReportSchema>>;
export type CheckInFormData = z.infer<ReturnType<typeof getCheckInSchema>>;
export type CheckOutFormData = z.infer<ReturnType<typeof getCheckOutSchema>>;
export type RejectFormData = z.infer<ReturnType<typeof getRejectSchema>>;

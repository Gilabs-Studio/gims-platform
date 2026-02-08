import { z } from "zod";

type TranslationFn = (key: string) => string;

const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Recruitment Request Schema
export const getRecruitmentRequestSchema = (t?: TranslationFn) =>
  z.object({
    division_id: z
      .string()
      .uuid(getMsg(t, "validation.invalidId", "Invalid division"))
      .min(1, getMsg(t, "validation.required", "Division is required")),
    position_id: z
      .string()
      .uuid(getMsg(t, "validation.invalidId", "Invalid position"))
      .min(1, getMsg(t, "validation.required", "Position is required")),
    required_count: z
      .number()
      .int(getMsg(t, "validation.mustBeInteger", "Must be a whole number"))
      .positive(getMsg(t, "validation.requiredCountPositive", "Required count must be greater than 0"))
      .min(1, getMsg(t, "validation.requiredCountMin", "At least 1 position required")),
    employment_type: z
      .string()
      .min(1, getMsg(t, "validation.required", "Employment type is required")),
    expected_start_date: z
      .string()
      .min(1, getMsg(t, "validation.required", "Expected start date is required")),
    salary_range_min: z
      .number()
      .min(0, getMsg(t, "validation.salaryMin", "Salary cannot be negative"))
      .optional(),
    salary_range_max: z
      .number()
      .min(0, getMsg(t, "validation.salaryMin", "Salary cannot be negative"))
      .optional(),
    job_description: z
      .string()
      .min(1, getMsg(t, "validation.required", "Job description is required"))
      .max(5000, getMsg(t, "validation.maxLength", "Maximum length exceeded")),
    qualifications: z
      .string()
      .min(1, getMsg(t, "validation.required", "Qualifications are required"))
      .max(5000, getMsg(t, "validation.maxLength", "Maximum length exceeded")),
    priority: z.string().optional(),
    notes: z
      .string()
      .max(2000, getMsg(t, "validation.maxLength", "Maximum length exceeded"))
      .optional(),
  });

export const getUpdateRecruitmentRequestSchema = (t?: TranslationFn) =>
  getRecruitmentRequestSchema(t).partial();

export const getUpdateRecruitmentStatusSchema = () =>
  z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "OPEN", "CLOSED", "CANCELLED"]),
    notes: z.string().optional(),
  });

export const getUpdateFilledCountSchema = () =>
  z.object({
    filled_count: z.number().int().min(0, "Filled count cannot be negative"),
  });

// Inferred types
export type CreateRecruitmentFormData = z.infer<ReturnType<typeof getRecruitmentRequestSchema>>;
export type UpdateRecruitmentFormData = z.infer<ReturnType<typeof getUpdateRecruitmentRequestSchema>>;
export type UpdateRecruitmentStatusFormData = z.infer<ReturnType<typeof getUpdateRecruitmentStatusSchema>>;
export type UpdateFilledCountFormData = z.infer<ReturnType<typeof getUpdateFilledCountSchema>>;

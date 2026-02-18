import { z } from "zod";

type TranslationFn = (key: string) => string;

// Loose UUID regex: accepts any hex UUID-formatted string (not strict RFC 4122)
// This is needed because seeder UUIDs don't have valid version/variant bits
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// ---- Evaluation Group Schemas ----

export const getEvaluationGroupSchema = (t?: TranslationFn) =>
  z.object({
    name: z
      .string()
      .min(1, getMsg(t, "validation.required", "Name is required"))
      .max(200, getMsg(t, "validation.maxLength", "Name must be at most 200 characters")),
    description: z.string().max(1000).optional(),
    is_active: z.boolean().default(true),
  });

export const getUpdateEvaluationGroupSchema = (t?: TranslationFn) =>
  getEvaluationGroupSchema(t).partial();

// ---- Evaluation Criteria Schemas ----

export const getEvaluationCriteriaSchema = (t?: TranslationFn) =>
  z.object({
    evaluation_group_id: z
      .string()
      .regex(UUID_REGEX, getMsg(t, "validation.invalidId", "Invalid evaluation group ID"))
      .min(1, getMsg(t, "validation.required", "Evaluation group is required")),
    name: z
      .string()
      .min(1, getMsg(t, "validation.required", "Name is required"))
      .max(200, getMsg(t, "validation.maxLength", "Name must be at most 200 characters")),
    description: z.string().max(1000).optional(),
    weight: z
      .number()
      .positive(getMsg(t, "validation.weightPositive", "Weight must be greater than 0"))
      .max(100, getMsg(t, "validation.weightMax", "Weight cannot exceed 100")),
    max_score: z
      .number()
      .positive(getMsg(t, "validation.maxScorePositive", "Max score must be greater than 0"))
      .default(100),
    sort_order: z.number().min(0).default(0),
  });

export const getUpdateEvaluationCriteriaSchema = (t?: TranslationFn) =>
  getEvaluationCriteriaSchema(t).partial().omit({ evaluation_group_id: true });

// ---- Criteria Score Schema ----

export const getCriteriaScoreSchema = (t?: TranslationFn) =>
  z.object({
    evaluation_criteria_id: z
      .string()
      .regex(UUID_REGEX, getMsg(t, "validation.invalidId", "Invalid criteria ID")),
    score: z
      .number()
      .min(0, getMsg(t, "validation.scoreMin", "Score cannot be negative")),
    notes: z.string().max(500).optional(),
  });

// ---- Employee Evaluation Schemas ----

export const getEmployeeEvaluationSchema = (t?: TranslationFn) =>
  z.object({
    employee_id: z
      .string()
      .regex(UUID_REGEX, getMsg(t, "validation.invalidId", "Invalid employee ID"))
      .min(1, getMsg(t, "validation.required", "Employee is required")),
    evaluation_group_id: z
      .string()
      .regex(UUID_REGEX, getMsg(t, "validation.invalidId", "Invalid evaluation group ID"))
      .min(1, getMsg(t, "validation.required", "Evaluation group is required")),
    evaluator_id: z
      .string()
      .regex(UUID_REGEX, getMsg(t, "validation.invalidId", "Invalid evaluator ID"))
      .min(1, getMsg(t, "validation.required", "Evaluator is required")),
    evaluation_type: z.enum(["SELF", "MANAGER"], {
      message: getMsg(t, "validation.required", "Evaluation type is required"),
    }),
    period_start: z
      .string()
      .min(1, getMsg(t, "validation.required", "Period start is required")),
    period_end: z
      .string()
      .min(1, getMsg(t, "validation.required", "Period end is required")),
    notes: z.string().max(2000).optional(),
    criteria_scores: z.array(getCriteriaScoreSchema(t)).optional(),
  });

export const getUpdateEmployeeEvaluationSchema = (t?: TranslationFn) =>
  getEmployeeEvaluationSchema(t)
    .partial()
    .omit({ employee_id: true, evaluation_group_id: true, evaluator_id: true });

export const getUpdateEvaluationStatusSchema = () =>
  z.object({
    status: z.enum(["SUBMITTED", "REVIEWED", "FINALIZED"]),
    notes: z.string().max(2000).optional(),
  });

// Inferred types
export type CreateEvaluationGroupFormData = z.infer<ReturnType<typeof getEvaluationGroupSchema>>;
export type UpdateEvaluationGroupFormData = z.infer<ReturnType<typeof getUpdateEvaluationGroupSchema>>;
export type CreateEvaluationCriteriaFormData = z.infer<ReturnType<typeof getEvaluationCriteriaSchema>>;
export type UpdateEvaluationCriteriaFormData = z.infer<ReturnType<typeof getUpdateEvaluationCriteriaSchema>>;
export type CreateEmployeeEvaluationFormData = z.infer<ReturnType<typeof getEmployeeEvaluationSchema>>;
export type UpdateEmployeeEvaluationFormData = z.infer<ReturnType<typeof getUpdateEmployeeEvaluationSchema>>;
export type UpdateEvaluationStatusFormData = z.infer<ReturnType<typeof getUpdateEvaluationStatusSchema>>;
export type CriteriaScoreFormData = z.infer<ReturnType<typeof getCriteriaScoreSchema>>;

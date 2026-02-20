import { z } from "zod";

// Helper type for translation function
type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Division schemas
export const getDivisionSchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMinLength", "Name must be at least 2 characters"))
    .max(100, getMsg(t, "validation.nameMaxLength", "Name cannot exceed 100 characters")),
  description: z.string().max(500, getMsg(t, "validation.descriptionMaxLength")).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type DivisionFormData = z.infer<ReturnType<typeof getDivisionSchema>>;

// JobPosition schemas
export const getJobPositionSchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMinLength"))
    .max(100, getMsg(t, "validation.nameMaxLength")),
  description: z.string().max(500, getMsg(t, "validation.descriptionMaxLength")).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type JobPositionFormData = z.infer<ReturnType<typeof getJobPositionSchema>>;

// BusinessUnit schemas
export const getBusinessUnitSchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMinLength"))
    .max(100, getMsg(t, "validation.nameMaxLength")),
  description: z.string().max(500, getMsg(t, "validation.descriptionMaxLength")).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type BusinessUnitFormData = z.infer<ReturnType<typeof getBusinessUnitSchema>>;

// BusinessType schemas
export const getBusinessTypeSchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMinLength"))
    .max(100, getMsg(t, "validation.nameMaxLength")),
  description: z.string().max(500, getMsg(t, "validation.descriptionMaxLength")).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type BusinessTypeFormData = z.infer<ReturnType<typeof getBusinessTypeSchema>>;

// Area schemas
export const getAreaSchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMinLength"))
    .max(100, getMsg(t, "validation.nameMaxLength")),
  description: z.string().max(500, getMsg(t, "validation.descriptionMaxLength")).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type AreaFormData = z.infer<ReturnType<typeof getAreaSchema>>;

// Company schemas
export const getCompanySchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMinLength"))
    .max(200, getMsg(t, "validation.nameMaxLength")),
  address: z.string().max(500, getMsg(t, "validation.addressMaxLength")).optional().or(z.literal("")),
  email: z.string().email(getMsg(t, "validation.emailInvalid")).max(100).optional().or(z.literal("")),
  phone: z.string().max(20, getMsg(t, "validation.phoneMaxLength")).optional().or(z.literal("")),
  npwp: z.string().max(30, getMsg(t, "validation.npwpMaxLength")).optional().or(z.literal("")),
  nib: z.string().max(30, getMsg(t, "validation.nibMaxLength")).optional().or(z.literal("")),
  village_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  // Location cascade fields (not sent to API directly in create/update DTO if using village_id, but needed for form state)
  province_id: z.string().or(z.number()).optional(),
  city_id: z.string().or(z.number()).optional(),
  district_id: z.string().or(z.number()).optional(),
  
  // Coordinates
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  
  director_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  is_active: z.boolean(),
});

export type CompanyFormData = z.infer<ReturnType<typeof getCompanySchema>>;

// Approve company schema
export const approveCompanySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional().or(z.literal("")),
});

export type ApproveCompanyFormData = z.infer<typeof approveCompanySchema>;

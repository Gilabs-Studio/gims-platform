import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// Country schemas
export const getCountrySchema = (t?: TranslationFn) => z.object({
  name: z.string()
    .min(2, getMsg(t, "validation.nameMin", "Name must be at least 2 characters"))
    .max(100, getMsg(t, "validation.nameMax")),
  code: z
    .string()
    .min(2, getMsg(t, "validation.codeMin", "Code must be at least 2 characters"))
    .max(10, getMsg(t, "validation.countryCodeMax"))
    .toUpperCase(),
  phone_code: z.string().max(10, getMsg(t, "validation.phoneCodeMax")).optional(),
  is_active: z.boolean(),
});

export const getUpdateCountrySchema = (t?: TranslationFn) => getCountrySchema(t).partial();

export type CreateCountryFormData = z.infer<ReturnType<typeof getCountrySchema>>;
export type UpdateCountryFormData = z.infer<ReturnType<typeof getUpdateCountrySchema>>;

// Province schemas
export const getProvinceSchema = (t?: TranslationFn) => z.object({
  country_id: z.string().uuid(getMsg(t, "province.validation.invalidId", "Invalid country ID")),
  name: z.string()
    .min(2, getMsg(t, "validation.nameMin"))
    .max(100, getMsg(t, "validation.nameMax")),
  code: z.string()
    .min(2, getMsg(t, "validation.codeMin"))
    .max(20, getMsg(t, "validation.codeMax")),
  is_active: z.boolean(),
});

export const getUpdateProvinceSchema = (t?: TranslationFn) => getProvinceSchema(t).partial();

export type CreateProvinceFormData = z.infer<ReturnType<typeof getProvinceSchema>>;
export type UpdateProvinceFormData = z.infer<ReturnType<typeof getUpdateProvinceSchema>>;

// City schemas
export const getCitySchema = (t?: TranslationFn) => z.object({
  province_id: z.string().uuid(getMsg(t, "city.validation.invalidId", "Invalid province ID")),
  name: z.string()
    .min(2, getMsg(t, "validation.nameMin"))
    .max(100, getMsg(t, "validation.nameMax")),
  code: z.string()
    .min(2, getMsg(t, "validation.codeMin"))
    .max(20, getMsg(t, "validation.codeMax")),
  type: z.enum(["city", "regency"]),
  is_active: z.boolean(),
});

export const getUpdateCitySchema = (t?: TranslationFn) => getCitySchema(t).partial();

export type CreateCityFormData = z.infer<ReturnType<typeof getCitySchema>>;
export type UpdateCityFormData = z.infer<ReturnType<typeof getUpdateCitySchema>>;

// District schemas
export const getDistrictSchema = (t?: TranslationFn) => z.object({
  city_id: z.string().uuid(getMsg(t, "district.validation.invalidId", "Invalid city ID")),
  name: z.string()
    .min(2, getMsg(t, "validation.nameMin"))
    .max(100, getMsg(t, "validation.nameMax")),
  code: z.string()
    .min(2, getMsg(t, "validation.codeMin"))
    .max(20, getMsg(t, "validation.codeMax")),
  is_active: z.boolean(),
});

export const getUpdateDistrictSchema = (t?: TranslationFn) => getDistrictSchema(t).partial();

export type CreateDistrictFormData = z.infer<ReturnType<typeof getDistrictSchema>>;
export type UpdateDistrictFormData = z.infer<ReturnType<typeof getUpdateDistrictSchema>>;

// Village schemas
export const getVillageSchema = (t?: TranslationFn) => z.object({
  district_id: z.string().uuid(getMsg(t, "village.validation.invalidId", "Invalid district ID")),
  name: z.string()
    .min(2, getMsg(t, "validation.nameMin"))
    .max(100, getMsg(t, "validation.nameMax")),
  code: z.string()
    .min(2, getMsg(t, "validation.codeMin"))
    .max(20, getMsg(t, "validation.codeMax")),
  postal_code: z.string().max(10, getMsg(t, "validation.postalCodeMax")).optional(),
  type: z.enum(["village", "kelurahan"]),
  is_active: z.boolean(),
});

export const getUpdateVillageSchema = (t?: TranslationFn) => getVillageSchema(t).partial();

export type CreateVillageFormData = z.infer<ReturnType<typeof getVillageSchema>>;
export type UpdateVillageFormData = z.infer<ReturnType<typeof getUpdateVillageSchema>>;

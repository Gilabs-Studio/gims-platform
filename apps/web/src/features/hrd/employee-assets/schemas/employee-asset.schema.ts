import { z } from "zod";

export const assetConditionEnum = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationFn = (key: string, values?: Record<string, any>) => string;

// Same as employee-contract: permissive UUID regex so valid IDs from API pass.
// z.uuid() is RFC 4122 strict and can reject some valid UUIDs.
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const employeeIdSchema = (t: TranslationFn) =>
  z
    .string()
    .refine((val) => (val ?? "").trim().length > 0, {
      message: t("validation.required"),
    })
    .refine((val) => UUID_FORMAT.test((val ?? "").trim()), {
      message: t("validation.invalid_uuid"),
    });

export const getEmployeeAssetSchema = (t: TranslationFn) =>
  z.object({
    employee_id: employeeIdSchema(t),
    asset_name: z
      .string()
      .min(1, t("validation.required"))
      .max(255, t("validation.max_length", { max: 255 })),
    asset_code: z
      .string()
      .min(1, t("validation.required"))
      .max(100, t("validation.max_length", { max: 100 })),
    asset_category: z
      .string()
      .min(1, t("validation.required"))
      .max(100, t("validation.max_length", { max: 100 })),
    borrow_date: z.string().date(t("validation.invalid_date")),
    borrow_condition: z.enum(assetConditionEnum, {
      message: t("validation.invalid_condition"),
    }),
    notes: z.string().optional(),
  });

export const getUpdateEmployeeAssetSchema = (t: TranslationFn) =>
  z.object({
    asset_name: z
      .string()
      .max(255, t("validation.max_length", { max: 255 }))
      .optional(),
    asset_code: z
      .string()
      .max(100, t("validation.max_length", { max: 100 }))
      .optional(),
    asset_category: z
      .string()
      .max(100, t("validation.max_length", { max: 100 }))
      .optional(),
    borrow_date: z.string().date(t("validation.invalid_date")).optional(),
    borrow_condition: z
      .enum(assetConditionEnum, {
        message: t("validation.invalid_condition"),
      })
      .optional(),
    notes: z.string().optional(),
  });

export const getReturnAssetSchema = (t: TranslationFn) =>
  z.object({
    return_date: z.string().date(t("validation.invalid_date")),
    return_condition: z.enum(assetConditionEnum, {
      message: t("validation.invalid_condition"),
    }),
    notes: z.string().optional(),
  });

export type EmployeeAssetFormValues = z.infer<
  ReturnType<typeof getEmployeeAssetSchema>
>;
export type UpdateEmployeeAssetFormValues = z.infer<
  ReturnType<typeof getUpdateEmployeeAssetSchema>
>;
export type ReturnAssetFormValues = z.infer<
  ReturnType<typeof getReturnAssetSchema>
>;

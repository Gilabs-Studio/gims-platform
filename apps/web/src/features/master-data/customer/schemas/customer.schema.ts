import { z } from "zod";

type TranslationFn = (key: string) => string;

const getMsg = (t: TranslationFn | undefined, key: string): string =>
  t ? t(key) : key;

// Customer schema
export const getCustomerSchema = (t?: TranslationFn) =>
  z.object({
    name: z
      .string()
      .min(2, getMsg(t, "validation.nameMinLength"))
      .max(200, getMsg(t, "validation.nameMaxLength")),
    customer_type_id: z
      .string()
      .optional()
      .or(z.literal(""))
      .nullable(),
    address: z
      .string()
      .max(500, getMsg(t, "validation.addressMaxLength"))
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .email(getMsg(t, "validation.emailInvalid"))
      .max(100, getMsg(t, "validation.emailMaxLength"))
      .optional()
      .or(z.literal("")),
    website: z
      .string()
      .max(200, getMsg(t, "validation.websiteMaxLength"))
      .optional()
      .or(z.literal("")),
    npwp: z
      .string()
      .max(30, getMsg(t, "validation.npwpMaxLength"))
      .optional()
      .or(z.literal("")),
    contact_person: z.string().max(100).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
    village_name: z
      .string()
      .max(255)
      .optional()
      .or(z.literal(""))
      .nullable(),
    // Cascade fields for form state (not sent to API)
    province_id: z.string().optional(),
    city_id: z.string().optional(),
    district_id: z.string().optional(),
    // Coordinates
    latitude: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().nullable().optional()
    ),
    longitude: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().nullable().optional()
    ),
    is_active: z.boolean().optional(), // make optional if API drops it
    // Sales defaults
    default_business_type_id: z.string().optional().or(z.literal("")).nullable(),
    default_sales_rep_id: z.string().optional().or(z.literal("")).nullable(),
    default_payment_terms_id: z.string().optional().or(z.literal("")).nullable(),
    default_tax_rate: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().min(0).max(100).nullable().optional()
    ),
  });

export type CustomerFormDataBase = z.infer<ReturnType<typeof getCustomerSchema>>;
export type CustomerFormData = Omit<CustomerFormDataBase, "latitude" | "longitude" | "default_tax_rate"> & {
  latitude?: number | null;
  longitude?: number | null;
  default_tax_rate?: number | null;
};

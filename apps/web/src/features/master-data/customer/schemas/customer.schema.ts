import { z } from "zod";

type TranslationFn = (key: string) => string;

const getMsg = (t: TranslationFn | undefined, key: string): string =>
  t ? t(key) : key;

// Customer schema
export const getCustomerSchema = (t?: TranslationFn) =>
  z.object({
    code: z
      .string()
      .min(2, getMsg(t, "validation.codeMinLength"))
      .max(50, getMsg(t, "validation.codeMaxLength")),
    name: z
      .string()
      .min(2, getMsg(t, "validation.nameMinLength"))
      .max(200, getMsg(t, "validation.nameMaxLength")),
    customer_type_id: z
      .string()
      .uuid()
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
    village_id: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .nullable(),
    // Cascade fields for form state (not sent to API)
    province_id: z.string().or(z.number()).optional(),
    city_id: z.string().or(z.number()).optional(),
    district_id: z.string().or(z.number()).optional(),
    // Coordinates
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    is_active: z.boolean(),
  });

export type CustomerFormData = z.infer<ReturnType<typeof getCustomerSchema>>;

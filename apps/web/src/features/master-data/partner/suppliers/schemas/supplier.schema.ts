import { z } from "zod";

export const createSupplierSchema = z.object({
  province_id: z.number().min(1, "Province is required"),
  city_id: z.number().min(1, "City is required"),
  district_id: z.number().min(1, "District is required"),
  village_id: z.number().min(1, "Village is required"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  address: z.string().min(1, "Address is required"),
  contact_person: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email format").optional(),
  logo: z.instanceof(File).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const updateSupplierSchema = z.object({
  province_id: z.number().min(1, "Province is required").optional(),
  city_id: z.number().min(1, "City is required").optional(),
  district_id: z.number().min(1, "District is required").optional(),
  village_id: z.number().min(1, "Village is required").optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  address: z.string().min(1, "Address is required").optional(),
  contact_person: z.string().min(1, "Contact person is required").optional(),
  phone: z.string().min(1, "Phone is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  logo: z.instanceof(File).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateSupplierFormData = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierFormData = z.infer<typeof updateSupplierSchema>;


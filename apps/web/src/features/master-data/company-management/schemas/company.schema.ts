import { z } from "zod";

export const createCompanySchema = z.object({
  province_id: z.number().min(1, "Province is required"),
  city_id: z.number().min(1, "City is required"),
  district_id: z.number().min(1, "District is required"),
  village_id: z.number().min(1, "Village is required"),
  director_id: z.number().min(1, "Director is required"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  address: z.string().min(1, "Address is required"),
  npwp: z.string().optional(),
  nib: z.string().optional(),
  telp: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email format"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const updateCompanySchema = z.object({
  province_id: z.number().min(1, "Province is required").optional(),
  city_id: z.number().min(1, "City is required").optional(),
  district_id: z.number().min(1, "District is required").optional(),
  village_id: z.number().min(1, "Village is required").optional(),
  director_id: z.number().min(1, "Director is required").optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  address: z.string().min(1, "Address is required").optional(),
  npwp: z.string().optional(),
  nib: z.string().optional(),
  telp: z.string().min(1, "Phone is required").optional(),
  email: z.string().email("Invalid email format").optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateCompanyFormData = z.infer<typeof createCompanySchema>;
export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>;

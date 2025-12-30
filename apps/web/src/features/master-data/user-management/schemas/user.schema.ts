import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  is_active: z.boolean().default(true),
  photo_profile: z.instanceof(File).optional(),
  role_ids: z.array(z.number()).min(1, "At least one role is required"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  is_active: z.boolean().optional(),
  photo_profile: z.instanceof(File).optional(),
  role_ids: z.array(z.number()).optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;


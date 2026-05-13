import { z } from "zod";

export const systemAdminUpdateProfileSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  email: z.string().trim().email("Invalid email address"),
});

export type SystemAdminUpdateProfileFormData = z.infer<typeof systemAdminUpdateProfileSchema>;

export const systemAdminChangePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(8, "Current password must be at least 8 characters"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirm_password: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: "Confirm password must match new password",
    path: ["confirm_password"],
  });

export type SystemAdminChangePasswordFormData = z.infer<
  typeof systemAdminChangePasswordSchema
>;

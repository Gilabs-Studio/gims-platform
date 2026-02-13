import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

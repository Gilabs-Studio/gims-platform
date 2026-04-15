import { z } from "zod";

export const tierConfigSchema = z.object({
  name: z.string().min(1),
  min_lifetime_points: z.number().min(0),
  multiplier: z.number().min(0.1),
  badge_color: z.string().min(1),
});

export const rewardConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  points_cost: z.number().min(1),
  description: z.string(),
});

export const loyaltyConfigSchema = z.object({
  point_rules: z.object({
    amount_per_point: z.number().min(1),
    points_per_amount: z.number().min(1),
  }),
  tiers: z.array(tierConfigSchema).min(1, "At least one tier is required"),
  rewards: z.array(rewardConfigSchema),
  point_expiry_days: z.number().min(0),
});

export const createLoyaltyProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  outlet_id: z.string().optional(),
  config: loyaltyConfigSchema,
  is_active: z.boolean().optional(),
});

export const enrollMemberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  outlet_id: z.string().min(1),
});

export const publicRegisterSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export type CreateLoyaltyProgramFormValues = z.infer<typeof createLoyaltyProgramSchema>;
export type EnrollMemberFormValues = z.infer<typeof enrollMemberSchema>;
export type PublicRegisterFormValues = z.infer<typeof publicRegisterSchema>;

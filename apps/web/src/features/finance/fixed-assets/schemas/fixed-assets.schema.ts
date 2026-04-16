import { z } from "zod";

// Batch Depreciation Schemas
export const batchDepreciationSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2099),
});

export type BatchDepreciationValues = z.infer<typeof batchDepreciationSchema>;

// Disposal Schemas
export const assetDisposalSchema = z.object({
  asset_id: z.string().uuid(),
  proceeds_amount: z.number().positive(),
  disposal_account_id: z.string().uuid().optional(),
  bank_account_id: z.string().uuid(),
  disposal_date: z.string().min(1),
  description: z.string().optional(),
});

export type AssetDisposalValues = z.infer<typeof assetDisposalSchema>;

// Revaluation Schemas
export const assetRevaluationSchema = z.object({
  asset_id: z.string().uuid(),
  revaluation_amount: z.number(),
  delta_amount: z.number(),
  effective_date: z.string().min(1),
  description: z.string().optional(),
});

export type AssetRevaluationValues = z.infer<typeof assetRevaluationSchema>;

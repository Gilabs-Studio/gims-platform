import { z } from "zod";

export const importBankStatementSchema = z.object({
  company_id: z.string().min(1),
  bank_account_id: z.string().min(1),
  statement_date: z.string().min(1),
  statement_balance: z.number(),
  file_format: z.enum(["csv", "mt940", "ofx"]),
});

export type ImportBankStatementSchema = z.infer<typeof importBankStatementSchema>;

export const excludeStatementLineSchema = z.object({
  reason: z.string().min(1),
});

export type ExcludeStatementLineSchema = z.infer<typeof excludeStatementLineSchema>;

import { z } from "zod";

const lineSchema = z
  .object({
    chart_of_account_id: z.string().uuid(),
    debit: z.number().min(0).optional(),
    credit: z.number().min(0).optional(),
    memo: z.string().trim().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const debit = typeof v.debit === "number" ? v.debit : 0;
    const credit = typeof v.credit === "number" ? v.credit : 0;

    const hasDebit = debit > 0;
    const hasCredit = credit > 0;

    if (hasDebit && hasCredit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line cannot have both debit and credit" });
    }
    if (!hasDebit && !hasCredit) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line must have debit or credit" });
    }
  });

export const journalFormSchema = z
  .object({
    entry_date: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
    lines: z.array(lineSchema).min(2),
  })
  .superRefine((v, ctx) => {
    const debitTotal = v.lines.reduce((sum, ln) => sum + (typeof ln.debit === "number" ? ln.debit : 0), 0);
    const creditTotal = v.lines.reduce((sum, ln) => sum + (typeof ln.credit === "number" ? ln.credit : 0), 0);
    if (Math.abs(debitTotal - creditTotal) > 0.000001) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Journal must be balanced" });
    }
  });

export type JournalFormValues = z.infer<typeof journalFormSchema>;

import { z } from "zod";

export const cashBankLineSchema = z.object({
  chart_of_account_id: z.string().min(1, "Akun wajib dipilih"),
  amount: z.number().positive("Nilai harus lebih dari 0"),
  memo: z.string(),
});

export const cashBankFormSchema = z.object({
  transaction_date: z.string().min(1, "Tanggal transaksi wajib diisi"),
  type: z.enum(["cash_in", "cash_out", "transfer"]),
  description: z.string(),
  bank_account_id: z.string().min(1, "Rekening bank wajib dipilih"),
  lines: z.array(cashBankLineSchema).min(1, "Minimal 1 baris jurnal wajib diisi"),
});

export type CashBankFormValues = z.infer<typeof cashBankFormSchema>;

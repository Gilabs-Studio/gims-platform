import { z } from "zod";

export const budgetCategorySchema = z.object({
  id: z.string().optional(),
  category_id: z.string().optional(),
  category_name: z.string().min(1, "Nama kategori wajib diisi"),
  allocated_amount: z.number().min(0, "Jumlah alokasi tidak boleh negatif"),
  notes: z.string().optional(),
});

export const assetBudgetSchema = z.object({
  budget_name: z.string().min(1, "Nama budget wajib diisi"),
  description: z.string().optional(),
  fiscal_year: z
    .number()
    .min(2000, "Tahun tidak valid")
    .max(2100, "Tahun tidak valid"),
  start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
  categories: z
    .array(budgetCategorySchema)
    .min(1, "Minimal satu kategori budget diperlukan"),
});

export type AssetBudgetFormValues = z.infer<typeof assetBudgetSchema>;
export type BudgetCategoryFormValues = z.infer<typeof budgetCategorySchema>;

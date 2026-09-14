import { z } from "zod";

export const createHRTicketSchema = z.object({
  title: z
    .string()
    .min(5, { message: "Judul pengajuan / kendala aset minimal 5 karakter" })
    .max(120, { message: "Judul pengajuan maksimal 120 karakter" }),
  asset_name: z.string().optional(),
  asset_code: z.string().optional(),
  category: z.enum([
    "hr_asset_repair",
    "hr_asset_replacement",
    "hr_facility_building",
    "hr_payroll_admin",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  location: z.string().min(2, { message: "Lokasi aset / ruangan wajib diisi" }),
  description: z
    .string()
    .min(10, { message: "Deskripsi kondisi / kendala aset minimal 10 karakter" }),
  photos: z.array(z.string()),
});

export type CreateHRTicketFormValues = z.infer<typeof createHRTicketSchema>;

export const assignHRTechnicianSchema = z.object({
  technician_id: z.string().min(1, { message: "Petugas / Teknisi SDM wajib dipilih" }),
  target_completion_date: z
    .string()
    .min(1, { message: "Target tanggal perbaikan wajib diisi" }),
  notes: z.string().optional(),
});

export type AssignHRTechnicianFormValues = z.infer<typeof assignHRTechnicianSchema>;

export const updateHRTicketStatusSchema = z.object({
  status: z.enum([
    "open",
    "assigned",
    "in_progress",
    "pending_parts",
    "resolved",
    "closed",
    "rejected",
  ]),
  notes: z.string().min(3, { message: "Catatan penanganan / status wajib diisi" }),
  resolution_photos: z.array(z.string()),
});

export type UpdateHRTicketStatusFormValues = z.infer<typeof updateHRTicketStatusSchema>;

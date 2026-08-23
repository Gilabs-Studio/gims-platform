import { z } from "zod";

export const createITTicketSchema = z.object({
  title: z
    .string()
    .min(5, { message: "Judul tiket minimal 5 karakter" })
    .max(120, { message: "Judul tiket maksimal 120 karakter" }),
  category: z.enum([
    "it_hardware",
    "it_software",
    "it_network",
    "it_account",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  location: z.string().min(2, { message: "Lokasi ruangan/area wajib diisi" }),
  description: z
    .string()
    .min(10, { message: "Deskripsi kendala IT minimal 10 karakter" }),
  photos: z.array(z.string()),
});

export type CreateITTicketFormValues = z.infer<typeof createITTicketSchema>;

export const assignITTechnicianSchema = z.object({
  technician_id: z.string().min(1, { message: "Teknisi IT wajib dipilih" }),
  target_completion_date: z
    .string()
    .min(1, { message: "Target tanggal perbaikan wajib diisi" }),
  notes: z.string().optional(),
});

export type AssignITTechnicianFormValues = z.infer<typeof assignITTechnicianSchema>;

export const updateITTicketStatusSchema = z.object({
  status: z.enum([
    "open",
    "assigned",
    "in_progress",
    "pending_parts",
    "resolved",
    "closed",
  ]),
  notes: z.string().min(3, { message: "Catatan perbaikan / penanganan wajib diisi" }),
  resolution_photos: z.array(z.string()),
});

export type UpdateITTicketStatusFormValues = z.infer<typeof updateITTicketStatusSchema>;

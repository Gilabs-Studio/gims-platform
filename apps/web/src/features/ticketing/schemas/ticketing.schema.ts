import { z } from "zod";

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, { message: "Judul tiket minimal 5 karakter" })
    .max(120, { message: "Judul tiket maksimal 120 karakter" }),
  category: z.enum([
    "it_hardware",
    "it_software",
    "facility_ac",
    "facility_plumbing",
    "facility_electrical",
    "general_maintenance",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  location: z.string().min(2, { message: "Lokasi ruangan/area wajib diisi" }),
  description: z
    .string()
    .min(10, { message: "Deskripsi kendala minimal 10 karakter" }),
  photos: z.array(z.string()),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

export const assignTechnicianSchema = z.object({
  technician_id: z.string().min(1, { message: "Teknisi wajib dipilih" }),
  target_completion_date: z
    .string()
    .min(1, { message: "Target tanggal perbaikan wajib diisi" }),
  notes: z.string().optional(),
});

export type AssignTechnicianFormValues = z.infer<typeof assignTechnicianSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum([
    "open",
    "assigned",
    "in_progress",
    "pending_parts",
    "resolved",
    "closed",
    "rejected",
  ]),
  notes: z.string().min(3, { message: "Catatan penanganan/status wajib diisi" }),
  resolution_photos: z.array(z.string()),
});

export type UpdateTicketStatusFormValues = z.infer<typeof updateTicketStatusSchema>;

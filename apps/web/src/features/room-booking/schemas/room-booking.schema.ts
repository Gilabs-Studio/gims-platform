import { z } from "zod";

export const createBookingSchema = z.object({
  roomId: z.string().min(1, { message: "Pilih ruangan meeting" }),
  title: z.string().min(3, { message: "Judul kegiatan minimal 3 karakter" }),
  date: z.string().min(1, { message: "Pilih tanggal booking" }),
  startTime: z.string().min(1, { message: "Pilih jam mulai" }),
  endTime: z.string().min(1, { message: "Pilih jam selesai" }),
  organizerName: z.string().min(2, { message: "Nama penyelenggara wajib diisi" }),
  department: z.string().min(2, { message: "Departemen wajib diisi" }),
  notes: z.string().optional(),
  equipmentNeeded: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return data.startTime < data.endTime;
  }
  return true;
}, {
  message: "Jam selesai harus setelah jam mulai",
  path: ["endTime"],
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

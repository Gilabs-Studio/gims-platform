import { z } from "zod";

// Holiday type enum
export const holidayTypeSchema = z.enum(["NATIONAL", "COLLECTIVE", "COMPANY"]);

// Holiday schema
export const holidaySchema = z.object({
  date: z.string()
    .min(1, "Date is required"),
  name: z.string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  type: holidayTypeSchema.default("NATIONAL"),
  is_collective_leave: z.boolean().default(false),
  cuts_annual_leave: z.boolean().default(false),
});

export type HolidayFormData = z.infer<typeof holidaySchema>;

// Update schema (all fields optional except date)
export const updateHolidaySchema = holidaySchema.partial().extend({
  date: z.string().optional(),
});

export type UpdateHolidayFormData = z.infer<typeof updateHolidaySchema>;

// Batch holiday schema
export const batchHolidaySchema = z.object({
  holidays: z.array(holidaySchema).min(1, "At least one holiday is required"),
});

export type BatchHolidayFormData = z.infer<typeof batchHolidaySchema>;

// Import CSV schema
export const importHolidaySchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
  year: z.number().min(2020).max(2100),
});

export type ImportHolidayFormData = z.infer<typeof importHolidaySchema>;

// Holiday type options for UI
export const HOLIDAY_TYPE_OPTIONS = [
  { value: "NATIONAL", label: "National Holiday" },
  { value: "COLLECTIVE", label: "Collective Leave" },
  { value: "COMPANY", label: "Company Holiday" },
] as const;

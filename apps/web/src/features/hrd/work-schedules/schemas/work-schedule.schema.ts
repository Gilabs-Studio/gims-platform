import { z } from "zod";

// Break time schema
export const breakTimeSchema = z.object({
  start_time: z
    .string()
    .min(1, "Start time is required")
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  end_time: z
    .string()
    .min(1, "End time is required")
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
});

export type BreakTime = z.infer<typeof breakTimeSchema>;

// Work schedule schema
export const workScheduleSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    start_time: z
      .string()
      .min(1, "Start time is required")
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    end_time: z
      .string()
      .min(1, "End time is required")
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    is_flexible: z.boolean(),
    flexible_start_time: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
      .optional()
      .or(z.literal("")),
    flexible_end_time: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
      .optional()
      .or(z.literal("")),
    breaks: z
      .array(breakTimeSchema)
      .min(1, "At least one break time is required"),
    working_days: z.number().min(1).max(127),
    late_tolerance_minutes: z.number().min(0).max(60),
    early_leave_tolerance_minutes: z.number().min(0).max(60),
    require_gps: z.boolean(),
    gps_radius_meter: z.number().min(10).max(5000).optional(),
    office_latitude: z.number().min(-90).max(90).optional(),
    office_longitude: z.number().min(-180).max(180).optional(),
    division_id: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // If flexible, flexible times are required
      if (data.is_flexible) {
        return data.flexible_start_time && data.flexible_end_time;
      }
      return true;
    },
    {
      message:
        "Flexible start and end times are required when flexible schedule is enabled",
      path: ["flexible_start_time"],
    },
  )
  .refine(
    (data) => {
      // If GPS required, coordinates should be set
      if (data.require_gps) {
        return (
          data.office_latitude !== undefined &&
          data.office_longitude !== undefined
        );
      }
      return true;
    },
    {
      message: "Office coordinates are required when GPS is enabled",
      path: ["office_latitude"],
    },
  );

export type WorkScheduleFormData = z.infer<typeof workScheduleSchema>;

// Update schema (all fields optional)
export const updateWorkScheduleSchema = workScheduleSchema.partial();

export type UpdateWorkScheduleFormData = z.infer<
  typeof updateWorkScheduleSchema
>;

// Working days helper
export const WORKING_DAYS_OPTIONS = [
  { value: 31, label: "Monday - Friday" },
  { value: 63, label: "Monday - Saturday" },
  { value: 127, label: "Every day" },
] as const;

export const DAY_LABELS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 4, label: "Wed" },
  { value: 8, label: "Thu" },
  { value: 16, label: "Fri" },
  { value: 32, label: "Sat" },
  { value: 64, label: "Sun" },
] as const;

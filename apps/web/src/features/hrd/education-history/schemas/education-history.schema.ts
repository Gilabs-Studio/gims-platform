import { z } from "zod";
import type { DegreeLevel } from "../types";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (
  t: TranslationFn | undefined,
  key: string,
  defaultMsg?: string
) => {
  return t ? t(key) : defaultMsg;
};

// UUID format: 8-4-4-4-12 hex. Use regex (not z.uuid()) so test/seed UUIDs like 11111111-1111-1111-1111-111111111111 pass.
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Degree level values
const degreeLevels: DegreeLevel[] = [
  "ELEMENTARY",
  "JUNIOR_HIGH",
  "SENIOR_HIGH",
  "DIPLOMA",
  "BACHELOR",
  "MASTER",
  "DOCTORATE",
];

// Employee Education History Schema
export const getEducationHistorySchema = (t?: TranslationFn) =>
  z
    .object({
      employee_id: z
        .string()
        .refine((val) => (val ?? "").trim().length > 0, {
          message: getMsg(t, "validation.required", "Employee is required"),
        })
        .refine((val) => UUID_FORMAT.test((val ?? "").trim()), {
          message: getMsg(t, "validation.invalidId", "Invalid ID format"),
        }),
      institution: z
        .string()
        .min(1, getMsg(t, "validation.required", "Institution is required"))
        .max(
          200,
          getMsg(
            t,
            "validation.maxLength",
            "Institution must not exceed 200 characters"
          )
        ),
      degree: z.enum(degreeLevels as [DegreeLevel, ...DegreeLevel[]]),
      field_of_study: z
        .string()
        .max(
          200,
          getMsg(
            t,
            "validation.maxLength",
            "Field of study must not exceed 200 characters"
          )
        )
        .optional(),
      start_date: z
        .string()
        .min(1, getMsg(t, "validation.required", "Start date is required")),
      end_date: z.string().optional().nullable(),
      gpa: z
        .number()
        .min(0, getMsg(t, "validation.gpaMin", "GPA cannot be negative"))
        .max(4, getMsg(t, "validation.gpaMax", "GPA cannot exceed 4.0"))
        .optional()
        .nullable(),
      description: z.string().optional(),
      document_path: z
        .string()
        .max(
          255,
          getMsg(
            t,
            "validation.maxLength",
            "Document path must not exceed 255 characters"
          )
        )
        .optional(),
    })
    .refine(
      (data) => {
        if (data.end_date && data.start_date) {
          return new Date(data.end_date) >= new Date(data.start_date);
        }
        return true;
      },
      {
        message: getMsg(
          t,
          "validation.endDateAfterStart",
          "End date must be after start date"
        ),
        path: ["end_date"],
      }
    );

export type EducationHistoryFormValues = z.infer<
  ReturnType<typeof getEducationHistorySchema>
>;

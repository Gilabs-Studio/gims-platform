import { z } from "zod";

type TranslationFn = (key: string) => string;

// Helper to get message or default
const getMsg = (t: TranslationFn | undefined, key: string, defaultMsg?: string) => {
  return t ? t(key) : defaultMsg;
};

// UUID format: 8-4-4-4-12 hex. Use regex (not z.uuid()) so test/seed UUIDs like 11111111-1111-1111-1111-111111111111
// pass; Zod's z.uuid() is RFC 4122 strict and rejects variant 0 (e.g. 4th segment starting with 1).
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate employee_id: required non-empty string and UUID format (permissive).
const employeeIdSchema = (t?: TranslationFn) =>
  z
    .string()
    .refine((val) => (val ?? "").trim().length > 0, {
      message: getMsg(t, "validation.required", "Employee is required") ?? "Employee is required",
    })
    .refine((val) => UUID_FORMAT.test((val ?? "").trim()), {
      message: getMsg(t, "validation.invalidId", "Invalid ID format") ?? "Invalid ID format",
    });

// Employee Contract Schema
export const getEmployeeContractSchema = (t?: TranslationFn) => z.object({
  employee_id: employeeIdSchema(t),
  contract_number: z.string()
    .min(1, getMsg(t, "validation.required", "Contract number is required"))
    .max(50, getMsg(t, "validation.contractNumberMax", "Contract number must not exceed 50 characters")),
  contract_type: z.enum(["PERMANENT", "CONTRACT", "INTERNSHIP", "PROBATION"], {
    message: getMsg(t, "validation.invalidContractType", "Invalid contract type") || "Invalid contract type"
  }),
  start_date: z.string()
    .min(1, getMsg(t, "validation.required", "Start date is required")),
  end_date: z.string().optional().nullable(),
  salary: z.number()
    .positive(getMsg(t, "validation.salaryPositive", "Salary must be greater than 0"))
    .min(0.01, getMsg(t, "validation.salaryMin", "Salary must be at least 0.01")),
  job_title: z.string()
    .min(1, getMsg(t, "validation.required", "Job title is required"))
    .max(100, getMsg(t, "validation.jobTitleMax", "Job title must not exceed 100 characters")),
  department: z.string()
    .max(100, getMsg(t, "validation.departmentMax", "Department must not exceed 100 characters"))
    .optional(),
  terms: z.string().optional(),
  document_path: z.string()
    .max(255, getMsg(t, "validation.documentPathMax", "Document path must not exceed 255 characters"))
    .optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "TERMINATED"], {
    message: getMsg(t, "validation.invalidStatus", "Invalid status") || "Invalid status"
  }).optional(),
}).superRefine((data, ctx) => {
  // Business rule: PERMANENT contracts cannot have end_date
  if (data.contract_type === "PERMANENT" && data.end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: getMsg(t, "validation.permanentNoEndDate", "Permanent contracts cannot have an end date") || "Permanent contracts cannot have an end date",
    });
  }

  // Business rule: Non-PERMANENT contracts must have end_date
  if (data.contract_type !== "PERMANENT" && !data.end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: getMsg(t, "validation.contractNeedsEndDate", "Non-permanent contracts must have an end date") || "Non-permanent contracts must have an end date",
    });
  }

  // Validate end_date is after start_date
  if (data.end_date && data.start_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (endDate <= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: getMsg(t, "validation.endDateAfterStart", "End date must be after start date") || "End date must be after start date",
      });
    }
  }
});

export type EmployeeContractFormData = z.infer<ReturnType<typeof getEmployeeContractSchema>>;

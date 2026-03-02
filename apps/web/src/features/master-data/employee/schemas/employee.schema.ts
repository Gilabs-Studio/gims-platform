import { z } from "zod";

export const employeeSchema = z.object({
  employee_code: z.string().max(50).optional(),
  name: z.string().min(2, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  user_id: z.string().optional(),
  division_id: z.string().optional(),
  job_position_id: z.string().optional(),
  company_id: z.string().optional(),
  date_of_birth: z
    .date()
    .optional()
    .nullable()
    .or(z.string().optional().nullable()),
  place_of_birth: z.string().max(100).optional(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  religion: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  nik: z.string().max(20).optional(),
  npwp: z.string().max(30).optional(),
  bpjs: z.string().max(30).optional(),
  include_contract: z.boolean().optional(),
  contract_number: z.string().max(50).optional(),
  contract_type: z.enum(["PKWTT", "PKWT", "Intern"]).optional(),
  contract_start_date: z
    .date()
    .optional()
    .nullable()
    .or(z.string().optional().nullable()),
  contract_end_date: z
    .date()
    .optional()
    .nullable()
    .or(z.string().optional().nullable()),
  contract_document: z.string().optional(),
  total_leave_quota: z.coerce.number().min(0).optional(),
  ptkp_status: z
    .enum([
      "TK/0",
      "TK/1",
      "TK/2",
      "TK/3",
      "K/0",
      "K/1",
      "K/2",
      "K/3",
      "K/I/0",
      "K/I/1",
      "K/I/2",
      "K/I/3",
    ])
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
  // For User Creation
  create_user: z.boolean().optional(),
  role_id: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

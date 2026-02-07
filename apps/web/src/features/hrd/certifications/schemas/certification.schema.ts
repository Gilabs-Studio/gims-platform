import { z } from "zod";

export const getSchema = (t: (key: string) => string) => {
  return {
    certification: z
      .object({
        employee_id: z.string().uuid(t("validation.invalid_employee")),
        certificate_name: z
          .string()
          .min(1, t("validation.certificate_name_required"))
          .max(200, t("validation.certificate_name_max")),
        issued_by: z
          .string()
          .min(1, t("validation.issued_by_required"))
          .max(200, t("validation.issued_by_max")),
        issue_date: z.string().min(1, t("validation.issue_date_required")),
        expiry_date: z.string().nullable().optional(),
        certificate_number: z
          .string()
          .max(100, t("validation.certificate_number_max"))
          .nullable()
          .optional(),
        certificate_file: z.string().nullable().optional(),
        description: z
          .string()
          .max(1000, t("validation.description_max"))
          .nullable()
          .optional(),
      })
      .refine(
        (data) => {
          // If expiry_date is provided, it must be after issue_date
          if (data.expiry_date && data.issue_date) {
            const issueDate = new Date(data.issue_date);
            const expiryDate = new Date(data.expiry_date);
            return expiryDate > issueDate;
          }
          return true;
        },
        {
          message: t("validation.expiry_after_issue"),
          path: ["expiry_date"],
        }
      ),

    certificationUpdate: z
      .object({
        certificate_name: z
          .string()
          .min(1, t("validation.certificate_name_required"))
          .max(200, t("validation.certificate_name_max"))
          .optional(),
        issued_by: z
          .string()
          .min(1, t("validation.issued_by_required"))
          .max(200, t("validation.issued_by_max"))
          .optional(),
        issue_date: z.string().optional(),
        expiry_date: z.string().nullable().optional(),
        certificate_number: z
          .string()
          .max(100, t("validation.certificate_number_max"))
          .nullable()
          .optional(),
        certificate_file: z.string().nullable().optional(),
        description: z
          .string()
          .max(1000, t("validation.description_max"))
          .nullable()
          .optional(),
      })
      .refine(
        (data) => {
          // If both dates are provided in update, expiry must be after issue
          if (data.expiry_date && data.issue_date) {
            const issueDate = new Date(data.issue_date);
            const expiryDate = new Date(data.expiry_date);
            return expiryDate > issueDate;
          }
          return true;
        },
        {
          message: t("validation.expiry_after_issue"),
          path: ["expiry_date"],
        }
      ),
  };
};

// Export alias for convenience
export const getCertificationSchema = getSchema;

// Export types inferred from schemas
export type CertificationFormValues = z.infer<
  ReturnType<typeof getSchema>["certification"]
>;
export type CertificationUpdateFormValues = z.infer<
  ReturnType<typeof getSchema>["certificationUpdate"]
>;

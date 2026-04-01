import { z } from "zod";
import type { TranslationValues } from "next-intl";

type TFunction = (
  key: string,
  values?: TranslationValues
) => string;

export function getCreateLeaveRequestSchema(t: TFunction) {
  return z
    .object({
      employee_id: z.string().min(1, t("form.employee.required")),
      leave_type_id: z.string().min(1, t("form.leaveType.required")),
      start_date: z.date(),
      end_date: z.date(),
      duration: z.enum(["FULL_DAY", "HALF_DAY", "MULTI_DAY"], {
        message: t("form.duration.required"),
      }),
      reason: z
        .string()
        .min(1, t("form.reason.required"))
        .min(10, t("form.reason.min", { count: 10 }))
        .max(500, t("form.reason.max", { count: 500 })),
    })
    .refine((data) => data.end_date >= data.start_date, {
      message: t("form.endDate.beforeStart"),
      path: ["end_date"],
    })
    .refine(
      (data) => {
        // FULL_DAY and HALF_DAY: start_date must equal end_date
        if (data.duration === "FULL_DAY" || data.duration === "HALF_DAY") {
          return data.start_date.toDateString() === data.end_date.toDateString();
        }
        // MULTI_DAY: start_date must be before end_date
        if (data.duration === "MULTI_DAY") {
          return data.start_date < data.end_date;
        }
        return true;
      },
      {
        message: t("form.duration.invalidDateRange"),
        path: ["duration"],
      }
    );
}

export function getUpdateLeaveRequestSchema(t: TFunction) {
  return z
    .object({
      employee_id: z.string().min(1, t("form.employee.required")),
      leave_type_id: z.string().min(1, t("form.leaveType.required")),
      start_date: z.date(),
      end_date: z.date(),
      duration: z.enum(["FULL_DAY", "HALF_DAY", "MULTI_DAY"], {
        message: t("form.duration.required"),
      }),
      reason: z
        .string()
        .min(1, t("form.reason.required"))
        .min(10, t("form.reason.min", { count: 10 }))
        .max(500, t("form.reason.max", { count: 500 })),
    })
    .refine((data) => data.end_date >= data.start_date, {
      message: t("form.endDate.beforeStart"),
      path: ["end_date"],
    })
    .refine(
      (data) => {
        // FULL_DAY and HALF_DAY: start_date must equal end_date
        if (data.duration === "FULL_DAY" || data.duration === "HALF_DAY") {
          return data.start_date.toDateString() === data.end_date.toDateString();
        }
        // MULTI_DAY: start_date must be before end_date
        if (data.duration === "MULTI_DAY") {
          return data.start_date < data.end_date;
        }
        return true;
      },
      {
        message: t("form.duration.invalidDateRange"),
        path: ["duration"],
      }
    );
}

export function getSelfLeaveRequestSchema(t: TFunction) {
  return z
    .object({
      leave_type_id: z.string().min(1, t("form.leaveType.required")),
      start_date: z.date(),
      end_date: z.date(),
      duration: z.enum(["FULL_DAY", "HALF_DAY", "MULTI_DAY"], {
        message: t("form.duration.required"),
      }),
      reason: z
        .string()
        .min(1, t("form.reason.required"))
        .min(10, t("form.reason.min", { count: 10 }))
        .max(500, t("form.reason.max", { count: 500 })),
    })
    .refine((data) => data.end_date >= data.start_date, {
      message: t("form.endDate.beforeStart"),
      path: ["end_date"],
    })
    .refine(
      (data) => {
        if (data.duration === "FULL_DAY" || data.duration === "HALF_DAY") {
          return data.start_date.toDateString() === data.end_date.toDateString();
        }
        if (data.duration === "MULTI_DAY") {
          return data.start_date < data.end_date;
        }
        return true;
      },
      {
        message: t("form.duration.invalidDateRange"),
        path: ["duration"],
      }
    );
}

export function getApproveLeaveRequestSchema() {
  return z.object({
    notes: z.string().optional(),
  });
}

export function getRejectLeaveRequestSchema(t: TFunction) {
  return z.object({
    rejection_note: z
      .string()
      .min(1, t("form.rejectionNote.required"))
      .min(10, t("form.rejectionNote.min", { count: 10 }))
      .max(500, t("form.rejectionNote.max", { count: 500 })),
  });
}

export type CreateLeaveRequestFormData = z.infer<
  ReturnType<typeof getCreateLeaveRequestSchema>
>;
export type UpdateLeaveRequestFormData = z.infer<
  ReturnType<typeof getUpdateLeaveRequestSchema>
>;
export type ApproveLeaveRequestFormData = z.infer<
  ReturnType<typeof getApproveLeaveRequestSchema>
>;
export type RejectLeaveRequestFormData = z.infer<
  ReturnType<typeof getRejectLeaveRequestSchema>
>;
export type SelfLeaveRequestFormData = z.infer<
  ReturnType<typeof getSelfLeaveRequestSchema>
>;

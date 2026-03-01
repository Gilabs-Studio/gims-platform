"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ButtonLoading } from "@/components/loading";
import { getRejectSchema, type RejectFormData } from "../schemas/visit-report.schema";
import { useRejectVisitReport } from "../hooks/use-visit-reports";

interface VisitReportRejectDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly visitId: string;
}

export function VisitReportRejectDialog({ open, onClose, visitId }: VisitReportRejectDialogProps) {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const rejectMutation = useRejectVisitReport();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectFormData>({
    resolver: zodResolver(getRejectSchema(t)),
    defaultValues: { reason: "", notes: "" },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: RejectFormData) => {
    try {
      await rejectMutation.mutateAsync({ id: visitId, data });
      toast.success(t("rejected"));
      handleClose();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("actions.reject")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("form.rejectionReason")} *</FieldLabel>
            <Textarea
              {...register("reason")}
              placeholder={t("form.rejectionReasonPlaceholder")}
              rows={4}
            />
            {errors.reason && <FieldError>{errors.reason.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.approvalNotes")}</FieldLabel>
            <Textarea
              {...register("notes")}
              placeholder={t("form.approvalNotesPlaceholder")}
              rows={2}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="cursor-pointer">
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={rejectMutation.isPending}
              className="cursor-pointer"
            >
              <ButtonLoading loading={rejectMutation.isPending}>
                {t("actions.reject")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

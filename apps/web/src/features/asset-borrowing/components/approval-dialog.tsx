"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  approvalSchema,
  type ApprovalFormValues,
} from "../schemas/asset-borrowing.schema";
import type { BorrowingRequest } from "../types";
import { toast } from "sonner";

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  request: BorrowingRequest | null;
  onSubmit: (id: string, data: ApprovalFormValues) => void;
}

export function ApprovalDialog({
  open,
  onClose,
  request,
  onSubmit,
}: ApprovalDialogProps) {
  const t = useTranslations("assetBorrowing");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      status: "approved",
      notes: "",
    },
  });

  const selectedStatus = watch("status");

  if (!request) return null;

  const handleFormSubmit = (data: ApprovalFormValues) => {
    onSubmit(request.id, data);
    toast.success(t("messages.approvalSuccess"));
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.approvalTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.approvalDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-xs space-y-1.5 bg-muted/30 my-1">
          <p className="font-semibold text-sm">{request.asset_name}</p>
          <p className="text-muted-foreground">
            {t("table.requestCode")}: <span className="font-medium text-foreground">{request.request_number}</span>
          </p>
          <p className="text-muted-foreground">
            {t("table.borrower")}: <span className="font-medium text-foreground">{request.borrower_name} ({request.borrower_department})</span>
          </p>
          <p className="text-muted-foreground">
            {t("table.borrowDate")} - {t("table.expectedReturn")}:{" "}
            <span className="font-medium text-foreground">
              {request.borrow_date} s/d {request.expected_return_date}
            </span>
          </p>
          <p className="text-muted-foreground">
            {t("table.purpose")}: <span className="font-medium text-foreground">{request.purpose}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="status">{t("dialogs.decisionLabel")}</FieldLabel>
              <Select
                value={selectedStatus}
                onValueChange={(val) =>
                  setValue("status", val as "approved" | "rejected", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="status" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved" className="cursor-pointer text-success">
                    {t("actions.approve")}
                  </SelectItem>
                  <SelectItem value="rejected" className="cursor-pointer text-destructive">
                    {t("actions.reject")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <FieldError>{errors.status.message}</FieldError>}
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("dialogs.notesLabel")}</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder={t("dialogs.notesPlaceholder")}
                {...register("notes")}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={selectedStatus === "approved" ? "default" : "destructive"}
              className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              {selectedStatus === "approved"
                ? t("actions.approve")
                : t("actions.reject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

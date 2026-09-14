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
import { CheckCircle2 } from "lucide-react";
import {
  updateITTicketStatusSchema,
  type UpdateITTicketStatusFormValues,
} from "../schemas/it-ticket.schema";
import type { ITTicket, ITTicketStatus } from "../types/it-ticket.types";

interface ITTicketStatusDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: ITTicket | null;
  onSubmit: (ticketId: string, data: UpdateITTicketStatusFormValues) => void;
}

export function ITTicketStatusDialog({
  open,
  onClose,
  ticket,
  onSubmit,
}: ITTicketStatusDialogProps) {
  const t = useTranslations("itSupport");

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateITTicketStatusFormValues>({
    resolver: zodResolver(updateITTicketStatusSchema),
    defaultValues: {
      status: ticket?.status || "in_progress",
      notes: "",
      resolution_photos: [],
    },
  });

  const statusVal = watch("status");

  const handleFormSubmit = (data: UpdateITTicketStatusFormValues) => {
    if (ticket) {
      onSubmit(ticket.id, data);
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {t("dialogs.statusTitle")}
          </DialogTitle>
          <DialogDescription>
            {ticket?.ticket_number} - {ticket?.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="status">{t("dialogs.fields.status") || "Status Perbaikan"}</FieldLabel>
              <Select
                value={statusVal}
                onValueChange={(val) =>
                  setValue("status", val as ITTicketStatus, { shouldValidate: true })
                }
              >
                <SelectTrigger id="status" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" className="cursor-pointer">{t("status.open")}</SelectItem>
                  <SelectItem value="assigned" className="cursor-pointer">{t("status.assigned")}</SelectItem>
                  <SelectItem value="in_progress" className="cursor-pointer">{t("status.in_progress")}</SelectItem>
                  <SelectItem value="pending_parts" className="cursor-pointer">{t("status.pending_parts")}</SelectItem>
                  <SelectItem value="resolved" className="cursor-pointer font-bold text-emerald-600">{t("status.resolved")}</SelectItem>
                  <SelectItem value="closed" className="cursor-pointer">{t("status.closed")}</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <FieldError>{errors.status.message}</FieldError>}
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("dialogs.fields.notes")}</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Tuliskan catatan detail perbaikan atau tindakan IT yang telah dilakukan..."
                {...register("notes")}
              />
              {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("dialogs.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {t("dialogs.actions.submitStatus")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

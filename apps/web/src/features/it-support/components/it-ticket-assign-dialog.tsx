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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { UserCheck } from "lucide-react";
import {
  assignITTechnicianSchema,
  type AssignITTechnicianFormValues,
} from "../schemas/it-ticket.schema";
import type { ITTicket, ITTechnician } from "../types/it-ticket.types";

interface ITTicketAssignDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: ITTicket | null;
  technicians: ITTechnician[];
  onSubmit: (ticketId: string, data: AssignITTechnicianFormValues) => void;
}

export function ITTicketAssignDialog({
  open,
  onClose,
  ticket,
  technicians,
  onSubmit,
}: ITTicketAssignDialogProps) {
  const t = useTranslations("itSupport");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignITTechnicianFormValues>({
    resolver: zodResolver(assignITTechnicianSchema),
    defaultValues: {
      technician_id: ticket?.assigned_technician?.id || "",
      target_completion_date:
        ticket?.target_completion_date ||
        new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      notes: "",
    },
  });

  const techIdVal = watch("technician_id");

  const handleFormSubmit = (data: AssignITTechnicianFormValues) => {
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
            <UserCheck className="h-5 w-5 text-primary" />
            {t("dialogs.assignTitle")}
          </DialogTitle>
          <DialogDescription>
            {ticket?.ticket_number} - {ticket?.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="technician_id">{t("dialogs.fields.technician")}</FieldLabel>
              <Select
                value={techIdVal}
                onValueChange={(val) =>
                  setValue("technician_id", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="technician_id" className="w-full cursor-pointer">
                  <SelectValue placeholder={t("dialogs.fields.technician")} />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{tech.name} ({tech.role})</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {tech.active_tickets_count} tiket aktif
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.technician_id && (
                <FieldError>{errors.technician_id.message}</FieldError>
              )}
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="target_completion_date">
                {t("dialogs.fields.targetDate")}
              </FieldLabel>
              <Input
                id="target_completion_date"
                type="date"
                {...register("target_completion_date")}
              />
              {errors.target_completion_date && (
                <FieldError>{errors.target_completion_date.message}</FieldError>
              )}
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("dialogs.fields.notes")}</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Berikan arahan penanganan awal teknisi IT..."
                {...register("notes")}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("dialogs.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {t("dialogs.actions.submitAssign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

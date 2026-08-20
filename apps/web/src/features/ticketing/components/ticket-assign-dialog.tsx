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
  assignTechnicianSchema,
  type AssignTechnicianFormValues,
} from "../schemas/ticketing.schema";
import type { Ticket, Technician } from "../types/ticketing.types";

interface TicketAssignDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  technicians: Technician[];
  onSubmit: (ticketId: string, data: AssignTechnicianFormValues) => void;
}

export function TicketAssignDialog({
  open,
  onClose,
  ticket,
  technicians,
  onSubmit,
}: TicketAssignDialogProps) {
  const t = useTranslations("ticketing");

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignTechnicianFormValues>({
    resolver: zodResolver(assignTechnicianSchema),
    defaultValues: {
      technician_id: ticket?.assigned_technician?.id || "",
      target_completion_date: ticket?.target_completion_date || todayStr,
      notes: "",
    },
  });

  const selectedTechId = watch("technician_id");

  if (!ticket) return null;

  const handleFormSubmit = (data: AssignTechnicianFormValues) => {
    onSubmit(ticket.id, data);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.assignTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.assignDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-1 my-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary">{ticket.ticket_number}</span>
            <span className="text-muted-foreground">{ticket.location}</span>
          </div>
          <p className="font-medium text-sm text-foreground">{ticket.title}</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* Technician Select */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="technician_id">{t("dialogs.fields.technician")}</FieldLabel>
              <Select
                value={selectedTechId}
                onValueChange={(val) =>
                  setValue("technician_id", val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="technician_id" className="w-full cursor-pointer">
                  <SelectValue placeholder={t("dialogs.fields.technicianPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{tech.name} ({tech.role})</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({tech.active_tickets_count} {t("dialogs.fields.activeCount")})
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

            {/* Target Completion Date */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="target_completion_date">
                {t("dialogs.fields.targetDate")}
              </FieldLabel>
              <Input
                id="target_completion_date"
                type="date"
                min={todayStr}
                {...register("target_completion_date")}
              />
              {errors.target_completion_date && (
                <FieldError>{errors.target_completion_date.message}</FieldError>
              )}
            </Field>

            {/* Notes */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("dialogs.fields.notes")}</FieldLabel>
              <Textarea
                id="notes"
                rows={2}
                placeholder={t("dialogs.fields.notesPlaceholder")}
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
              {t("dialogs.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {t("dialogs.actions.submitAssign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

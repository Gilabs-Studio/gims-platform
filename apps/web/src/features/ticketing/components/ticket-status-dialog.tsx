"use client";

import { useState } from "react";
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
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { CheckCircle2, Camera, X } from "lucide-react";
import {
  updateTicketStatusSchema,
  type UpdateTicketStatusFormValues,
} from "../schemas/ticketing.schema";
import type { Ticket, TicketStatus } from "../types/ticketing.types";

interface TicketStatusDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onSubmit: (ticketId: string, data: UpdateTicketStatusFormValues) => void;
}

export function TicketStatusDialog({
  open,
  onClose,
  ticket,
  onSubmit,
}: TicketStatusDialogProps) {
  const t = useTranslations("ticketing");
  const [resolutionPhotos, setResolutionPhotos] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTicketStatusFormValues>({
    resolver: zodResolver(updateTicketStatusSchema),
    defaultValues: {
      status: ticket?.status || "in_progress",
      notes: "",
      resolution_photos: [],
    },
  });

  const selectedStatus = watch("status");

  if (!ticket) return null;

  const handleFormSubmit = (data: UpdateTicketStatusFormValues) => {
    onSubmit(ticket.id, {
      ...data,
      resolution_photos: resolutionPhotos,
    });
    setResolutionPhotos([]);
    reset();
    onClose();
  };

  const handleAddSampleResolutionPhoto = () => {
    const samples = [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
    ];
    const item = samples[Math.floor(Math.random() * samples.length)];
    if (resolutionPhotos.length < 2) {
      setResolutionPhotos((prev) => [...prev, item]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.statusTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.statusDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-1 my-1">
          <span className="font-semibold text-primary">{ticket.ticket_number}</span>
          <p className="font-medium text-foreground">{ticket.title}</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* Status Select */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="status">{t("table.status")}</FieldLabel>
              <Select
                value={selectedStatus}
                onValueChange={(val) =>
                  setValue("status", val as TicketStatus, { shouldValidate: true })
                }
              >
                <SelectTrigger id="status" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress" className="cursor-pointer">{t("status.in_progress")}</SelectItem>
                  <SelectItem value="pending_parts" className="cursor-pointer text-warning">{t("status.pending_parts")}</SelectItem>
                  <SelectItem value="resolved" className="cursor-pointer text-success font-medium">{t("status.resolved")}</SelectItem>
                  <SelectItem value="closed" className="cursor-pointer">{t("status.closed")}</SelectItem>
                  <SelectItem value="rejected" className="cursor-pointer text-destructive">{t("status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <FieldError>{errors.status.message}</FieldError>}
            </Field>

            {/* Notes */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("dialogs.fields.notes")}</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder={t("dialogs.fields.notesPlaceholder")}
                {...register("notes")}
              />
              {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
            </Field>

            {/* Photos evidence when resolving */}
            {selectedStatus === "resolved" && (
              <Field className="space-y-2">
                <FieldLabel>{t("dialogs.fields.resolutionPhotos")}</FieldLabel>
                <FieldDescription className="text-xs">
                  {t("dialogs.fields.resolutionPhotosDesc")}
                </FieldDescription>

                <div className="flex items-center gap-3 pt-1">
                  {resolutionPhotos.map((url, idx) => (
                    <div key={idx} className="relative h-16 w-20 rounded border overflow-hidden">
                      <img src={url} alt={`Bukti ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setResolutionPhotos((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-foreground hover:bg-destructive hover:text-white cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {resolutionPhotos.length < 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddSampleResolutionPhoto}
                      className="h-16 w-20 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-xs text-muted-foreground"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="text-[10px]">{t("dialogs.fields.addProof")}</span>
                    </Button>
                  )}
                </div>
              </Field>
            )}
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
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("dialogs.actions.submitStatus")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

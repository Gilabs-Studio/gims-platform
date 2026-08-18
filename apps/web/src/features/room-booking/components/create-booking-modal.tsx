"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBookingSchema, type CreateBookingInput } from "../schemas/room-booking.schema";
import type { Room } from "../types/room-booking.types";

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  selectedRoom: Room | null;
  onSubmit: (data: CreateBookingInput) => void;
  isPending?: boolean;
}

export function CreateBookingModal({
  isOpen,
  onClose,
  rooms,
  selectedRoom,
  onSubmit,
  isPending = false,
}: CreateBookingModalProps) {
  const t = useTranslations("roomBooking");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      roomId: selectedRoom?.id || rooms[0]?.id || "",
      title: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "10:30",
      organizerName: "Budi Santoso",
      department: "Product Engineering",
      notes: "",
    },
  });

  const handleFormSubmit = (data: CreateBookingInput) => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{t("modal.createTitle")}</DialogTitle>
          <DialogDescription>{t("modal.createDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* Room Select */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="roomId">{t("modal.fields.room")}</FieldLabel>
              <Select
                value={watch("roomId") || selectedRoom?.id || ""}
                onValueChange={(val) => setValue("roomId", val, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Pilih ruangan" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="cursor-pointer text-xs">
                      {r.code} - {r.name} ({r.floor}, Kapasitas {r.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomId && <FieldError>{errors.roomId.message}</FieldError>}
            </Field>

            {/* Event Title */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="title">{t("modal.fields.title")}</FieldLabel>
              <Input
                id="title"
                placeholder="Contoh: Meeting Sync Project Alpha"
                {...register("title")}
              />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="date">{t("modal.fields.date")}</FieldLabel>
                <Input id="date" type="date" {...register("date")} />
                {errors.date && <FieldError>{errors.date.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="startTime">{t("modal.fields.startTime")}</FieldLabel>
                <Input id="startTime" type="time" {...register("startTime")} />
                {errors.startTime && <FieldError>{errors.startTime.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="endTime">{t("modal.fields.endTime")}</FieldLabel>
                <Input id="endTime" type="time" {...register("endTime")} />
                {errors.endTime && <FieldError>{errors.endTime.message}</FieldError>}
              </Field>
            </div>

            {/* Organizer & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="organizerName">{t("modal.fields.organizer")}</FieldLabel>
                <Input id="organizerName" {...register("organizerName")} />
                {errors.organizerName && <FieldError>{errors.organizerName.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="department">{t("modal.fields.department")}</FieldLabel>
                <Input id="department" {...register("department")} />
                {errors.department && <FieldError>{errors.department.message}</FieldError>}
              </Field>
            </div>

            {/* Notes */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes">{t("modal.fields.notes")}</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Kebutuhan tambahan seperti proyektor tambahan, snack, dll."
                rows={2}
                {...register("notes")}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer text-xs transition-all duration-300 hover:-translate-y-0.5"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="cursor-pointer text-xs bg-primary text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
            >
              {t("actions.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

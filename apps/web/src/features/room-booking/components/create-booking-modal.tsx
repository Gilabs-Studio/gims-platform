"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Sparkles, CheckCircle2, Building, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/features/finance/assets/components/date-picker";
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

  const selectedRoomId = watch("roomId");

  // AI / Smart Assist Recommendations for Vacant Rooms
  const recommendedRooms = useMemo(() => {
    return rooms.filter((r) => r.status === "available").slice(0, 2);
  }, [rooms]);

  const handleFormSubmit = (data: CreateBookingInput) => {
    onSubmit(data);
    reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("modal.createTitle")}</DialogTitle>
          <DialogDescription>{t("modal.createDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* AI Smart Room Assist Recommendation Banner */}
            {recommendedRooms.length > 0 && (
              <div className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span>{t("assist.title")}</span>
                  </div>
                  <Badge variant="success" className="text-[10px] font-semibold">
                    {t("assist.vacantTag")}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendedRooms.map((rec) => {
                    const isSelected = selectedRoomId === rec.id;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => setValue("roomId", rec.id, { shouldValidate: true })}
                        className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-card ring-1 ring-primary/30 shadow-2xs"
                            : "border-border/60 bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span>{rec.name}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 font-medium">
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {rec.floor}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {rec.capacity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Room Select */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="roomId">{t("modal.fields.room")}</FieldLabel>
              <Select
                value={watch("roomId") || selectedRoom?.id || ""}
                onValueChange={(val) => setValue("roomId", val, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder={t("actions.searchRoom")} />
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
              {/* Modular DatePicker */}
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="date">{t("modal.fields.date")}</FieldLabel>
                <DatePicker
                  value={watch("date")}
                  onChange={(val) => setValue("date", val, { shouldValidate: true })}
                  placeholder={t("actions.selectDate")}
                />
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
              className="cursor-pointer text-xs bg-primary text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 font-bold"
            >
              {t("actions.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

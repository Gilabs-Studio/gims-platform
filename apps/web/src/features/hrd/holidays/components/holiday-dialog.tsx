"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCreateHoliday, useUpdateHoliday } from "../hooks/use-holidays";
import type { Holiday, HolidayType } from "../types";

const holidayFormSchema = z.object({
  date: z.date(),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  type: z.enum(["NATIONAL", "COLLECTIVE", "COMPANY"]),
  is_collective_leave: z.boolean(),
  cuts_annual_leave: z.boolean(),
  is_active: z.boolean(),
});

type HolidayFormData = z.infer<typeof holidayFormSchema>;

interface HolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Holiday | null;
}

export function HolidayDialog({
  open,
  onOpenChange,
  editingItem,
}: HolidayDialogProps) {
  const t = useTranslations("hrd.holiday");
  const tCommon = useTranslations("common");
  const isEditing = !!editingItem;

  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HolidayFormData>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      date: new Date(),
      name: "",
      description: "",
      type: "NATIONAL",
      is_collective_leave: false,
      cuts_annual_leave: false,
      is_active: true,
    },
  });

  const isCollectiveLeave = watch("is_collective_leave");
  const holidayType = watch("type");

  useEffect(() => {
    if (editingItem) {
      reset({
        date: new Date(editingItem.date),
        name: editingItem.name,
        description: editingItem.description || "",
        type: editingItem.type,
        is_collective_leave: editingItem.is_collective_leave,
        cuts_annual_leave: editingItem.cuts_annual_leave,
        is_active: editingItem.is_active,
      });
    } else {
      reset({
        date: new Date(),
        name: "",
        description: "",
        type: "NATIONAL",
        is_collective_leave: false,
        cuts_annual_leave: false,
        is_active: true,
      });
    }
  }, [editingItem, reset]);

  // Auto-set collective leave when type is COLLECTIVE
  useEffect(() => {
    if (holidayType === "COLLECTIVE") {
      setValue("is_collective_leave", true);
    }
  }, [holidayType, setValue]);

  const onSubmit = async (data: HolidayFormData) => {
    try {
      const payload = {
        date: format(data.date, "yyyy-MM-dd"),
        name: data.name,
        description: data.description,
        type: data.type as HolidayType,
        is_collective_leave: data.is_collective_leave,
        cuts_annual_leave: data.cuts_annual_leave,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("messages.createSuccess"));
      }
      onOpenChange(false);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("actions.edit") : t("actions.create")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Date */}
          <Field>
            <FieldLabel>{t("fields.date")} *</FieldLabel>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal cursor-pointer",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && <FieldError>{errors.date.message}</FieldError>}
          </Field>

          {/* Name */}
          <Field>
            <FieldLabel>{t("fields.name")} *</FieldLabel>
            <Input
              placeholder="e.g., Independence Day"
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel>{t("fields.description")}</FieldLabel>
            <Textarea
              placeholder="Optional description"
              className="resize-none"
              {...register("description")}
            />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          {/* Type */}
          <Field>
            <FieldLabel>{t("fields.type")} *</FieldLabel>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL" className="cursor-pointer">
                      {t("types.NATIONAL")}
                    </SelectItem>
                    <SelectItem value="COLLECTIVE" className="cursor-pointer">
                      {t("types.COLLECTIVE")}
                    </SelectItem>
                    <SelectItem value="COMPANY" className="cursor-pointer">
                      {t("types.COMPANY")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <FieldError>{errors.type.message}</FieldError>}
          </Field>

          {/* Collective Leave Toggle */}
          <Field orientation="horizontal">
            <div className="space-y-0.5">
              <FieldLabel>{t("fields.isCollectiveLeave")}</FieldLabel>
              <FieldDescription>
                Mark as collective leave (cuti bersama)
              </FieldDescription>
            </div>
            <Controller
              control={control}
              name="is_collective_leave"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="cursor-pointer"
                />
              )}
            />
          </Field>

          {/* Cuts Annual Leave Toggle */}
          {isCollectiveLeave && (
            <Field orientation="horizontal">
              <div className="space-y-0.5">
                <FieldLabel>{t("fields.cutsAnnualLeave")}</FieldLabel>
                <FieldDescription>
                  This collective leave will reduce employee annual leave quota
                </FieldDescription>
              </div>
              <Controller
                control={control}
                name="cuts_annual_leave"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="cursor-pointer"
                  />
                )}
              />
            </Field>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

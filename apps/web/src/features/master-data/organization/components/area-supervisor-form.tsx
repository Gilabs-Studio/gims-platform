"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { useCreateAreaSupervisor, useUpdateAreaSupervisor } from "../hooks/use-area-supervisors";
import { useAreas } from "../hooks/use-areas";
import { getAreaSupervisorSchema, type AreaSupervisorFormData } from "../schemas/organization.schema";
import type { AreaSupervisor, Area } from "../types";

interface AreaSupervisorFormProps {
  open: boolean;
  onClose: () => void;
  supervisor?: AreaSupervisor | null;
}

export function AreaSupervisorForm({ open, onClose, supervisor }: AreaSupervisorFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!supervisor;
  const createSupervisor = useCreateAreaSupervisor();
  const updateSupervisor = useUpdateAreaSupervisor();
  
  // Load all areas for selection
  const { data: areasData, isLoading: areasLoading } = useAreas({ per_page: 100 });
  const availableAreas = areasData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<AreaSupervisorFormData>({
    resolver: zodResolver(getAreaSupervisorSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      area_ids: [],
      is_active: true,
    },
  });

  useEffect(() => {
    if (supervisor) {
      const areaIds = supervisor.areas?.map((a) => a.id) ?? [];
      reset({
        name: supervisor.name,
        email: supervisor.email ?? "",
        phone: supervisor.phone ?? "",
        area_ids: areaIds,
        is_active: supervisor.is_active,
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        area_ids: [],
        is_active: true,
      });
    }
  }, [supervisor, reset]);

  const onSubmit = async (data: AreaSupervisorFormData) => {
    try {
      if (isEditing && supervisor) {
        await updateSupervisor.mutateAsync({ id: supervisor.id, data });
      } else {
        await createSupervisor.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save area supervisor:", error);
    }
  };

  const isLoading = createSupervisor.isPending || updateSupervisor.isPending;
  const isActive = watch("is_active");
  const selectedAreaIds = watch("area_ids") ?? [];

  const toggleArea = (areaId: string) => {
    const current = selectedAreaIds;
    const updated = current.includes(areaId)
      ? current.filter((id) => id !== areaId)
      : [...current, areaId];
    setValue("area_ids", updated);
  };

  const removeArea = (areaId: string) => {
    setValue("area_ids", selectedAreaIds.filter((id) => id !== areaId));
  };

  const getAreaName = (areaId: string) => {
    return availableAreas.find((a) => a.id === areaId)?.name ?? areaId;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("areaSupervisor.editTitle") : t("areaSupervisor.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("areaSupervisor.form.name")}</FieldLabel>
            <Input
              placeholder={t("areaSupervisor.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("areaSupervisor.form.email")}</FieldLabel>
            <Input
              type="email"
              placeholder={t("areaSupervisor.form.emailPlaceholder")}
              {...register("email")}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("areaSupervisor.form.phone")}</FieldLabel>
            <Input
              placeholder={t("areaSupervisor.form.phonePlaceholder")}
              {...register("phone")}
            />
            {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
          </Field>

          {/* Areas Multi-Select */}
          <Field orientation="vertical">
            <FieldLabel>{t("areaSupervisor.form.areas")}</FieldLabel>
            
            {/* Selected Areas */}
            {selectedAreaIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedAreaIds.map((areaId) => (
                  <Badge key={areaId} variant="secondary" className="gap-1">
                    {getAreaName(areaId)}
                    <button
                      type="button"
                      onClick={() => removeArea(areaId)}
                      className="ml-1 hover:bg-muted rounded-full cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Areas Checkbox List */}
            <div className="border rounded-md">
              {areasLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : availableAreas.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {t("area.empty")}
                </div>
              ) : (
                <ScrollArea className="h-[150px]">
                  <div className="p-2 space-y-1">
                    {availableAreas.filter(a => a.is_active).map((area) => (
                      <label
                        key={area.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedAreaIds.includes(area.id)}
                          onCheckedChange={() => toggleArea(area.id)}
                        />
                        <span className="text-sm">{area.name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </Field>

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("areaSupervisor.form.isActive")}</FieldLabel>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading
                ? "Saving..."
                : isEditing
                  ? t("common.save")
                  : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

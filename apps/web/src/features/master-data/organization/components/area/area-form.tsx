"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateArea, useUpdateArea } from "../../hooks/use-areas";
import { AreaFormData, getAreaSchema } from "../../schemas/organization.schema";
import { Area } from "../../types";

interface AreaFormProps {
  open: boolean;
  onClose: () => void;
  area?: Area | null;
}

export function AreaForm({ open, onClose, area }: AreaFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!area;
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AreaFormData>({
    resolver: zodResolver(getAreaSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (area) {
      reset({
        name: area.name,
        description: area.description ?? "",
        is_active: area.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [area, reset]);

  const onSubmit = async (data: AreaFormData) => {
    try {
      if (isEditing && area) {
        await updateArea.mutateAsync({ id: area.id, data });
      } else {
        await createArea.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save area:", error);
    }
  };

  const isLoading = createArea.isPending || updateArea.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("area.editTitle") : t("area.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("area.form.name")}</FieldLabel>
            <Input
              placeholder={t("area.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("area.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("area.form.descriptionPlaceholder")}
              {...register("description")}
              rows={3}
            />
            {errors.description && (
              <FieldError>{errors.description.message}</FieldError>
            )}
          </Field>

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("area.form.isActive")}</FieldLabel>
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

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
import { useCreateBusinessType, useUpdateBusinessType } from "../hooks/use-business-types";
import { getBusinessTypeSchema, type BusinessTypeFormData } from "../schemas/organization.schema";
import type { BusinessType } from "../types";

interface BusinessTypeFormProps {
  open: boolean;
  onClose: () => void;
  businessType?: BusinessType | null;
}

export function BusinessTypeForm({ open, onClose, businessType }: BusinessTypeFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!businessType;
  const createBusinessType = useCreateBusinessType();
  const updateBusinessType = useUpdateBusinessType();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessTypeFormData>({
    resolver: zodResolver(getBusinessTypeSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (businessType) {
      reset({
        name: businessType.name,
        description: businessType.description ?? "",
        is_active: businessType.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [businessType, reset]);

  const onSubmit = async (data: BusinessTypeFormData) => {
    try {
      if (isEditing && businessType) {
        await updateBusinessType.mutateAsync({ id: businessType.id, data });
      } else {
        await createBusinessType.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save business type:", error);
    }
  };

  const isLoading = createBusinessType.isPending || updateBusinessType.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("businessType.editTitle") : t("businessType.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("businessType.form.name")}</FieldLabel>
            <Input
              placeholder={t("businessType.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("businessType.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("businessType.form.descriptionPlaceholder")}
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
            <FieldLabel>{t("businessType.form.isActive")}</FieldLabel>
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

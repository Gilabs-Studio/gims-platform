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
import { useCreateBusinessUnit, useUpdateBusinessUnit } from "../../hooks/use-business-units";
import { BusinessUnitFormData, getBusinessUnitSchema } from "../../schemas/organization.schema";
import { BusinessUnit } from "../../types";

interface BusinessUnitFormProps {
  open: boolean;
  onClose: () => void;
  businessUnit?: BusinessUnit | null;
}

export function BusinessUnitForm({ open, onClose, businessUnit }: BusinessUnitFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!businessUnit;
  const createBusinessUnit = useCreateBusinessUnit();
  const updateBusinessUnit = useUpdateBusinessUnit();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessUnitFormData>({
    resolver: zodResolver(getBusinessUnitSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (businessUnit) {
      reset({
        name: businessUnit.name,
        description: businessUnit.description ?? "",
        is_active: businessUnit.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [businessUnit, reset]);

  const onSubmit = async (data: BusinessUnitFormData) => {
    try {
      if (isEditing && businessUnit) {
        await updateBusinessUnit.mutateAsync({ id: businessUnit.id, data });
      } else {
        await createBusinessUnit.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save business unit:", error);
    }
  };

  const isLoading = createBusinessUnit.isPending || updateBusinessUnit.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("businessUnit.editTitle") : t("businessUnit.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("businessUnit.form.name")}</FieldLabel>
            <Input
              placeholder={t("businessUnit.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("businessUnit.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("businessUnit.form.descriptionPlaceholder")}
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
            <FieldLabel>{t("businessUnit.form.isActive")}</FieldLabel>
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

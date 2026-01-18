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
import { Division } from "../../types";
import { useCreateDivision, useUpdateDivision } from "../../hooks/use-divisions";
import { DivisionFormData } from "../../schemas/organization.schema";
import { getDivisionSchema } from "../../schemas/organization.schema";

interface DivisionFormProps {
  open: boolean;
  onClose: () => void;
  division?: Division | null;
}

export function DivisionForm({ open, onClose, division }: DivisionFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!division;
  const createDivision = useCreateDivision();
  const updateDivision = useUpdateDivision();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DivisionFormData>({
    resolver: zodResolver(getDivisionSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (division) {
      reset({
        name: division.name,
        description: division.description ?? "",
        is_active: division.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [division, reset]);

  const onSubmit = async (data: DivisionFormData) => {
    try {
      if (isEditing && division) {
        await updateDivision.mutateAsync({ id: division.id, data });
      } else {
        await createDivision.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save division:", error);
    }
  };

  const isLoading = createDivision.isPending || updateDivision.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("division.editTitle") : t("division.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("division.form.name")}</FieldLabel>
            <Input
              placeholder={t("division.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("division.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("division.form.descriptionPlaceholder")}
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
            <FieldLabel>{t("division.form.isActive")}</FieldLabel>
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

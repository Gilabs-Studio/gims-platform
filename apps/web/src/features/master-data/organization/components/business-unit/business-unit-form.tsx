"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useBusinessUnitForm } from "../../hooks/use-business-unit-form";
import { ButtonLoading } from "@/components/loading";
import { BusinessUnit } from "../../types";

export interface BusinessUnitFormProps {
  open: boolean;
  onClose: () => void;
  businessUnit?: BusinessUnit | null;
}

export function BusinessUnitForm({ open, onClose, businessUnit }: BusinessUnitFormProps) {
  const { form, t, isEditing, isLoading, onSubmit } = useBusinessUnitForm({ open, onClose, businessUnit });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("businessUnit.editTitle") : t("businessUnit.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
              <ButtonLoading loading={isLoading} loadingText="Saving...">
                {isEditing ? t("common.save") : t("common.create")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

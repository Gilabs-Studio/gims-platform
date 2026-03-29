"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBusinessTypeForm } from "../../hooks/use-business-type-form";
import { ButtonLoading } from "@/components/loading";
import { BusinessType } from "../../types";

export interface BusinessTypeFormProps {
  open: boolean;
  onClose: () => void;
  businessType?: BusinessType | null;
  initialData?: { name?: string };
  /** Called after a successful create with id and name of the new item */
  onCreated?: (item: { id: string; name: string }) => void;
}

export function BusinessTypeForm({
  open,
  onClose,
  businessType,
  initialData,
  onCreated,
}: BusinessTypeFormProps) {
  const { form, t, isEditing, isLoading, onSubmit } = useBusinessTypeForm({
    open,
    onClose,
    businessType,
    initialData,
    onCreated,
  });

  const {
    register,
    formState: { errors },
  } = form;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("businessType.editTitle") : t("businessType.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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

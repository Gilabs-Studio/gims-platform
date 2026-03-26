"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useJobPositionForm } from "../../hooks/use-job-position-form";
import { ButtonLoading } from "@/components/loading";
import { JobPosition } from "../../types";

export interface JobPositionFormProps {
  open: boolean;
  onClose: () => void;
  jobPosition?: JobPosition | null;
}

export function JobPositionForm({ open, onClose, jobPosition }: JobPositionFormProps) {
  const { form, t, isEditing, isLoading, onSubmit } = useJobPositionForm({ open, onClose, jobPosition });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("jobPosition.editTitle") : t("jobPosition.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("jobPosition.form.name")}</FieldLabel>
            <Input
              placeholder={t("jobPosition.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("jobPosition.form.description")}</FieldLabel>
            <Textarea
              placeholder={t("jobPosition.form.descriptionPlaceholder")}
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

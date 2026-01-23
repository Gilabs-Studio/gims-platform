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
import { useCreateJobPosition, useUpdateJobPosition } from "../../hooks/use-job-positions";
import { JobPositionFormData, getJobPositionSchema } from "../../schemas/organization.schema";
import { ButtonLoading } from "@/components/loading";
import { JobPosition } from "../../types";

interface JobPositionFormProps {
  open: boolean;
  onClose: () => void;
  jobPosition?: JobPosition | null;
}

export function JobPositionForm({ open, onClose, jobPosition }: JobPositionFormProps) {
  const t = useTranslations("organization");
  const isEditing = !!jobPosition;
  const createJobPosition = useCreateJobPosition();
  const updateJobPosition = useUpdateJobPosition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobPositionFormData>({
    resolver: zodResolver(getJobPositionSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (jobPosition) {
      reset({
        name: jobPosition.name,
        description: jobPosition.description ?? "",
        is_active: jobPosition.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        is_active: true,
      });
    }
  }, [jobPosition, reset]);

  const onSubmit = async (data: JobPositionFormData) => {
    try {
      if (isEditing && jobPosition) {
        await updateJobPosition.mutateAsync({ id: jobPosition.id, data });
      } else {
        await createJobPosition.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save job position:", error);
    }
  };

  const isLoading = createJobPosition.isPending || updateJobPosition.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("jobPosition.editTitle") : t("jobPosition.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <FieldLabel>{t("jobPosition.form.isActive")}</FieldLabel>
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

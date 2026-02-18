"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  getEvaluationGroupSchema,
  getUpdateEvaluationGroupSchema,
  type CreateEvaluationGroupFormData,
} from "../schemas/evaluation.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useCreateEvaluationGroup, useUpdateEvaluationGroup } from "../hooks/use-evaluations";
import type { EvaluationGroup } from "../types";
import { toast } from "sonner";

interface EvaluationGroupFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly group?: EvaluationGroup | null;
}

export function EvaluationGroupForm({ open, onClose, group }: EvaluationGroupFormProps) {
  const isEdit = !!group;
  const t = useTranslations("evaluation");
  const createGroup = useCreateEvaluationGroup();
  const updateGroup = useUpdateEvaluationGroup();

  const schema = isEdit ? getUpdateEvaluationGroupSchema(t) : getEvaluationGroupSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateEvaluationGroupFormData>;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateEvaluationGroupFormData>({
    resolver: formResolver,
    defaultValues: {
      name: group?.name ?? "",
      description: group?.description ?? "",
      is_active: group?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (open) {
      if (group) {
        reset({
          name: group.name,
          description: group.description ?? "",
          is_active: group.is_active,
        });
      } else {
        reset({ name: "", description: "", is_active: true });
      }
    }
  }, [open, group, reset]);

  const onSubmit = async (data: CreateEvaluationGroupFormData) => {
    try {
      if (isEdit && group) {
        await updateGroup.mutateAsync({ id: group.id, data });
        toast.success(t("group.updated"));
      } else {
        await createGroup.mutateAsync(data);
        toast.success(t("group.created"));
      }
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const isPending = createGroup.isPending || updateGroup.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("group.edit") : t("group.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>{t("group.name")}</FieldLabel>
            <Input {...register("name")} placeholder={t("group.namePlaceholder")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("group.description")}</FieldLabel>
            <Textarea
              {...register("description")}
              placeholder={t("group.descriptionPlaceholder")}
              rows={3}
            />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>{t("group.isActive")}</FieldLabel>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/loading";
import { toast } from "sonner";
import {
  useCreateUnitOfMeasure,
  useUpdateUnitOfMeasure,
} from "../../hooks/use-units-of-measure";
import type { UnitOfMeasure } from "../../types";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(20, "Symbol cannot exceed 20 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface UnitOfMeasureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: UnitOfMeasure | null;
}

export function UnitOfMeasureDialog({
  open,
  onOpenChange,
  editingItem,
}: UnitOfMeasureDialogProps) {
  const t = useTranslations("product.unitOfMeasure");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreateUnitOfMeasure();
  const updateMutation = useUpdateUnitOfMeasure();
  
  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        reset({
          name: editingItem.name,
          symbol: editingItem.symbol,
          description: editingItem.description ?? "",
          is_active: editingItem.is_active,
        });
      } else {
        reset({
          name: "",
          symbol: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, editingItem, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: data.name,
            symbol: data.symbol,
            description: data.description || undefined,
            is_active: data.is_active,
          },
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          symbol: data.symbol,
          description: data.description || undefined,
          is_active: data.is_active,
        });
        toast.success(t("created"));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error") : "Failed to create UoM");
    }
  };

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("edit") : t("create")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("form.name")}</FieldLabel>
              <Input placeholder={t("form.name")} {...register("name")} />
              {errors.name && <FieldError>{tValidation("required")}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("form.symbol")}</FieldLabel>
              <Input placeholder={t("form.symbol")} {...register("symbol")} />
              {errors.symbol && <FieldError>{tValidation("required")}</FieldError>}
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea
              placeholder={t("form.description")}
              className="resize-none"
              {...register("description")}
            />
            {errors.description && <FieldError>{tValidation("maxLength")}</FieldError>}
          </Field>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FieldLabel>{t("form.isActive")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {tCommon("active")} / {tCommon("inactive")} status
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
              className="cursor-pointer"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              <ButtonLoading loading={isSubmitting} loadingText="Saving...">
                {isEditing ? "Save" : "Create"}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateBank, useUpdateBank } from "../../hooks/use-banks";
import { ButtonLoading } from "@/components/loading";
import type { Bank } from "../../types";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code cannot exceed 20 characters"),
  swift_code: z.string().max(20, "Swift code cannot exceed 20 characters").optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface BankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Bank | null;
}

export function BankDialog({
  open,
  onOpenChange,
  editingItem,
}: BankDialogProps) {
  const t = useTranslations("supplier.bank");
  const tCommon = useTranslations("supplier.common");
  const tValidation = useTranslations("supplier.validation");

  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* eslint-disable @typescript-eslint/no-explicit-any */
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
      code: "",
      swift_code: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        reset({
          name: editingItem.name,
          code: editingItem.code,
          swift_code: editingItem.swift_code ?? "",
          is_active: editingItem.is_active,
        });
      } else {
        reset({
          name: "",
          code: "",
          swift_code: "",
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
            code: data.code,
            swift_code: data.swift_code || undefined,
            is_active: data.is_active,
          },
        });
        toast.success(t("updateSuccess"));
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          code: data.code,
          swift_code: data.swift_code || undefined,
          is_active: data.is_active,
        });
        toast.success(t("createSuccess"));
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? tCommon("error_update") : "Failed to create bank");
    }
  };

  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>{t("form.name")}</FieldLabel>
            <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
            {errors.name && <FieldError>{tValidation("nameRequired")}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.code")}</FieldLabel>
            <Input
              placeholder={t("form.codePlaceholder")}
              {...register("code")}
            />
            {errors.code && <FieldError>{tValidation("codeRequired")}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.swiftCode")}</FieldLabel>
            <Input
              placeholder={t("form.swiftCodePlaceholder")}
              {...register("swift_code")}
            />
            {errors.swift_code && <FieldError>{errors.swift_code.message}</FieldError>}
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
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              <ButtonLoading loading={isSubmitting} loadingText="Saving...">
                {isEditing ? tCommon("save") : tCommon("create")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

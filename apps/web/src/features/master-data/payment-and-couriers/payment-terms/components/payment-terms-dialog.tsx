"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { toast } from "sonner";
import { useCreatePaymentTerms, useUpdatePaymentTerms } from "../hooks/use-payment-terms";
import type { PaymentTerms } from "../types";

const paymentTermsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  days: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof paymentTermsSchema>;

interface PaymentTermsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: PaymentTerms | null;
}

export function PaymentTermsDialog({
  open,
  onOpenChange,
  editingItem,
}: PaymentTermsDialogProps) {
  const t = useTranslations("paymentTerm");
  const tCommon = useTranslations("common");

  const createMutation = useCreatePaymentTerms();
  const updateMutation = useUpdatePaymentTerms();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(paymentTermsSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      days: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingItem) {
      reset({
        code: editingItem.code,
        name: editingItem.name,
        description: editingItem.description ?? "",
        days: editingItem.days,
        is_active: editingItem.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        days: 0,
        is_active: true,
      });
    }
  }, [editingItem, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data,
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created"));
      }
      onOpenChange(false);
      reset();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>{t("form.name")}</FieldLabel>
            <Input
              placeholder={t("form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.days")}</FieldLabel>
            <Input
              type="number"
              min={0}
              placeholder={t("form.daysPlaceholder")}
              {...register("days", { valueAsNumber: true })}
            />
            {errors.days && <FieldError>{errors.days.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea
              placeholder={t("form.descriptionPlaceholder")}
              {...register("description")}
            />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FieldLabel>{t("form.isActive")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {isActive ? tCommon("active") : tCommon("inactive")} status
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
              className="cursor-pointer"
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

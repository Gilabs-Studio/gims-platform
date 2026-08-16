"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Settings, Save } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { payrollSettingsSchema, type PayrollSettingsFormValues } from "../schemas/payroll.schema";
import type { PayrollSettings } from "../types/payroll.types";

interface PayrollSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: PayrollSettings;
}

export function PayrollSettingsModal({
  isOpen,
  onClose,
  initialValues,
}: PayrollSettingsModalProps) {
  const t = useTranslations("payroll");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayrollSettingsFormValues>({
    resolver: zodResolver(payrollSettingsSchema),
    values: initialValues ?? {
      cutoffDay: 25,
      paymentDay: 28,
      enablePph21Ter: true,
      bpjsHealthCap: 12000000,
    },
  });

  const pph21Ter = watch("enablePph21Ter");

  const onSubmit = (data: PayrollSettingsFormValues) => {
    console.log("Saving payroll settings:", data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t("modal.settingsTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("modal.settingsDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel className="text-xs font-semibold">{t("modal.cutoffDay")}</FieldLabel>
              <Input
                type="number"
                {...register("cutoffDay", { valueAsNumber: true })}
                className="text-xs"
              />
              {errors.cutoffDay && (
                <FieldError className="text-[11px]">{errors.cutoffDay.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold">{t("modal.paymentDay")}</FieldLabel>
              <Input
                type="number"
                {...register("paymentDay", { valueAsNumber: true })}
                className="text-xs"
              />
              {errors.paymentDay && (
                <FieldError className="text-[11px]">{errors.paymentDay.message}</FieldError>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold">{t("modal.bpjsHealthCap")}</FieldLabel>
            <Input
              type="number"
              {...register("bpjsHealthCap", { valueAsNumber: true })}
              className="text-xs"
            />
            {errors.bpjsHealthCap && (
              <FieldError className="text-[11px]">{errors.bpjsHealthCap.message}</FieldError>
            )}
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {t("modal.enablePph21Ter")}
              </span>
              <p className="text-[11px] text-muted-foreground">
                PMK 168/2023 TER Kategori A, B, C
              </p>
            </div>
            <Switch
              checked={pph21Ter}
              onCheckedChange={(checked) => setValue("enablePph21Ter", checked)}
              className="cursor-pointer"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer text-xs"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer gap-2 bg-primary text-primary-foreground text-xs font-medium"
            >
              <Save className="h-4 w-4" />
              {t("actions.saveSettings")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

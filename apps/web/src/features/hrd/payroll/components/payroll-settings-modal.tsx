"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Settings, Save, Calendar, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { usePayrollStore } from "../stores/usePayrollStore";
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
  const saveSettings = usePayrollStore((s) => s.saveSettings);

  const {
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

  const cutoffDay = watch("cutoffDay");
  const paymentDay = watch("paymentDay");
  const bpjsHealthCap = watch("bpjsHealthCap");
  const pph21Ter = watch("enablePph21Ter");

  const onSubmit = (data: PayrollSettingsFormValues) => {
    saveSettings(data);
    toast.success("Pengaturan Payroll & Aturan Penggajian berhasil diperbarui.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {t("modal.settingsTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Konfigurasi tanggal penggajian bulanan, batas BPJS, dan skema PPh 21.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Section 1: Tanggal Cutoff & Pembayaran */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Jadwal & Periode Cutoff Bulanan
            </h4>

            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="cutoffDay" className="text-xs font-semibold">
                  {t("modal.cutoffDay")}
                </FieldLabel>
                <NumericInput
                  id="cutoffDay"
                  value={cutoffDay}
                  onChange={(val) => setValue("cutoffDay", val ?? 25)}
                  placeholder="e.g. 25"
                  className="text-xs"
                />
                {errors.cutoffDay && (
                  <FieldError className="text-[11px]">{errors.cutoffDay.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="paymentDay" className="text-xs font-semibold">
                  {t("modal.paymentDay")}
                </FieldLabel>
                <NumericInput
                  id="paymentDay"
                  value={paymentDay}
                  onChange={(val) => setValue("paymentDay", val ?? 28)}
                  placeholder="e.g. 28"
                  className="text-xs"
                />
                {errors.paymentDay && (
                  <FieldError className="text-[11px]">{errors.paymentDay.message}</FieldError>
                )}
              </Field>
            </FieldGroup>
          </div>

          {/* Section 2: Pajak & BPJS */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Ketentuan PPh 21 TER & Limit BPJS
            </h4>

            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel htmlFor="bpjsHealthCap" className="text-xs font-semibold">
                  {t("modal.bpjsHealthCap")}
                </FieldLabel>
                <NumericInput
                  id="bpjsHealthCap"
                  value={bpjsHealthCap}
                  onChange={(val) => setValue("bpjsHealthCap", val ?? 0)}
                  placeholder="e.g. 12.000.000"
                  className="text-xs tabular-nums"
                />
                <FieldDescription className="text-[11px]">
                  Batas atas maksimal perhitungan iuran BPJS Kesehatan (Pencatatan Rupiah)
                </FieldDescription>
                {errors.bpjsHealthCap && (
                  <FieldError className="text-[11px]">{errors.bpjsHealthCap.message}</FieldError>
                )}
              </Field>

              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    {t("modal.enablePph21Ter")}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Skema Tarif Efektif Rata-rata (TER A/B/C) PMK 168/2023
                  </p>
                </div>
                <Switch
                  checked={pph21Ter}
                  onCheckedChange={(checked) => setValue("enablePph21Ter", checked)}
                  className="cursor-pointer"
                />
              </div>
            </FieldGroup>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-4 border-t">
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

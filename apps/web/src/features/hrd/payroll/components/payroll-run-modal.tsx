"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Play, Calendar as CalendarIcon, Users, Calculator } from "lucide-react";
import { toast } from "sonner";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/features/finance/assets/components/date-picker";
import { payrollRunSchema, type PayrollRunFormValues } from "../schemas/payroll.schema";

interface PayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PayrollRunFormValues) => void;
  isSubmitting: boolean;
}

export function PayrollRunModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: PayrollRunModalProps) {
  const t = useTranslations("payroll");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayrollRunFormValues>({
    resolver: zodResolver(payrollRunSchema),
    defaultValues: {
      period: "Juli 2026",
      cutoffDate: "2026-07-25",
      scope: "ALL",
    },
  });

  const scopeValue = watch("scope");
  const cutoffDateValue = watch("cutoffDate");

  const handleFormSubmit = (values: PayrollRunFormValues) => {
    const toastId = toast.loading("🔍 Mengambil Data Presensi & Lembur dari Modul HRD...");
    
    setTimeout(() => {
      toast.loading("🧮 Menghitung PPh 21 TER 2024 & Iuran BPJS...", { id: toastId });
      
      setTimeout(() => {
        toast.success(
          `✅ Kalkulasi Penggajian Selesai! Record Payroll Periode ${values.period} Berhasil Dibuat.`,
          { id: toastId }
        );
        onSubmit(values);
      }, 700);
    }, 700);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t("modal.payrollRunTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("modal.payrollRunDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="period" className="text-xs font-semibold">
                {t("modal.periodLabel")}
              </FieldLabel>
              <div className="relative">
                <Input
                  id="period"
                  {...register("period")}
                  placeholder="e.g. Juli 2026"
                  className="text-xs pr-8"
                />
                <CalendarIcon className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.period && (
                <FieldError className="text-[11px]">{errors.period.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="cutoffDate" className="text-xs font-semibold">
                {t("modal.cutoffLabel")}
              </FieldLabel>
              <DatePicker
                id="cutoffDate"
                value={cutoffDateValue}
                onChange={(val) => setValue("cutoffDate", val)}
                placeholder="Pilih Tanggal Cutoff"
              />
              {errors.cutoffDate && (
                <FieldError className="text-[11px]">{errors.cutoffDate.message}</FieldError>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold">{t("modal.scopeLabel")}</FieldLabel>
            <Select
              value={scopeValue}
              onValueChange={(val) => setValue("scope", val as "ALL" | "DIVISION")}
            >
              <SelectTrigger className="cursor-pointer text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer text-xs">
                  {t("modal.allEmployees")}
                </SelectItem>
                <SelectItem value="DIVISION" className="cursor-pointer text-xs">
                  {t("modal.byDivision")}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* Preview summary block */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Calculator className="h-4 w-4 text-primary" />
              {t("modal.previewSummary")}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[11px]">{t("modal.estTotalPayroll")}</span>
                <span className="font-bold text-foreground tabular-nums">Rp 1.285.000.000</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-[11px]">{t("modal.estEmployees")}</span>
                <span className="font-bold text-foreground">245 Karyawan</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 border-t">
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
              disabled={isSubmitting}
              className="cursor-pointer gap-2 bg-primary text-primary-foreground text-xs font-medium transition-all hover:bg-primary/90"
            >
              <Users className="h-4 w-4" />
              {isSubmitting ? "Processing..." : t("modal.confirmRun")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

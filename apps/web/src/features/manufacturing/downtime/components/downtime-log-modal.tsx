"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createDowntimeSchema,
  type CreateDowntimeFormData,
} from "../schemas/downtime.schema";
import { useCreateDowntime } from "../hooks/use-downtime";
import type { ProductionLineInfo } from "../types/downtime.types";

interface DowntimeLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionLines: ProductionLineInfo[];
}

export function DowntimeLogModal({
  open,
  onOpenChange,
  productionLines,
}: DowntimeLogModalProps) {
  const t = useTranslations("manufacturingDowntime.form");
  const createMutation = useCreateDowntime();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateDowntimeFormData>({
    resolver: zodResolver(createDowntimeSchema),
    defaultValues: {
      machineId: "mch-01",
      lineId: "line-1",
      categoryType: "unplanned",
      category: "Machine Breakdown",
      reason: "",
      rootCauseAnalysis: "",
      actionTaken: "",
      severity: "medium",
      status: "resolved",
      startTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      durationMinutes: 30,
      lostUnitsEstimated: 0,
      reportedBy: "",
      assignedTechnician: "",
      capaRequired: false,
    },
  });

  const categoryType = watch("categoryType");
  const selectedLineId = watch("lineId");
  const selectedCategory = watch("category");
  const selectedSeverity = watch("severity");
  const capaRequired = watch("capaRequired");

  const onSubmit = async (data: CreateDowntimeFormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
      });
      reset();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border p-6">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/50">
          <DialogTitle className="text-lg font-bold text-foreground">
            {t("createTitle")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{t("createSubtitle")}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-3">
          <FieldGroup className="space-y-4">
            {/* Classification & Line */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="categoryType">{t("categoryTypeLabel")}</FieldLabel>
                <Select
                  value={categoryType}
                  onValueChange={(val) =>
                    setValue("categoryType", val as "unplanned" | "planned", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="categoryType" className="h-9 text-xs cursor-pointer bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unplanned">{t("unplannedOption")}</SelectItem>
                    <SelectItem value="planned">{t("plannedOption")}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.categoryType && <FieldError>{errors.categoryType.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="lineId">{t("lineLabel")}</FieldLabel>
                <Select
                  value={selectedLineId}
                  onValueChange={(val) => setValue("lineId", val, { shouldValidate: true })}
                >
                  <SelectTrigger id="lineId" className="h-9 text-xs cursor-pointer bg-card">
                    <SelectValue placeholder={t("linePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.lineId && <FieldError>{errors.lineId.message}</FieldError>}
              </Field>
            </div>

            {/* Category & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="category">{t("categoryLabel")}</FieldLabel>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) =>
                    setValue(
                      "category",
                      val as CreateDowntimeFormData["category"],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger id="category" className="h-9 text-xs cursor-pointer bg-card">
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Machine Breakdown">Machine Breakdown</SelectItem>
                    <SelectItem value="Component Failure">Component Failure</SelectItem>
                    <SelectItem value="Changeover & Setup">Changeover & Setup</SelectItem>
                    <SelectItem value="CIP & Cleaning Validation">CIP & Cleaning Validation</SelectItem>
                    <SelectItem value="Material Shortage">Material Shortage</SelectItem>
                    <SelectItem value="Quality Inspection Hold">Quality Inspection Hold</SelectItem>
                    <SelectItem value="Scheduled Maintenance">Scheduled Maintenance</SelectItem>
                    <SelectItem value="Tooling / Mold Change">Tooling / Mold Change</SelectItem>
                    <SelectItem value="Operator Absence">Operator Absence</SelectItem>
                    <SelectItem value="Utility Failure">Utility Failure</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <FieldError>{errors.category.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="severity">{t("severityLabel")}</FieldLabel>
                <Select
                  value={selectedSeverity}
                  onValueChange={(val) =>
                    setValue("severity", val as "low" | "medium" | "high" | "critical", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="severity" className="h-9 text-xs cursor-pointer bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {errors.severity && <FieldError>{errors.severity.message}</FieldError>}
              </Field>
            </div>

            {/* Failure Reason */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="reason">{t("reasonLabel")}</FieldLabel>
              <Input
                id="reason"
                placeholder={t("reasonPlaceholder")}
                className="h-9 text-xs"
                {...register("reason")}
              />
              {errors.reason && <FieldError>{errors.reason.message}</FieldError>}
            </Field>

            {/* Duration & Start Time & Lost Units */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="startTime">{t("startTimeLabel")}</FieldLabel>
                <Input
                  id="startTime"
                  type="text"
                  className="h-9 text-xs font-mono"
                  {...register("startTime")}
                />
                {errors.startTime && <FieldError>{errors.startTime.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="durationMinutes">{t("durationLabel")}</FieldLabel>
                <Input
                  id="durationMinutes"
                  type="number"
                  min="1"
                  className="h-9 text-xs font-mono"
                  {...register("durationMinutes", { valueAsNumber: true })}
                />
                {errors.durationMinutes && <FieldError>{errors.durationMinutes.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="lostUnitsEstimated">{t("unitsLostLabel")}</FieldLabel>
                <Input
                  id="lostUnitsEstimated"
                  type="number"
                  min="0"
                  className="h-9 text-xs font-mono"
                  {...register("lostUnitsEstimated", { valueAsNumber: true })}
                />
                {errors.lostUnitsEstimated && <FieldError>{errors.lostUnitsEstimated.message}</FieldError>}
              </Field>
            </div>

            {/* Root Cause Diagnosis */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="rootCauseAnalysis">{t("rootCauseLabel")}</FieldLabel>
              <Textarea
                id="rootCauseAnalysis"
                rows={2}
                placeholder={t("rootCausePlaceholder")}
                className="text-xs resize-none"
                {...register("rootCauseAnalysis")}
              />
              {errors.rootCauseAnalysis && <FieldError>{errors.rootCauseAnalysis.message}</FieldError>}
            </Field>

            {/* Action Taken */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="actionTaken">{t("actionTakenLabel")}</FieldLabel>
              <Textarea
                id="actionTaken"
                rows={2}
                placeholder={t("actionTakenPlaceholder")}
                className="text-xs resize-none"
                {...register("actionTaken")}
              />
              {errors.actionTaken && <FieldError>{errors.actionTaken.message}</FieldError>}
            </Field>

            {/* Reporter & Technician */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="reportedBy">{t("reporterLabel")}</FieldLabel>
                <Input
                  id="reportedBy"
                  placeholder={t("reporterPlaceholder")}
                  className="h-9 text-xs"
                  {...register("reportedBy")}
                />
                {errors.reportedBy && <FieldError>{errors.reportedBy.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="assignedTechnician">{t("technicianLabel")}</FieldLabel>
                <Input
                  id="assignedTechnician"
                  placeholder={t("technicianPlaceholder")}
                  className="h-9 text-xs"
                  {...register("assignedTechnician")}
                />
                {errors.assignedTechnician && <FieldError>{errors.assignedTechnician.message}</FieldError>}
              </Field>
            </div>

            {/* CAPA Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="capaRequired"
                checked={capaRequired}
                onCheckedChange={(checked) => setValue("capaRequired", Boolean(checked))}
                className="cursor-pointer"
              />
              <label
                htmlFor="capaRequired"
                className="text-xs font-medium text-foreground cursor-pointer"
              >
                {t("capaRequiredLabel")}
              </label>
            </div>
          </FieldGroup>

          <DialogFooter className="pt-3 border-t border-border/50 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs cursor-pointer"
            >
              {t("cancelBtn")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="h-9 px-4 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg hover:shadow-primary/30"
            >
              {createMutation.isPending ? t("savingBtn") : t("submitBtn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMachineIncident } from "../hooks/use-machine-incident";
import {
  DOWNTIME_CATEGORIES,
  INCIDENT_SEVERITIES,
} from "../schemas/machine.schema";
import type { MachineItem } from "../types/machine.types";

interface MachineIncidentModalProps {
  machine?: MachineItem | null;
  allMachines?: MachineItem[];
}

export function MachineIncidentModal({
  machine,
  allMachines = [],
}: MachineIncidentModalProps) {
  const t = useTranslations("manufacturingMachines");
  const { form, onSubmit, isSubmitting, isOpen, closeModal, targetMachineId } =
    useMachineIncident(machine?.id);

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const currentMachineId = watch("machineId");
  const currentCategory = watch("category");
  const currentSeverity = watch("severity");

  useEffect(() => {
    if (machine?.id) {
      setValue("machineId", machine.id);
    } else if (targetMachineId) {
      setValue("machineId", targetMachineId);
    }
  }, [machine, targetMachineId, setValue]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-xl bg-card border border-border p-6 rounded-lg shadow-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <DialogTitle className="text-lg font-extrabold text-foreground">
              {t("incidentModal.title")}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("incidentModal.subtitle")}
          </p>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <FieldGroup className="space-y-3.5">
            {/* Machine Selection if not fixed */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="machineId" className="text-xs font-bold text-foreground">
                {t("incidentModal.machineLabel")}
              </FieldLabel>
              {machine ? (
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{machine.name}</span>
                  <span className="font-mono text-muted-foreground">{machine.code}</span>
                </div>
              ) : (
                <Select
                  value={currentMachineId}
                  onValueChange={(val) => setValue("machineId", val)}
                >
                  <SelectTrigger id="machineId" className="h-9 text-xs bg-card cursor-pointer">
                    <SelectValue placeholder="Select target machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMachines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.machineId && (
                <FieldError className="text-[11px]">{errors.machineId.message}</FieldError>
              )}
            </Field>

            {/* Failure Reason */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="reason" className="text-xs font-bold text-foreground">
                {t("incidentModal.reasonLabel")}
              </FieldLabel>
              <Input
                id="reason"
                placeholder={t("incidentModal.reasonPlaceholder")}
                {...register("reason")}
                className="h-9 text-xs bg-card"
              />
              {errors.reason && (
                <FieldError className="text-[11px]">{errors.reason.message}</FieldError>
              )}
            </Field>

            {/* Category & Severity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="category" className="text-xs font-bold text-foreground">
                  {t("incidentModal.categoryLabel")}
                </FieldLabel>
                <Select
                  value={currentCategory}
                  onValueChange={(val: (typeof DOWNTIME_CATEGORIES)[number]) =>
                    setValue("category", val)
                  }
                >
                  <SelectTrigger id="category" className="h-9 text-xs bg-card cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOWNTIME_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <FieldError className="text-[11px]">{errors.category.message}</FieldError>
                )}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="severity" className="text-xs font-bold text-foreground">
                  {t("incidentModal.severityLabel")}
                </FieldLabel>
                <Select
                  value={currentSeverity}
                  onValueChange={(val: (typeof INCIDENT_SEVERITIES)[number]) =>
                    setValue("severity", val)
                  }
                >
                  <SelectTrigger id="severity" className="h-9 text-xs bg-card cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_SEVERITIES.map((sev) => (
                      <SelectItem key={sev} value={sev} className="capitalize">
                        {sev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.severity && (
                  <FieldError className="text-[11px]">{errors.severity.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Duration & Start Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="durationMinutes" className="text-xs font-bold text-foreground">
                  {t("incidentModal.durationLabel")}
                </FieldLabel>
                <Input
                  id="durationMinutes"
                  type="number"
                  {...register("durationMinutes", { valueAsNumber: true })}
                  className="h-9 text-xs bg-card"
                />
                {errors.durationMinutes && (
                  <FieldError className="text-[11px]">
                    {errors.durationMinutes.message}
                  </FieldError>
                )}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="startTime" className="text-xs font-bold text-foreground">
                  {t("incidentModal.startTimeLabel")}
                </FieldLabel>
                <Input
                  id="startTime"
                  {...register("startTime")}
                  className="h-9 text-xs bg-card font-mono"
                />
                {errors.startTime && (
                  <FieldError className="text-[11px]">{errors.startTime.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Reported By */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="reportedBy" className="text-xs font-bold text-foreground">
                {t("incidentModal.reporterLabel")}
              </FieldLabel>
              <Input
                id="reportedBy"
                placeholder={t("incidentModal.reporterPlaceholder")}
                {...register("reportedBy")}
                className="h-9 text-xs bg-card"
              />
              {errors.reportedBy && (
                <FieldError className="text-[11px]">{errors.reportedBy.message}</FieldError>
              )}
            </Field>

            {/* Action Taken */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="actionTaken" className="text-xs font-bold text-foreground">
                {t("incidentModal.actionLabel")}
              </FieldLabel>
              <Textarea
                id="actionTaken"
                rows={2}
                placeholder={t("incidentModal.actionPlaceholder")}
                {...register("actionTaken")}
                className="text-xs bg-card resize-none"
              />
              {errors.actionTaken && (
                <FieldError className="text-[11px]">{errors.actionTaken.message}</FieldError>
              )}
            </Field>
          </FieldGroup>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={isSubmitting}
              className="h-9 text-xs cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {isSubmitting ? t("actions.submitting") : t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  createDeviationSchema,
  type CreateDeviationSchema,
} from "../schemas/work-order.schema";
import { useLogDeviation } from "../hooks/use-work-orders";
import type { WorkOrder } from "../types/work-order.types";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface WorkOrderDeviationDialogProps {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
}

export function WorkOrderDeviationDialog({
  open,
  onClose,
  workOrder,
}: WorkOrderDeviationDialogProps) {
  const t = useTranslations("manufacturingWorkOrders");
  const logDeviationMutation = useLogDeviation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeviationSchema>({
    resolver: zodResolver(createDeviationSchema),
    defaultValues: {
      workOrderId: workOrder?.id || "",
      title: "",
      description: "",
      severity: "minor",
      loggedBy: workOrder?.operatorName || "Ahmad Pratama",
      correctiveAction: "",
    },
  });

  React.useEffect(() => {
    if (workOrder) {
      setValue("workOrderId", workOrder.id);
      setValue("loggedBy", workOrder.operatorName || "Ahmad Pratama");
    }
  }, [workOrder, setValue]);

  const selectedSeverity = watch("severity");

  const onSubmit = async (data: CreateDeviationSchema) => {
    try {
      await logDeviationMutation.mutateAsync(data);
      toast.success(t("messages.deviationLogged", { batch: workOrder?.batchNumber || "" }));
      reset();
      onClose();
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  if (!workOrder) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span>{t("deviationDialog.title")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("deviationDialog.subtitle")} — <span className="font-mono font-bold text-foreground">{workOrder.code} ({workOrder.batchNumber})</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-3.5">
            {/* Deviation Title */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="title" className="text-xs font-semibold">
                {t("deviationDialog.incidentTitle")} *
              </FieldLabel>
              <Input
                id="title"
                placeholder={t("deviationDialog.incidentPlaceholder")}
                className="h-9 text-xs"
                {...register("title")}
              />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            {/* Severity Selection */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="severity" className="text-xs font-semibold">
                {t("deviationDialog.severity")} *
              </FieldLabel>
              <Select
                value={selectedSeverity}
                onValueChange={(val: "minor" | "major" | "critical") => setValue("severity", val)}
              >
                <SelectTrigger className="h-9 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor" className="text-xs cursor-pointer">
                    {t("deviationDialog.severityMinor")}
                  </SelectItem>
                  <SelectItem value="major" className="text-xs cursor-pointer text-warning">
                    {t("deviationDialog.severityMajor")}
                  </SelectItem>
                  <SelectItem value="critical" className="text-xs cursor-pointer text-destructive">
                    {t("deviationDialog.severityCritical")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Description */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="description" className="text-xs font-semibold">
                {t("deviationDialog.description")} *
              </FieldLabel>
              <Input
                id="description"
                placeholder={t("deviationDialog.descriptionPlaceholder")}
                className="h-9 text-xs"
                {...register("description")}
              />
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            {/* Corrective Action */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="correctiveAction" className="text-xs font-semibold">
                {t("deviationDialog.correctiveAction")}
              </FieldLabel>
              <Input
                id="correctiveAction"
                placeholder={t("deviationDialog.correctiveActionPlaceholder")}
                className="h-9 text-xs"
                {...register("correctiveAction")}
              />
            </Field>

            {/* Logged By */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="loggedBy" className="text-xs font-semibold">
                {t("deviationDialog.loggedBy")} *
              </FieldLabel>
              <Input
                id="loggedBy"
                className="h-9 text-xs"
                {...register("loggedBy")}
              />
              {errors.loggedBy && <FieldError>{errors.loggedBy.message}</FieldError>}
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs cursor-pointer"
            >
              {t("deviationDialog.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={isSubmitting || logDeviationMutation.isPending}
              className="h-9 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              {t("deviationDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

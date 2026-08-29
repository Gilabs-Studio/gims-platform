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
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  logQualityIncidentSchema,
  type LogQualityIncidentSchema,
} from "../schemas/quality-andon.schema";
import { useLogQualityIncident } from "../hooks/use-quality-andon";
import type { AndonParameterItem } from "../types/quality-andon.types";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface QualityAndonIncidentDialogProps {
  open: boolean;
  onClose: () => void;
  parameter: AndonParameterItem | null;
}

export function QualityAndonIncidentDialog({
  open,
  onClose,
  parameter,
}: QualityAndonIncidentDialogProps) {
  const t = useTranslations("manufacturingQualityAndon");
  const logIncidentMutation = useLogQualityIncident();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogQualityIncidentSchema>({
    resolver: zodResolver(logQualityIncidentSchema),
    defaultValues: {
      parameterId: parameter?.id || "",
      title: "",
      description: "",
      severity: "major",
      loggedBy: parameter?.operatorName || "Ahmad Pratama",
      correctiveAction: "",
      isCapaRequired: false,
    },
  });

  React.useEffect(() => {
    if (parameter) {
      setValue("parameterId", parameter.id);
      setValue("loggedBy", parameter.operatorName || "Ahmad Pratama");
    }
  }, [parameter, setValue]);

  const selectedSeverity = watch("severity");
  const isCapaRequired = watch("isCapaRequired");

  const onSubmit = async (data: LogQualityIncidentSchema) => {
    try {
      await logIncidentMutation.mutateAsync(data);
      toast.success(t("messages.incidentLogged", { code: parameter?.code || "" }));
      reset();
      onClose();
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  if (!parameter) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span>{t("incidentDialog.title")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("incidentDialog.subtitle")} — <span className="font-mono font-bold text-foreground">{parameter.name}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-3.5">
            {/* Title */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="title" className="text-xs font-semibold">
                {t("incidentDialog.incidentTitle")} *
              </FieldLabel>
              <Input
                id="title"
                placeholder={t("incidentDialog.incidentPlaceholder")}
                className="h-9 text-xs"
                {...register("title")}
              />
              {errors.title && <FieldError>{errors.title.message}</FieldError>}
            </Field>

            {/* Severity */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="severity" className="text-xs font-semibold">
                {t("incidentDialog.severity")} *
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
                    {t("severity.minor")}
                  </SelectItem>
                  <SelectItem value="major" className="text-xs cursor-pointer text-warning">
                    {t("severity.major")}
                  </SelectItem>
                  <SelectItem value="critical" className="text-xs cursor-pointer text-destructive font-semibold">
                    {t("severity.critical")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Description */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="description" className="text-xs font-semibold">
                {t("incidentDialog.description")} *
              </FieldLabel>
              <Input
                id="description"
                placeholder={t("incidentDialog.descriptionPlaceholder")}
                className="h-9 text-xs"
                {...register("description")}
              />
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            {/* Corrective Action */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="correctiveAction" className="text-xs font-semibold">
                {t("incidentDialog.correctiveAction")}
              </FieldLabel>
              <Input
                id="correctiveAction"
                placeholder={t("incidentDialog.correctiveActionPlaceholder")}
                className="h-9 text-xs"
                {...register("correctiveAction")}
              />
            </Field>

            {/* Reported By */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="loggedBy" className="text-xs font-semibold">
                {t("incidentDialog.loggedBy")} *
              </FieldLabel>
              <Input
                id="loggedBy"
                className="h-9 text-xs"
                {...register("loggedBy")}
              />
              {errors.loggedBy && <FieldError>{errors.loggedBy.message}</FieldError>}
            </Field>

            {/* Require CAPA Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="isCapaRequired"
                checked={isCapaRequired}
                onCheckedChange={(checked) => setValue("isCapaRequired", Boolean(checked))}
                className="cursor-pointer"
              />
              <label
                htmlFor="isCapaRequired"
                className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("incidentDialog.isCapaRequired")}
              </label>
            </div>
          </FieldGroup>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs cursor-pointer"
            >
              {t("incidentDialog.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || logIncidentMutation.isPending}
              className="h-9 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              {t("incidentDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

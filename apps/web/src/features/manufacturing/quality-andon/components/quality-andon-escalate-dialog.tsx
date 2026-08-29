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
  escalateToQASchema,
  type EscalateToQASchema,
} from "../schemas/quality-andon.schema";
import { useEscalateToQA } from "../hooks/use-quality-andon";
import type { AndonParameterItem } from "../types/quality-andon.types";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

interface QualityAndonEscalateDialogProps {
  open: boolean;
  onClose: () => void;
  parameter: AndonParameterItem | null;
}

export function QualityAndonEscalateDialog({
  open,
  onClose,
  parameter,
}: QualityAndonEscalateDialogProps) {
  const t = useTranslations("manufacturingQualityAndon");
  const escalateMutation = useEscalateToQA();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EscalateToQASchema>({
    resolver: zodResolver(escalateToQASchema),
    defaultValues: {
      parameterId: parameter?.id || "",
      urgency: "critical",
      message: "",
      reportedBy: parameter?.operatorName || "Ahmad Pratama",
      targetQAPerson: parameter?.qaInspectorName || "Dewi Lestari",
    },
  });

  React.useEffect(() => {
    if (parameter) {
      setValue("parameterId", parameter.id);
      setValue("reportedBy", parameter.operatorName || "Ahmad Pratama");
      setValue("targetQAPerson", parameter.qaInspectorName || "Dewi Lestari");
    }
  }, [parameter, setValue]);

  const selectedUrgency = watch("urgency");

  const onSubmit = async (data: EscalateToQASchema) => {
    try {
      await escalateMutation.mutateAsync(data);
      toast.success(t("messages.escalatedToQA", { target: data.targetQAPerson || "QA Team" }));
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
            <BellRing className="h-5 w-5 text-destructive" />
            <span>{t("escalateDialog.title")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("escalateDialog.subtitle")} — <span className="font-mono font-bold text-foreground">{parameter.name} ({parameter.code})</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-3.5">
            {/* Urgency Level */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="urgency" className="text-xs font-semibold">
                {t("escalateDialog.urgency")} *
              </FieldLabel>
              <Select
                value={selectedUrgency}
                onValueChange={(val: "high" | "critical") => setValue("urgency", val)}
              >
                <SelectTrigger className="h-9 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical" className="text-xs cursor-pointer text-destructive font-semibold">
                    {t("escalateDialog.urgencyCritical")}
                  </SelectItem>
                  <SelectItem value="high" className="text-xs cursor-pointer text-warning font-semibold">
                    {t("escalateDialog.urgencyHigh")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {/* Message / Observation */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="message" className="text-xs font-semibold">
                {t("escalateDialog.message")} *
              </FieldLabel>
              <Input
                id="message"
                placeholder={t("escalateDialog.messagePlaceholder")}
                className="h-9 text-xs"
                {...register("message")}
              />
              {errors.message && <FieldError>{errors.message.message}</FieldError>}
            </Field>

            {/* Reported By & QA Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="reportedBy" className="text-xs font-semibold">
                  {t("escalateDialog.reportedBy")} *
                </FieldLabel>
                <Input
                  id="reportedBy"
                  className="h-9 text-xs"
                  {...register("reportedBy")}
                />
                {errors.reportedBy && <FieldError>{errors.reportedBy.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="targetQAPerson" className="text-xs font-semibold">
                  {t("escalateDialog.targetQAPerson")}
                </FieldLabel>
                <Input
                  id="targetQAPerson"
                  className="h-9 text-xs"
                  {...register("targetQAPerson")}
                />
              </Field>
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
              {t("escalateDialog.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={isSubmitting || escalateMutation.isPending}
              className="h-9 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              {t("escalateDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, AlertTriangle } from "lucide-react";
import { useDealFormData, useMoveDealStage } from "../hooks/use-deals";
import {
  moveDealStageSchema,
  type MoveDealStageFormData,
} from "../schemas/deal.schema";
import type { Deal } from "../types";

interface MoveStageDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Pre-select a target stage (e.g. from drag & drop) */
  defaultTargetStageId?: string;
}

export function MoveStageDialog({
  deal,
  open,
  onOpenChange,
  onSuccess,
  defaultTargetStageId,
}: MoveStageDialogProps) {
  const t = useTranslations("crmDeal");
  const { data: formData } = useDealFormData();
  const moveStageMutation = useMoveDealStage();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MoveDealStageFormData>({
    resolver: zodResolver(moveDealStageSchema),
    defaultValues: {
      to_stage_id: defaultTargetStageId ?? "",
      reason: "",
      notes: "",
      close_reason: "",
      convert_to_quotation: false,
    },
  });

  // Keep a ref so the useEffect dep array never changes size (avoids React
  // "dependency array changed size" error during HMR / conditional rendering)
  const defaultTargetStageIdRef = useRef(defaultTargetStageId);
  useEffect(() => {
    defaultTargetStageIdRef.current = defaultTargetStageId;
  });

  useEffect(() => {
    if (open) {
      reset({
        to_stage_id: defaultTargetStageIdRef.current ?? "",
        reason: "",
        notes: "",
        close_reason: "",
        convert_to_quotation: false,
      });
    }
  }, [open, reset]);

  const selectedStageId = watch("to_stage_id");

  // Determine if selected stage is a terminal (Closed Won/Lost) stage
  const selectedStage = formData?.pipeline_stages?.find(
    (s) => s.id === selectedStageId
  );
  const isClosingStage =
    selectedStage && selectedStage.probability !== undefined
      ? selectedStage.probability === 100 || selectedStage.probability === 0
      : false;

  // Determine if selected stage is a Won stage (for convert checkbox)
  const isWonStage = selectedStage?.is_won === true;

  // Check if deal has items and customer (prerequisites for conversion)
  const hasItems = (deal?.items?.length ?? 0) > 0;
  const hasCustomer = !!deal?.customer_id;
  const canConvert = isWonStage && hasItems && hasCustomer;

  // Filter out current stage from available options
  const availableStages = (formData?.pipeline_stages ?? []).filter(
    (stage) => stage.id !== deal?.pipeline_stage_id
  );

  const onSubmit = (data: MoveDealStageFormData) => {
    if (!deal) return;

    moveStageMutation.mutate(
      {
        id: deal.id,
        data: {
          to_stage_id: data.to_stage_id,
          reason: data.reason ?? "",
          notes: data.notes || undefined,
          close_reason: data.close_reason || undefined,
          convert_to_quotation: data.convert_to_quotation || false,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("moveStageTitle")}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t("moveStageDescription", { title: deal.title })}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Current Stage */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">{t("currentStage")}</p>
            <div className="flex items-center gap-2 mt-1">
              {deal.pipeline_stage && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: deal.pipeline_stage.color || "#6b7280",
                  }}
                />
              )}
              <span className="text-sm font-medium">
                {deal.pipeline_stage?.name ?? "-"}
              </span>
            </div>
          </div>

          {/* Target Stage */}
          <div className="space-y-2">
            <Label>{t("targetStage")} *</Label>
            <Controller
              name="to_stage_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("selectStage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStages.map((stage) => (
                      <SelectItem
                        key={stage.id}
                        value={stage.id}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: stage.color || "#6b7280",
                            }}
                          />
                          {stage.name} ({stage.probability}%)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.to_stage_id && (
              <p className="text-sm text-destructive">
                {errors.to_stage_id.message}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t("reason")} *</Label>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder={t("reasonPlaceholder")}
                  rows={2}
                />
              )}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Close reason (shown for terminal stages) */}
          {isClosingStage && (
            <div className="space-y-2">
              <Label>{t("closeReason")}</Label>
              <Controller
                name="close_reason"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder={t("closeReasonPlaceholder")}
                    rows={2}
                  />
                )}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder={t("notesPlaceholder")}
                  rows={2}
                />
              )}
            />
          </div>

          {/* Convert to Sales Quotation checkbox (only for Won stages) */}
          {isWonStage && (
            <div className="rounded-lg border p-3 space-y-2">
              <Controller
                name="convert_to_quotation"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="convert_to_quotation"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canConvert}
                      className="mt-0.5 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="convert_to_quotation"
                        className="text-sm font-medium cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {t("moveStageConvertLabel")}
                        </div>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("moveStageConvertDescription")}
                      </p>
                      {!canConvert && isWonStage && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {!hasItems && t("moveStageConvertNoItems")}
                          {hasItems && !hasCustomer && t("moveStageConvertNoCustomer")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={moveStageMutation.isPending}
            >
              {moveStageMutation.isPending ? t("moving") : t("moveStage")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

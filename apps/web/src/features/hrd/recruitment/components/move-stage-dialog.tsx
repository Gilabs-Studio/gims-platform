"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMoveApplicantStage } from "../hooks/use-applicants";
import type { RecruitmentApplicant, ApplicantStage } from "../types";

interface MoveStageDialogProps {
  applicant: RecruitmentApplicant | null;
  open: boolean;
  defaultTargetStageId?: string;
  stages: ApplicantStage[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MoveStageDialog({
  applicant,
  open,
  defaultTargetStageId,
  stages,
  onOpenChange,
  onSuccess,
}: MoveStageDialogProps) {
  const t = useTranslations("recruitment");
  const moveStageMutation = useMoveApplicantStage();

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReason("");
      setNotes("");
    }
  }, [open]);

  const targetStage = stages.find((s) => s.id === defaultTargetStageId);
  const isTerminal = targetStage?.is_won || targetStage?.is_lost;

  const handleSubmit = async () => {
    if (!applicant || !defaultTargetStageId) return;

    try {
      await moveStageMutation.mutateAsync({
        id: applicant.id,
        data: {
          to_stage_id: defaultTargetStageId,
          reason: reason || undefined,
          notes: notes || undefined,
        },
      });
      onSuccess();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("applicants.moveStage.title")}</DialogTitle>
          <DialogDescription>
            {t("applicants.moveStage.description", {
              name: applicant?.full_name,
              stage: targetStage?.name,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("applicants.moveStage.fromStage")}</Label>
            <p className="text-sm text-muted-foreground">
              {applicant?.stage?.name || "-"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("applicants.moveStage.toStage")}</Label>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: targetStage?.color }}
              />
              <span className="font-medium">{targetStage?.name}</span>
            </div>
          </div>

          {isTerminal && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t("applicants.moveStage.reason")}
                {targetStage?.is_lost && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Textarea
                id="reason"
                placeholder={t("applicants.moveStage.reasonPlaceholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t("applicants.moveStage.notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("applicants.moveStage.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={moveStageMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              moveStageMutation.isPending ||
              (targetStage?.is_lost && !reason.trim())
            }
            variant={targetStage?.is_lost ? "destructive" : "default"}
          >
            {moveStageMutation.isPending
              ? t("common.saving")
              : t("applicants.moveStage.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConvertLead, useLeadFormData } from "../hooks/use-leads";
import type { Lead } from "../types";

interface LeadConvertDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly lead: Lead | null;
  readonly onSuccess?: () => void;
}

export function LeadConvertDialog({
  open,
  onClose,
  lead,
  onSuccess,
}: LeadConvertDialogProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");

  const [pipelineStageId, setPipelineStageId] = useState<string>("");
  const [dealTitle, setDealTitle] = useState<string>("");
  const [dealValue, setDealValue] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>("");

  const convertMutation = useConvertLead();
  const { data: formDataRes } = useLeadFormData({ enabled: open });
  const pipelineStages = formDataRes?.data?.pipeline_stages ?? [];

  // Pre-fill deal title from lead company name when dialog opens
  useEffect(() => {
    if (open && lead) {
      const title = lead.company_name || `${lead.first_name} ${lead.last_name ?? ""}`.trim();
      setDealTitle(title);
      setPipelineStageId("");
      // Auto-fill deal value from budget_amount when budget is confirmed
      setDealValue(lead.budget_confirmed && lead.budget_amount > 0 ? lead.budget_amount : undefined);
      setNotes("");
    }
  }, [open, lead]);

  const handleConvert = async () => {
    if (!lead) return;

    try {
      await convertMutation.mutateAsync({
        id: lead.id,
        data: {
          pipeline_stage_id: pipelineStageId || undefined,
          deal_title: dealTitle || undefined,
          deal_value: dealValue ?? undefined,
          notes: notes || undefined,
        },
      });
      toast.success(t("converted"));
      onSuccess?.();
      onClose();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {t("convertTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("convertDescription")}
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <p className="font-medium">
              {lead.first_name} {lead.last_name}
            </p>
            {lead.company_name && (
              <p className="text-muted-foreground">{lead.company_name}</p>
            )}
            <p className="text-muted-foreground">{lead.code}</p>
          </div>
        )}

        <div className="space-y-4">
          <Field orientation="vertical">
            <FieldLabel>{t("form.dealTitle")}</FieldLabel>
            <Input
              placeholder={t("form.dealTitlePlaceholder")}
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
            />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.pipelineStage")}</FieldLabel>
            <Select value={pipelineStageId} onValueChange={setPipelineStageId}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.pipelineStagePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {pipelineStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id} className="cursor-pointer">
                    {stage.name} ({stage.probability}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {t("form.pipelineStageHint")}
            </p>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.dealValue")}</FieldLabel>
            <NumericInput
              currency
              placeholder={t("form.dealValuePlaceholder")}
              value={dealValue}
              onChange={setDealValue}
            />
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("form.convertNotes")}</FieldLabel>
            <Textarea
              placeholder={t("form.convertNotesPlaceholder")}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={convertMutation.isPending}
            className="cursor-pointer"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleConvert}
            disabled={convertMutation.isPending}
            className="cursor-pointer"
          >
            {convertMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("convertButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

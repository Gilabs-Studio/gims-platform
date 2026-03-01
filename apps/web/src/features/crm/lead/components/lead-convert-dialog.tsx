"use client";

import { useState } from "react";
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

  const [customerId, setCustomerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const convertMutation = useConvertLead();
  const { data: formDataRes } = useLeadFormData({ enabled: open });
  const customers = formDataRes?.data?.customers ?? [];

  const handleConvert = async () => {
    if (!lead) return;

    try {
      await convertMutation.mutateAsync({
        id: lead.id,
        data: {
          customer_id: customerId || null,
          notes,
        },
      });
      toast.success(t("converted"));
      setCustomerId("");
      setNotes("");
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
            <FieldLabel>{t("form.convertCustomer")}</FieldLabel>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.convertCustomerPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!customerId && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("form.createNewCustomer")}
              </p>
            )}
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
            {t("convertTitle")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { useConvertToQuotation } from "../hooks/use-deals";
import { toast } from "sonner";
import type { Deal, ConvertToQuotationResponse } from "../types";

interface ConvertToQuotationDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertToQuotationDialog({
  deal,
  open,
  onOpenChange,
}: ConvertToQuotationDialogProps) {
  const t = useTranslations("crmDeal");
  const tCommon = useTranslations("common");
  const convertMutation = useConvertToQuotation();

  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ConvertToQuotationResponse | null>(null);

  const handleConvert = useCallback(async () => {
    try {
      const response = await convertMutation.mutateAsync({
        id: deal.id,
        data: { notes: notes || undefined },
      });
      setResult(response.data);
      toast.success(t("conversion.convertSuccess"));
    } catch {
      toast.error(t("conversion.convertError"));
    }
  }, [convertMutation, deal.id, notes, t]);

  const handleClose = useCallback(() => {
    setNotes("");
    setResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const itemCount = deal.items?.filter(i => !i.is_deleted).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {t("conversion.convertSuccess")}
              </DialogTitle>
              <DialogDescription>
                {t("conversion.quotationCreated")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-lg border p-3 space-y-1.5">
                <p className="text-sm font-medium">
                  {t("conversion.quotationCode")}: {result.quotation_code}
                </p>
              </div>
              <Link
                href={`/sales/quotations/${result.quotation_id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                {t("conversion.viewQuotation")}
              </Link>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="cursor-pointer"
              >
                {tCommon("close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("conversion.title")}
              </DialogTitle>
              <DialogDescription>
                {t("conversion.description", { title: deal.title })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Deal summary */}
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("value")}</span>
                  <span className="font-semibold">{formatCurrency(deal.value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("customer")}</span>
                  <span className="font-medium">{deal.customer?.name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("productItems")}</span>
                  <span className="font-medium">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>

              {/* Optional notes */}
              <div className="space-y-2">
                <Label htmlFor="conversion-notes">{t("conversion.notesLabel")}</Label>
                <Textarea
                  id="conversion-notes"
                  placeholder={t("conversion.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={convertMutation.isPending}
                className="cursor-pointer"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleConvert}
                disabled={convertMutation.isPending}
                className="cursor-pointer"
              >
                {convertMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("conversion.converting")}
                  </>
                ) : (
                  t("conversion.confirm")
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

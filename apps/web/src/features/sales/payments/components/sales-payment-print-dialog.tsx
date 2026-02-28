"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Printer, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { salesPaymentsService } from "../services/sales-payments-service";

interface SalesPaymentPrintDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly paymentId: string;
}

export function SalesPaymentPrintDialog({
  open,
  onClose,
  paymentId,
}: SalesPaymentPrintDialogProps) {
  const t = useTranslations("salesPayment");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: companiesData, isLoading: companiesLoading } = useCompanies(
    { per_page: 100, status: "approved" },
    { enabled: open }
  );

  const companies = companiesData?.data ?? [];

  const handlePrint = async () => {
    if (!selectedCompanyId) {
      toast.error(t("printCompanyPlaceholder"));
      return;
    }

    setIsPrinting(true);
    try {
      await salesPaymentsService.openPrintWindow(paymentId, selectedCompanyId);
      onClose();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedCompanyId("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {t("printPaymentReceipt")}
          </DialogTitle>
          <DialogDescription>{t("printSelectCompany")}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            <Building2 className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
            {t("printCompanyLabel")}
          </label>
          {companiesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("printNoCompanies")}</p>
          ) : (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder={t("printCompanyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem
                    key={company.id}
                    value={company.id}
                    className="cursor-pointer"
                  >
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!selectedCompanyId || isPrinting}
            className="cursor-pointer"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {t("printConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

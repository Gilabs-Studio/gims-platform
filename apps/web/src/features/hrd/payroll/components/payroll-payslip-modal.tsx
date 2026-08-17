"use client";

import { useTranslations } from "next-intl";
import { Printer, Download, User, Building2, CreditCard, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { EmployeePayslipItem } from "../types/payroll.types";

interface PayrollPayslipModalProps {
  payslip: EmployeePayslipItem | null;
  period: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PayrollPayslipModal({
  payslip,
  period,
  isOpen,
  onClose,
}: PayrollPayslipModalProps) {
  const t = useTranslations("payroll.detail.payslipModal");

  if (!payslip) return null;

  const totalEarnings = payslip.basicSalary + payslip.allowances + payslip.overtime;
  const totalDeductions = payslip.deductions + payslip.taxPph21 + payslip.bpjsEmployee;

  const handlePrint = () => {
    toast.success(`${t("print")} - ${payslip.employeeName} (${payslip.nip})`);
  };

  const handleDownloadPdf = () => {
    toast.success(`${t("downloadPdf")} - ${payslip.employeeName}_${period}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {t("title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("subtitle", { period })}
              </DialogDescription>
            </div>
            <span className="inline-flex items-center rounded-md bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
              {payslip.status}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Employee Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3.5 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>{payslip.employeeName}</span>
              </div>
              <p className="text-muted-foreground">NIP: <span className="font-mono text-foreground font-semibold">{payslip.nip}</span></p>
              <p className="text-muted-foreground">{payslip.position}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{payslip.department}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{payslip.bankName}</span>
              </div>
              <p className="font-mono text-foreground font-medium">{payslip.bankAccountNumber}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="rounded-lg border p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b pb-2">
                <DollarSign className="h-3.5 w-3.5 text-success" />
                {t("earnings")}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gaji Pokok</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tunjangan Operasional</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.allowances)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upah Lembur</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.overtime)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-foreground">
                  <span>Subtotal Penerimaan</span>
                  <span className="text-success tabular-nums">{formatCurrency(totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-lg border p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b pb-2">
                <DollarSign className="h-3.5 w-3.5 text-destructive" />
                {t("deductions")}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potongan Pajak PPh 21</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.taxPph21)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Iuran BPJS Karyawan</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.bpjsEmployee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potongan Lainnya</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.deductions)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-foreground">
                  <span>Subtotal Potongan</span>
                  <span className="text-destructive tabular-nums">{formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Take Home Pay Highlight Box */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-muted-foreground">{t("netSalary")}</span>
              <p className="text-xs text-muted-foreground">Termasuk seluruh penerimaan bersih setelah pajak & iuran</p>
            </div>
            <span className="text-xl font-bold text-primary tabular-nums">
              {formatCurrency(payslip.netPay)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="cursor-pointer text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("print")}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="cursor-pointer text-xs"
              >
                {t("close")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDownloadPdf}
                className="cursor-pointer text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {t("downloadPdf")}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

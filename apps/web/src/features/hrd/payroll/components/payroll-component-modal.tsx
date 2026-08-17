"use client";

import { useTranslations } from "next-intl";
import { PieChart, Download } from "lucide-react";
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
import type { PayrollComponentItem } from "../types/payroll.types";

interface PayrollComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: PayrollComponentItem[];
  totalAmount: number;
}

export function PayrollComponentModal({
  isOpen,
  onClose,
  components,
  totalAmount,
}: PayrollComponentModalProps) {
  const t = useTranslations("payroll");

  const handleExportCsv = () => {
    toast.success("Rincian komponen penggajian berhasil diekspor ke CSV.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Rincian Komponen Penggajian Karyawan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Distribusi persentase dan alokasi nominal komponen penggajian (Periode Juni 2026).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total Summary Banner */}
          <div className="rounded-lg border bg-muted/30 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-muted-foreground">Total Pengeluaran Payroll</span>
              <p className="text-xs text-muted-foreground">Akumulasi seluruh penerimaan & tunjangan karyawan</p>
            </div>
            <span className="text-lg font-extrabold text-foreground tabular-nums">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          {/* Component List Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Komponen Gaji</th>
                  <th className="py-2.5 px-3 text-right">Alokasi (%)</th>
                  <th className="py-2.5 px-3 text-right">Total Nominal</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y text-foreground">
                {components.map((item) => (
                  <tr key={item.key} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 font-bold flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold tabular-nums">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px]">
                        {item.pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums">
                      {formatCurrency(item.value)}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground text-[11px]">
                      {item.key === "basic" && "Gaji pokok disetujui sesuai kontrak kerja"}
                      {item.key === "allowances" && "Tunjangan jabatan, transportasi, & konsumsi"}
                      {item.key === "overtime" && "Upah lembur terintegrasi log presensi"}
                      {item.key === "bonus" && "Bonus performa KPI bulanan"}
                      {item.key === "deductions" && "Potongan PPh 21 TER 2024 & Iuran BPJS"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="cursor-pointer text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            {t("actions.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

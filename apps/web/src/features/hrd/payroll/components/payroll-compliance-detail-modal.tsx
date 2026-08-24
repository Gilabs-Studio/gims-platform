"use client";

import { useTranslations } from "next-intl";
import { FileText, ShieldCheck, Clock, Download, CheckCircle2, Building2, Calendar, FileSpreadsheet } from "lucide-react";
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
import type { ComplianceTaxItem } from "../types/payroll.types";

interface PayrollComplianceDetailModalProps {
  item: ComplianceTaxItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PayrollComplianceDetailModal({
  item,
  isOpen,
  onClose,
}: PayrollComplianceDetailModalProps) {
  const t = useTranslations("payroll");

  if (!item) return null;

  const handleDownloadReport = () => {
    toast.success(`Laporan Kepatuhan ${item.title} berhasil diunduh.`);
  };

  const handleExportCsv = () => {
    toast.success(`Data rincian tarif ${item.title} diekspor ke CSV.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                {item.type === "pph21" && <FileText className="h-5 w-5" />}
                {item.type === "bpjs_health" && <ShieldCheck className="h-5 w-5" />}
                {item.type === "bpjs_employment" && <Clock className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {item.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {item.subtitle} — Periode Juni 2026
                </DialogDescription>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Patuh / Terverifikasi
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Top Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Total Kewajiban Bulanan</span>
              <p className="text-base font-extrabold text-foreground tabular-nums">
                {formatCurrency(item.amount)}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Porsi Perusahaan</span>
              <p className="text-base font-bold text-success tabular-nums">
                {formatCurrency(Math.round(item.amount * 0.65))}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Porsi Karyawan (Dipotong)</span>
              <p className="text-base font-bold text-rose tabular-nums">
                {formatCurrency(Math.round(item.amount * 0.35))}
              </p>
            </div>
          </div>

          {/* Reference Info Card */}
          <div className="rounded-lg border p-3 bg-muted/10 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Entitas Pemotong / Pembayar</span>
                <span className="font-semibold text-foreground">PT GILABS DIGITAL NUSANTARA</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Batas Waktu Setor / Lapor</span>
                <span className="font-semibold text-foreground">10 Juli 2026 (Jatuh Tempo)</span>
              </div>
            </div>
          </div>

          {/* Detailed Rate Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground">Rincian Komponen & Tarif Kepatuhan</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Kategori Skema</th>
                    <th className="py-2.5 px-3 text-center">Tarif (%)</th>
                    <th className="py-2.5 px-3 text-center">Jml Karyawan</th>
                    <th className="py-2.5 px-3 text-right">Nominal Terakumulasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-foreground">
                  {item.type === "pph21" && (
                    <>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">TER Kategori A (PTKP TK/0, TK/1, K/0)</td>
                        <td className="py-2.5 px-3 text-center">0% - 19%</td>
                        <td className="py-2.5 px-3 text-center">140 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 48.500.000</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">TER Kategori B (PTKP TK/2, K/1, K/2)</td>
                        <td className="py-2.5 px-3 text-center">1.5% - 22%</td>
                        <td className="py-2.5 px-3 text-center">75 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 24.000.000</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">TER Kategori C (PTKP K/3)</td>
                        <td className="py-2.5 px-3 text-center">3% - 25%</td>
                        <td className="py-2.5 px-3 text-center">30 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 12.500.000</td>
                      </tr>
                    </>
                  )}

                  {item.type === "bpjs_health" && (
                    <>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">Iuran Perusahaan (4%)</td>
                        <td className="py-2.5 px-3 text-center">4.0%</td>
                        <td className="py-2.5 px-3 text-center">245 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 36.000.000</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">Iuran Karyawan (1%)</td>
                        <td className="py-2.5 px-3 text-center">1.0%</td>
                        <td className="py-2.5 px-3 text-center">245 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 9.000.000</td>
                      </tr>
                    </>
                  )}

                  {item.type === "bpjs_employment" && (
                    <>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">Jaminan Hari Tua (JHT - 3.7% / 2%)</td>
                        <td className="py-2.5 px-3 text-center">5.7%</td>
                        <td className="py-2.5 px-3 text-center">245 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 22.800.000</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">Jaminan Pensiun (JP - 2% / 1%)</td>
                        <td className="py-2.5 px-3 text-center">3.0%</td>
                        <td className="py-2.5 px-3 text-center">245 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 12.000.000</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">Jaminan Kecelakaan Kerja (JKK)</td>
                        <td className="py-2.5 px-3 text-center">0.24%</td>
                        <td className="py-2.5 px-3 text-center">245 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 1.960.000</td>
                      </tr>
                      <tr className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-semibold">Jaminan Kematian (JKM)</td>
                        <td className="py-2.5 px-3 text-center">0.30%</td>
                        <td className="py-2.5 px-3 text-center">245 Karyawan</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums">Rp 2.450.000</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="cursor-pointer text-xs gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Ekspor CSV
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadReport}
              className="cursor-pointer text-xs gap-1.5 bg-primary text-primary-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh Laporan Resmi
            </Button>
          </div>

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

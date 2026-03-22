"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinanceClosingAnalysis } from "../hooks/use-finance-closing";
import { formatCurrency } from "@/lib/utils";
import type { FinancialClosingAnalysisResponse } from "../types";

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly closingId: string | null;
}

export function ClosingDetail({ open, onOpenChange, closingId }: Props) {
  const t = useTranslations("financeClosing");
  const tCommon = useTranslations("common");

  const { data, isLoading } = useFinanceClosingAnalysis(closingId ?? "", {
    enabled: open && !!closingId,
  });

  const analysis = data?.data as FinancialClosingAnalysisResponse | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle>{t("detail_title") || "Closing Analysis Detail"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="flex flex-col gap-2 px-4 py-4 border-b border-border">
              <p className="text-sm font-medium">
                {t("fields.periodEndDate")}: {analysis?.closing?.period_end_date ? new Date(analysis.closing.period_end_date).toISOString().slice(0, 10) : "-"}
              </p>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t("analysis.account_name") || "Nama Akun"}</TableHead>
                    <TableHead className="text-right">{t("analysis.closing_balance") || "Saldo Akhir Akun"}</TableHead>
                    <TableHead className="text-right">{t("analysis.opening_balance") || "Saldo Awal Tahun"}</TableHead>
                    <TableHead className="text-right">{t("analysis.difference") || "Selisih"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis?.rows?.map((row, idx) => (
                    <TableRow key={row.account_id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{row.account_code} - {row.account_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.closing_balance)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(row.opening_balance)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.difference !== 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {formatCurrency(row.difference)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(analysis?.rows?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {tCommon("empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

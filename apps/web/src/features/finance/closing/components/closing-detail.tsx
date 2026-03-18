"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinanceClosingAnalysis } from "../hooks/use-finance-closing";

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const analysis = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("detail_title") || "Closing Analysis Detail"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {t("fields.periodEndDate")}: {analysis?.closing?.period_end_date ? new Date(analysis.closing.period_end_date).toISOString().slice(0, 10) : "-"}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                    {analysis?.rows?.map((row: any, idx: number) => (
                      <TableRow key={row.account_id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{row.account_code} - {row.account_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.closing_balance)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.opening_balance)}</TableCell>
                        <TableCell className={`text-right font-semibold ${row.difference !== 0 ? 'text-primary' : 'text-muted-foreground'}`}>
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
              </CardContent>
            </Card>

            {analysis?.validations && analysis.validations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{t("validation.title") || "Validation"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.validations.map((v) => (
                      <li key={v.name} className="flex items-start gap-2">
                        <span className={v.passed ? "text-emerald-600" : "text-destructive"}>
                          {v.passed ? "✔" : "✖"}
                        </span>
                        <span className="text-sm">
                          <span className="font-medium">{t(`validation.${v.name}`) ?? v.name}</span>: {v.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis?.snapshot && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{t("snapshot.title") || "Snapshot"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">{t("snapshot.netProfit") || "Net Profit"}</div>
                      <div className="text-lg font-semibold">{formatCurrency(analysis.snapshot.net_profit)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{t("snapshot.retainedEarnings") || "Retained Earnings"}</div>
                      <div className="text-lg font-semibold">{formatCurrency(analysis.snapshot.retained_earnings_balance)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

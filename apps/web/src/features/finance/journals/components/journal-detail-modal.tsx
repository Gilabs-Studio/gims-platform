"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

import { useFinanceJournal } from "../hooks/use-finance-journals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string | null;
};

function safeDate(value?: string | null): string {
  if (!value) return "-";
  return formatDate(value) || value;
}

function formatNumber(value?: number | null): string {
  const v = typeof value === "number" ? value : 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function JournalDetailModal({ open, onOpenChange, id }: Props) {
  const t = useTranslations("financeJournals");
  const tCommon = useTranslations("common");

  const enabled = open && !!id;
  const query = useFinanceJournal(id ?? "", { enabled });

  const journal = query.data?.data;
  const lines = useMemo(() => journal?.lines ?? [], [journal?.lines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("actions.view")}</DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
        ) : !journal ? (
          <div className="text-center py-8 text-muted-foreground">-</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.entryDate")}</div>
                <div className="text-sm font-medium">{safeDate(journal.entry_date)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.status")}</div>
                <div className="text-sm font-medium">
                  <Badge variant={journal.status === "posted" ? "default" : "secondary"}>
                    {t(`status.${journal.status}`)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.description")}</div>
                <div className="text-sm font-medium">{journal.description ?? "-"}</div>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.account")}</TableHead>
                    <TableHead className="text-right">{t("fields.debit")}</TableHead>
                    <TableHead className="text-right">{t("fields.credit")}</TableHead>
                    <TableHead>{t("fields.memo")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        -
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((ln) => (
                      <TableRow key={ln.id}>
                        <TableCell>
                          {ln.chart_of_account?.code ?? "-"} - {ln.chart_of_account?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(ln.debit)}</TableCell>
                        <TableCell className="text-right">{formatNumber(ln.credit)}</TableCell>
                        <TableCell>{ln.memo ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.debit")}</div>
                <div className="text-sm font-medium">{formatNumber(journal.debit_total)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{t("fields.credit")}</div>
                <div className="text-sm font-medium">{formatNumber(journal.credit_total)}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

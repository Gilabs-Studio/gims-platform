"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ClipboardList, DollarSign } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

import { useCashBankJournalLines, useFinanceCashBankJournal } from "../hooks/use-finance-cash-bank";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return formatDate(d);
}

function getStatusBadge(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status?.toLowerCase() ?? "draft";
  switch (normalized) {
    case "posted":
    case "approved":
    case "confirmed":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <ClipboardList className="h-3 w-3 mr-1" />
          {t(`status.${status}`)}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {t(`status.${status}`)}
        </Badge>
      );
  }
}

export function CashBankJournalDetailDialog({
  open,
  onOpenChange,
  id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
}) {
  const t = useTranslations("financeCashBank");
  const detailQuery = useFinanceCashBankJournal(id ?? "", { enabled: open && !!id });

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);


  const lineQuery = useCashBankJournalLines(
    id ?? "",
    {
      page,
      per_page: perPage,
    },
    { enabled: open && !!id }
  );

  const item = detailQuery.data?.data;
  const lineRows = (lineQuery.data?.data?.lines ?? []) as {
    id: string;
    chart_of_account_name: string;
    debit: number;
    credit: number;
    memo: string;
  }[];
  const totalRows = lineQuery.data?.meta?.pagination?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("form.detailTitle")}</DialogTitle>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !item ? (
          <div className="py-10 text-center text-sm text-muted-foreground">-</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("form.headerSectionTitle")}</span>
                </div>
                <div>{getStatusBadge(item.status, t)}</div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.transactionDate")}</span>
                  <span>{safeDate(item.transaction_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.type")}</span>
                  <span>{t(`type.${item.type}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.description")}</span>
                  <span className="text-right">{item.description || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.bankAccount")}</span>
                  <span className="text-right">
                    {item.bank_account?.name ?? "-"}
                    {item.bank_account?.account_number ? (
                      <div className="text-xs text-muted-foreground">
                        {item.bank_account.account_number}
                      </div>
                    ) : null}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.totalAmount")}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(item.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("fields.postedAt")}</span>
                  <span>{safeDate(item.posted_at)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("form.linesSectionTitle")}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("form.linesSectionDescription")}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
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
                    {lineQuery.isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                          <TableCell>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : lineRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {t("form.emptyLines")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineRows.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell
                            className="max-w-[220px] truncate"
                            title={line.chart_of_account_name}
                          >
                            {line.chart_of_account_name}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(line.debit)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {formatCurrency(line.credit)}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate" title={line.memo}>
                            {line.memo || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalRows > 0 && (
                <div className="mt-4">
                  <DataTablePagination
                    pageIndex={page}
                    pageSize={perPage}
                    rowCount={totalRows}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPerPage(size);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => onOpenChange(false)} className="cursor-pointer">
                {t("form.cancel")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

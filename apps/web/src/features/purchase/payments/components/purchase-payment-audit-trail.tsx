"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { usePurchasePaymentAuditTrail } from "../hooks/use-purchase-payments";

function safeDateTime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

interface PurchasePaymentAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly paymentId?: string | null;
}

export function PurchasePaymentAuditTrail({ open, onClose, paymentId }: PurchasePaymentAuditTrailProps) {
  const t = useTranslations("purchasePayment");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, paymentId]);

  const { data, isLoading, isError } = usePurchasePaymentAuditTrail(
    paymentId ?? "",
    { page, per_page: pageSize },
    { enabled: open && !!paymentId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>

        {isError ? (
          <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("auditTrail.empty")}</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("auditTrail.columns.action")}</TableHead>
                    <TableHead>{t("auditTrail.columns.user")}</TableHead>
                    <TableHead>{t("auditTrail.columns.time")}</TableHead>
                    <TableHead>{t("auditTrail.columns.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.action}</TableCell>
                      <TableCell>{it.user?.email ?? "-"}</TableCell>
                      <TableCell>{safeDateTime(it.created_at)}</TableCell>
                      <TableCell className="max-w-[420px] truncate">
                        {JSON.stringify(it.metadata ?? {})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination ? (
              <DataTablePagination
                pageIndex={page}
                pageSize={pageSize}
                rowCount={pagination.total ?? 0}
                onPageChange={setPage}
                onPageSizeChange={(v) => {
                  setPageSize(v);
                  setPage(1);
                }}
              />
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

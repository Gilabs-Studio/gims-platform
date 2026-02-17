"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { useGoodsReceiptAuditTrail } from "../hooks/use-goods-receipts";

interface GoodsReceiptAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly goodsReceiptId?: string | null;
}

function safeDateTime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function actionLabel(t: (key: string) => string, rawAction: string): string {
  const key = rawAction.split(".").pop() ?? rawAction;
  const map: Record<string, string> = {
    create: "auditTrail.actions.create",
    update: "auditTrail.actions.update",
    delete: "auditTrail.actions.delete",
    confirm: "auditTrail.actions.confirm",
    export: "auditTrail.actions.export",
    read: "auditTrail.actions.view",
    audit_trail: "auditTrail.actions.auditTrail",
  };
  const i18nKey = map[key];
  return i18nKey ? t(i18nKey) : rawAction;
}

type AuditChange = { field: string; before: unknown; after: unknown };

function extractChanges(metadata: Record<string, unknown> | null | undefined): AuditChange[] {
  if (!metadata) return [];
  const before = metadata.before;
  const after = metadata.after;
  if (!isPlainObject(before) || !isPlainObject(after)) return [];

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  return keys
    .map((k) => ({ field: k, before: before[k], after: after[k] }))
    .filter(({ before: b, after: a }) => {
      try {
        return JSON.stringify(b) !== JSON.stringify(a);
      } catch {
        return String(b) !== String(a);
      }
    });
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function GoodsReceiptAuditTrail({ open, onClose, goodsReceiptId }: GoodsReceiptAuditTrailProps) {
  const t = useTranslations("goodsReceipt");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useGoodsReceiptAuditTrail(
    goodsReceiptId ?? "",
    { page, per_page: pageSize },
    { enabled: open && !!goodsReceiptId },
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
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>

        {isError ? (
          <div className="text-center py-8 text-destructive">{tCommon("error")}</div>
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
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-36" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-64" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {t("auditTrail.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-0.5">
                            <div>{actionLabel(t, it.action)}</div>
                            <div className="text-xs text-muted-foreground">{it.action}</div>
                          </div>
                        </TableCell>
                        <TableCell>{it.user?.email ?? "-"}</TableCell>
                        <TableCell>{safeDateTime(it.created_at)}</TableCell>
                        <TableCell className="max-w-[520px]">
                          {(() => {
                            const changes = extractChanges(it.metadata);
                            if (changes.length === 0) {
                              return <div className="text-xs text-muted-foreground">-</div>;
                            }

                            const shown = changes.slice(0, 8);
                            return (
                              <div className="max-h-[240px] overflow-auto pr-2">
                                <div className="space-y-1 text-xs">
                                  {shown.map((c) => (
                                    <div key={c.field} className="break-words">
                                      <span className="font-medium">{c.field}</span>
                                      <span className="text-muted-foreground">: </span>
                                      <span className="text-muted-foreground">{formatAuditValue(c.before)}</span>
                                      <span className="text-muted-foreground"> → </span>
                                      <span className="text-muted-foreground">{formatAuditValue(c.after)}</span>
                                    </div>
                                  ))}
                                  {changes.length > shown.length ? (
                                    <div className="text-xs text-muted-foreground">
                                      +{changes.length - shown.length} more
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination ? (
              <DataTablePagination
                pageIndex={pagination.page}
                pageSize={pagination.per_page}
                rowCount={pagination.total}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
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

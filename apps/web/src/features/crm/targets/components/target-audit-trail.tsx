"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useYearlyTargetAuditTrail } from "../hooks/use-targets";

interface TargetAuditTrailContentProps {
  readonly targetId?: string | null;
  readonly enabled?: boolean;
}

function safeDateTime(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function actionLabel(t: (key: string) => string, rawAction: string): string {
  const key = rawAction.split(".").pop() ?? rawAction;
  const map: Record<string, string> = {
    create: "auditTrail.actions.create",
    update: "auditTrail.actions.update",
    delete: "auditTrail.actions.delete",
    read: "auditTrail.actions.view",
    audit_trail: "auditTrail.actions.auditTrail",
  };
  const i18nKey = map[key];
  return i18nKey ? t(i18nKey) : rawAction;
}

export function TargetAuditTrailContent({ targetId, enabled = true }: TargetAuditTrailContentProps) {
  const t = useTranslations("targets");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useYearlyTargetAuditTrail(
    targetId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!targetId }
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  if (isError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("auditTrail.columns.action")}</TableHead>
              <TableHead>{t("auditTrail.columns.user")}</TableHead>
              <TableHead>{t("auditTrail.columns.time")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
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
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}

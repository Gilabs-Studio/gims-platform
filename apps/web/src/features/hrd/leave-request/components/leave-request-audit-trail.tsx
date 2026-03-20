"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
import { useLeaveRequestAuditTrail } from "../hooks/use-leave-requests";

interface LeaveRequestAuditTrailContentProps {
  readonly leaveRequestId?: string | null;
  readonly enabled?: boolean;
}

function safeDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
    approve: "auditTrail.actions.approve",
    reject: "auditTrail.actions.reject",
    cancel: "auditTrail.actions.cancel",
    reapprove: "auditTrail.actions.reapprove",
    read: "auditTrail.actions.view",
    audit_trail: "auditTrail.actions.auditTrail",
  };
  const i18nKey = map[key];
  return i18nKey ? t(i18nKey) : rawAction;
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type AuditChange = { field: string; before: unknown; after: unknown };

function extractChanges(metadata: Record<string, unknown> | null | undefined): AuditChange[] {
  if (!metadata) return [];
  const before = metadata.before;
  const after = metadata.after;
  if (!isPlainObject(before) || !isPlainObject(after)) return [];

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  return keys
    .map((field) => ({ field, before: before[field], after: after[field] }))
    .filter(({ before: left, after: right }) => {
      try {
        return JSON.stringify(left) !== JSON.stringify(right);
      } catch {
        return String(left) !== String(right);
      }
    });
}

export function LeaveRequestAuditTrailContent({
  leaveRequestId,
  enabled = true,
}: LeaveRequestAuditTrailContentProps) {
  const t = useTranslations("leaveRequest");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useLeaveRequestAuditTrail(
    leaveRequestId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!leaveRequestId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  if (isError) {
    return <div className="py-8 text-center text-destructive">{tCommon("error")}</div>;
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
              <TableHead>{t("auditTrail.columns.details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t("auditTrail.empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-0.5">
                      <div>{actionLabel(t, entry.action)}</div>
                      <div className="text-xs text-muted-foreground">{entry.action}</div>
                    </div>
                  </TableCell>
                  <TableCell>{entry.user?.email ?? "-"}</TableCell>
                  <TableCell>{safeDateTime(entry.created_at)}</TableCell>
                  <TableCell className="max-w-[520px]">
                    {(() => {
                      const changes = extractChanges(entry.metadata);
                      if (changes.length === 0) {
                        return <div className="text-xs text-muted-foreground">-</div>;
                      }

                      const shown = changes.slice(0, 8);
                      return (
                        <div className="max-h-60 overflow-auto pr-2">
                          <div className="space-y-1 text-xs">
                            {shown.map((change) => (
                              <div key={change.field} className="wrap-break-word">
                                <span className="font-medium">{change.field}</span>
                                <span className="text-muted-foreground">: </span>
                                <span className="text-muted-foreground">{formatAuditValue(change.before)}</span>
                                <span className="text-muted-foreground">{" -> "}</span>
                                <span className="text-muted-foreground">{formatAuditValue(change.after)}</span>
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
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}

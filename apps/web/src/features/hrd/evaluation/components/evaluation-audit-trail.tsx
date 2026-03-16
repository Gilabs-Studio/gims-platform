"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useEmployeeEvaluationAuditTrail,
  useEvaluationGroupAuditTrail,
} from "../hooks/use-evaluations";
import type { EvaluationAuditTrailEntry } from "../types";

interface AuditTrailTableProps {
  readonly items: EvaluationAuditTrailEntry[];
  readonly isLoading: boolean;
}

interface EvaluationAuditTrailContentProps {
  readonly evaluationId?: string | null;
  readonly enabled?: boolean;
}

interface EvaluationGroupAuditTrailContentProps {
  readonly groupId?: string | null;
  readonly enabled?: boolean;
}

function safeDateTime(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getActionLabel(t: ReturnType<typeof useTranslations>, rawAction: string): string {
  const key = rawAction.split(".").pop() ?? rawAction;
  const map: Record<string, string> = {
    create: "auditTrail.actions.create",
    update: "auditTrail.actions.update",
    delete: "auditTrail.actions.delete",
    submit: "auditTrail.actions.submit",
    review: "auditTrail.actions.review",
    finalize: "auditTrail.actions.finalize",
    read: "auditTrail.actions.view",
    audit_trail: "auditTrail.actions.auditTrail",
  };

  const translationKey = map[key];
  return translationKey ? t(translationKey) : rawAction;
}

function extractChanges(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return [] as Array<{ field: string; before: unknown; after: unknown }>;

  const before = metadata.before;
  const after = metadata.after;
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return [];
  }

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

function AuditTrailTable({ items, isLoading }: AuditTrailTableProps) {
  const t = useTranslations("evaluation");

  return (
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
            items.map((entry) => {
              const changes = extractChanges(entry.metadata);

              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium align-top">
                    <div className="space-y-0.5">
                      <div>{getActionLabel(t, entry.action)}</div>
                      <div className="text-xs text-muted-foreground">{entry.action}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-0.5">
                      <div>{entry.user?.name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{entry.user?.email ?? "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">{safeDateTime(entry.created_at)}</TableCell>
                  <TableCell className="max-w-[520px] align-top">
                    {changes.length === 0 ? (
                      <div className="text-xs text-muted-foreground">-</div>
                    ) : (
                      <div className="max-h-60 space-y-1 overflow-auto pr-2 text-xs">
                        {changes.slice(0, 8).map((change) => (
                          <div key={change.field} className="wrap-break-word">
                            <span className="font-medium">{change.field}</span>
                            <span className="text-muted-foreground">: </span>
                            <span className="text-muted-foreground">{formatAuditValue(change.before)}</span>
                            <span className="text-muted-foreground"> {"->"} </span>
                            <span className="text-muted-foreground">{formatAuditValue(change.after)}</span>
                          </div>
                        ))}
                        {changes.length > 8 ? (
                          <div className="text-muted-foreground">+{changes.length - 8} more</div>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function EvaluationGroupAuditTrailContent({
  groupId,
  enabled = true,
}: EvaluationGroupAuditTrailContentProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useEvaluationGroupAuditTrail(
    groupId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!groupId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <div className="space-y-4">
      <AuditTrailTable items={items} isLoading={isLoading} />
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

export function EmployeeEvaluationAuditTrailContent({
  evaluationId,
  enabled = true,
}: EvaluationAuditTrailContentProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useEmployeeEvaluationAuditTrail(
    evaluationId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!evaluationId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <div className="space-y-4">
      <AuditTrailTable items={items} isLoading={isLoading} />
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
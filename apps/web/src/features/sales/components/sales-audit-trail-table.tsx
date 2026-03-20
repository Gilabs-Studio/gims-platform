"use client";

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

export interface SalesAuditTrailUser {
  id?: string;
  name?: string;
  email?: string;
}

export interface SalesAuditTrailEntry {
  id: string;
  action: string;
  permission_code?: string;
  metadata?: Record<string, unknown> | null;
  user?: SalesAuditTrailUser | null;
  created_at: string;
}

export interface SalesAuditTrailPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SalesAuditTrailApiResponse {
  success: boolean;
  data: SalesAuditTrailEntry[];
  meta?: {
    pagination?: SalesAuditTrailPagination;
  };
  error?: string;
}

export interface SalesAuditTrailLabels {
  empty: string;
  columns: {
    action: string;
    user: string;
    time: string;
    details: string;
  };
}

interface SalesAuditTrailTableProps {
  readonly entries: SalesAuditTrailEntry[];
  readonly labels: SalesAuditTrailLabels;
  readonly isLoading?: boolean;
  readonly errorText?: string;
  readonly pagination?: SalesAuditTrailPagination;
  readonly onPageChange?: (page: number) => void;
  readonly onPageSizeChange?: (pageSize: number) => void;
}

interface FallbackAuditEvent {
  id: string;
  action: string;
  at?: string | null;
  user?: string | null;
  metadata?: Record<string, unknown> | null;
  permissionCode?: string;
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

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderMetadataSummary(metadata?: Record<string, unknown> | null): string {
  if (!metadata) return "-";

  const before = metadata.before;
  const after = metadata.after;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    const changed = keys
      .map((key) => {
        const previous = before[key];
        const next = after[key];

        try {
          if (JSON.stringify(previous) === JSON.stringify(next)) {
            return null;
          }
        } catch {
          if (String(previous) === String(next)) {
            return null;
          }
        }

        return `${key}: ${formatValue(previous)} -> ${formatValue(next)}`;
      })
      .filter((item): item is string => !!item);

    if (changed.length > 0) {
      return changed.slice(0, 4).join("; ");
    }
  }

  const beforeStatusRaw = metadata.before_status ?? metadata.beforeStatus;
  const afterStatusRaw = metadata.after_status ?? metadata.afterStatus;
  const beforeStatus = typeof beforeStatusRaw === "string" ? beforeStatusRaw : "";
  const afterStatus = typeof afterStatusRaw === "string" ? afterStatusRaw : "";
  if (beforeStatus || afterStatus) {
    const transition = beforeStatus && afterStatus
      ? `status: ${beforeStatus} -> ${afterStatus}`
      : `status: ${afterStatus || beforeStatus}`;

    const reason = metadata.reason;
    if (typeof reason === "string" && reason.trim().length > 0) {
      return `${transition}; reason: ${reason}`;
    }

    return transition;
  }

  const status = metadata.status;
  if (typeof status === "string" && status.length > 0) {
    return `status: ${status}`;
  }

  const details = metadata.details;
  if (typeof details === "string" && details.length > 0) {
    return details;
  }

  return formatValue(metadata);
}

function actionLabel(action: string): string {
  const normalized = (action ?? "").trim();
  if (!normalized) return "-";

  const key = normalized.split(".").pop() ?? normalized;
  return key
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function buildFallbackAuditTrailEntries(events: FallbackAuditEvent[]): SalesAuditTrailEntry[] {
  return events
    .filter((event) => !!event.at)
    .map((event) => ({
      id: event.id,
      action: event.action,
      permission_code: event.permissionCode,
      metadata: event.metadata,
      user: event.user
        ? {
            name: event.user,
            email: event.user,
          }
        : null,
      created_at: event.at as string,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function SalesAuditTrailTable({
  entries,
  labels,
  isLoading = false,
  errorText,
  pagination,
  onPageChange,
  onPageSizeChange,
}: SalesAuditTrailTableProps) {
  if (errorText && entries.length === 0 && !isLoading) {
    return <div className="text-center py-8 text-destructive">{errorText}</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{labels.empty}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.columns.action}</TableHead>
              <TableHead>{labels.columns.user}</TableHead>
              <TableHead>{labels.columns.time}</TableHead>
              <TableHead>{labels.columns.details}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium text-xs">{actionLabel(entry.action)}</TableCell>
                <TableCell className="text-sm">
                  {entry.user?.name ?? entry.user?.email ?? "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {safeDateTime(entry.created_at)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[420px] whitespace-normal wrap-break-word">
                  {renderMetadataSummary(entry.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && onPageChange && onPageSizeChange ? (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}

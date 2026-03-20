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

interface MetadataEntry {
  key: string;
  value: string;
}

interface MetadataSummary {
  heading?: string;
  entries?: MetadataEntry[];
  plain?: string;
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

function prettifyKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isUuidString(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function shouldHideMetadataKey(key: string): boolean {
  return /(^id$|_id$|request_id$|created_by$|updated_by$|deleted_by$)/i.test(key);
}

function formatMetadataValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (/(amount|total|subtotal|price|cost|tax|discount|paid|remaining)/i.test(key)) {
      return new Intl.NumberFormat("id-ID").format(value);
    }
    return String(value);
  }

  if (typeof value === "string") {
    if (isUuidString(value)) {
      return "-";
    }

    if (/status/i.test(key)) {
      return value
        .replace(/[_-]+/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    if (/(date|_at)$/.test(key) || /(date| at)$/i.test(key)) {
      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleString();
      }
    }
    return value;
  }

  return formatValue(value);
}

function toMetadataEntries(snapshot: Record<string, unknown>): MetadataEntry[] {
  const keys = Object.keys(snapshot).filter((key) => !shouldHideMetadataKey(key));
  if (keys.length === 0) {
    return [];
  }

  const prioritizedKeys = [
    "code",
    "status",
    "customer_name",
    "total_amount",
    "amount",
    "order_date",
    "invoice_date",
    "due_date",
  ];

  const sortedKeys = keys.sort((a, b) => {
    const aIndex = prioritizedKeys.indexOf(a);
    const bIndex = prioritizedKeys.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return sortedKeys
    .slice(0, 7)
    .map((key) => ({
      key: prettifyKey(key),
      value: formatMetadataValue(key, snapshot[key]),
    }))
    .filter((entry) => entry.value !== "-");
}

function renderMetadataSummary(metadata?: Record<string, unknown> | null): MetadataSummary {
  if (!metadata) return { plain: "-" };

  const before = metadata.before;
  const after = metadata.after;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter((key) => !shouldHideMetadataKey(key))
      .sort();

    const changed = keys
      .map((key): MetadataEntry | null => {
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

        return {
          key: prettifyKey(key),
          value: `${formatMetadataValue(key, previous)} -> ${formatMetadataValue(key, next)}`,
        };
      })
      .filter((item): item is MetadataEntry => !!item)
      .filter((entry) => !entry.value.includes("- -> -"));

    if (changed.length > 0) {
      return {
        heading: "Changes",
        entries: changed.slice(0, 5),
      };
    }
  }

  if (isPlainObject(after)) {
    const entries = toMetadataEntries(after);
    if (entries.length > 0) {
      return {
        heading: "After",
        entries,
      };
    }
  }

  if (isPlainObject(before)) {
    const entries = toMetadataEntries(before);
    if (entries.length > 0) {
      return {
        heading: "Before",
        entries,
      };
    }
  }

  const beforeStatusRaw = metadata.before_status ?? metadata.beforeStatus;
  const afterStatusRaw = metadata.after_status ?? metadata.afterStatus;
  const beforeStatus = typeof beforeStatusRaw === "string" ? beforeStatusRaw : "";
  const afterStatus = typeof afterStatusRaw === "string" ? afterStatusRaw : "";
  if (beforeStatus || afterStatus) {
    const entries: MetadataEntry[] = [];

    if (beforeStatus && afterStatus) {
      entries.push({
        key: "Status",
        value: `${formatMetadataValue("status", beforeStatus)} -> ${formatMetadataValue("status", afterStatus)}`,
      });
    } else {
      entries.push({
        key: "Status",
        value: formatMetadataValue("status", afterStatus || beforeStatus),
      });
    }

    const reason = metadata.reason;
    if (typeof reason === "string" && reason.trim().length > 0) {
      entries.push({
        key: "Reason",
        value: reason,
      });
    }

    return {
      heading: "Status Update",
      entries,
    };
  }

  const status = metadata.status;
  if (typeof status === "string" && status.length > 0) {
    return {
      heading: "Status",
      entries: [{
        key: "Status",
        value: formatMetadataValue("status", status),
      }],
    };
  }

  const details = metadata.details;
  if (typeof details === "string" && details.length > 0) {
    return { plain: details };
  }

  return { plain: formatValue(metadata) };
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
                  {(() => {
                    const summary = renderMetadataSummary(entry.metadata);

                    if (summary.plain) {
                      return summary.plain;
                    }

                    const entries = summary.entries ?? [];
                    if (entries.length === 0) {
                      return "-";
                    }

                    return (
                      <div className="space-y-1 leading-relaxed">
                        {summary.heading ? (
                          <p className="font-medium text-foreground">{summary.heading}</p>
                        ) : null}
                        {entries.map((item) => (
                          <p key={`${item.key}-${item.value}`}>
                            <span className="text-foreground/80">{item.key}:</span>{" "}
                            <span>{item.value}</span>
                          </p>
                        ))}
                      </div>
                    );
                  })()}
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

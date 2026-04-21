"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

import type { AgingBucketDefinition, AgingBuckets } from "../types";

export const defaultAgingBucketConfig: AgingBucketDefinition[] = [
  { key: "current", label: "Current", max_days: 0 },
  { key: "days_1_30", label: "1-30", min_days: 1, max_days: 30 },
  { key: "days_31_60", label: "31-60", min_days: 31, max_days: 60 },
  { key: "days_61_90", label: "61-90", min_days: 61, max_days: 90 },
  { key: "over_90", label: ">90", min_days: 91 },
];

function resolveBucketValue(buckets: AgingBuckets | undefined, key: string): number {
  if (!buckets) {
    return 0;
  }

  switch (key) {
    case "current":
      return buckets.current ?? 0;
    case "days_1_30":
      return buckets.days_1_30 ?? 0;
    case "days_31_60":
      return buckets.days_31_60 ?? 0;
    case "days_61_90":
      return buckets.days_61_90 ?? 0;
    case "over_90":
      return buckets.over_90 ?? 0;
    default:
      return buckets.dynamic?.[key] ?? 0;
  }
}

function bucketCellClass(key: string, bucketIndex: number, bucketCount: number): string {
  if (key === "current") {
    return "text-muted-foreground";
  }
  if (key === "over_90" || bucketIndex === bucketCount - 1) {
    return "text-destructive font-bold";
  }
  if (bucketIndex >= 2) {
    return "text-destructive font-medium";
  }
  return "text-warning/90 font-medium";
}

type AgingLeadColumn<Row> = {
  header: string;
  className?: string;
  render: (row: Row) => ReactNode;
};

type AgingTableProps<Row> = {
  rows: Row[];
  isLoading?: boolean;
  loadingRows?: number;
  noDataText: string;
  rowKey: (row: Row) => string;
  leadColumns: AgingLeadColumn<Row>[];
  getBuckets: (row: Row) => AgingBuckets | undefined;
  getRemaining: (row: Row) => number;
  remainingHeader: string;
  bucketConfig?: AgingBucketDefinition[];
  actionHeader?: string;
  renderAction?: (row: Row) => ReactNode;
};

export function AgingTable<Row>({
  rows,
  isLoading = false,
  loadingRows = 5,
  noDataText,
  rowKey,
  leadColumns,
  getBuckets,
  getRemaining,
  remainingHeader,
  bucketConfig,
  actionHeader,
  renderAction,
}: AgingTableProps<Row>) {
  const resolvedBuckets = bucketConfig && bucketConfig.length > 0 ? bucketConfig : defaultAgingBucketConfig;
  const hasActions = typeof renderAction === "function";
  const colSpan = leadColumns.length + 1 + resolvedBuckets.length + (hasActions ? 1 : 0);

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {leadColumns.map((column) => (
              <TableHead key={column.header} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            <TableHead className="text-right">{remainingHeader}</TableHead>
            {resolvedBuckets.map((bucket) => (
              <TableHead key={bucket.key} className="text-right">
                {bucket.label}
              </TableHead>
            ))}
            {hasActions ? <TableHead className="text-center">{actionHeader ?? "Action"}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: loadingRows }).map((_, index) => (
                <TableRow key={`aging-skeleton-${index}`}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : rows.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                    {noDataText}
                  </TableCell>
                </TableRow>
                )
              : rows.map((row) => {
                  const buckets = getBuckets(row);

                  return (
                    <TableRow key={rowKey(row)}>
                      {leadColumns.map((column) => (
                        <TableCell key={`${rowKey(row)}-${column.header}`} className={column.className}>
                          {column.render(row)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium">{formatCurrency(getRemaining(row))}</TableCell>
                      {resolvedBuckets.map((bucket, bucketIndex) => (
                        <TableCell
                          key={`${rowKey(row)}-bucket-${bucket.key}`}
                          className={cn("text-right", bucketCellClass(bucket.key, bucketIndex, resolvedBuckets.length))}
                        >
                          {formatCurrency(resolveBucketValue(buckets, bucket.key))}
                        </TableCell>
                      ))}
                      {hasActions ? <TableCell className="text-center">{renderAction(row)}</TableCell> : null}
                    </TableRow>
                  );
                })}
        </TableBody>
      </Table>
    </div>
  );
}

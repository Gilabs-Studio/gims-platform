import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, ExternalLink, FileText, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { resolveSourceRoute } from "@/features/finance/shared/reference-source-matrix";

import { ReferenceBadge } from "./reference-badge";
import { ReferenceCodeLink } from "./reference-code-link";
import type {
  JournalReferenceTypeBadgeMeta,
  JournalTableColumn,
  JournalTableColumnKey,
  UnifiedJournalRow,
} from "./types";

interface JournalTableProps<T = unknown> {
  isLoading: boolean;
  data: UnifiedJournalRow<T>[];
  columns?: JournalTableColumn[];
  showBankAccountColumn?: boolean;
  rowStartNumber?: number;
  referenceTooltipText?: string;
  onReferenceClick?: (row: UnifiedJournalRow<T>) => void;
  canReferenceClick?: (row: UnifiedJournalRow<T>) => boolean;
  actionRender?: (row: UnifiedJournalRow<T>) => React.ReactNode;
}

const DEFAULT_COLUMNS: JournalTableColumn[] = [
  { key: "number", label: "No" },
  { key: "journalType", label: "Journal Type" },
  { key: "description", label: "Description" },
  { key: "referenceType", label: "Ref Type" },
  { key: "reference", label: "Ref Code" },
  { key: "entryDate", label: "Entry Date" },
  { key: "debit", label: "Debit" },
  { key: "credit", label: "Credit" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

// Task 5: Manual generation logic removed as reference_code is now provided by API.

function getReferenceSourceMeta(type: string | null): JournalReferenceTypeBadgeMeta {
  if (!type) {
    return {
      label: "Unknown",
      title: "Unknown Source",
      variant: "inactive" as const,
    };
  }

  const value = type.toUpperCase();
  const compact = value.replace(/[^A-Z0-9]/g, "");

  if (compact === "SALESPAYMENT") {
    return {
      label: "Payment SO",
      title: "Sales Order Payment",
      variant: "success" as const,
    };
  }
  if (compact === "PURCHASEPAYMENT") {
    return {
      label: "Payment PO",
      title: "Purchase Order Payment",
      variant: "secondary" as const,
    };
  }
  if (compact === "SALESINVOICE") {
    return {
      label: "Invoice SO",
      title: "Sales Invoice",
      variant: "info" as const,
    };
  }
  if (compact === "SALESINVOICEDP") {
    return {
      label: "Invoice DP SO",
      title: "Sales Down Payment Invoice",
      variant: "soft" as const,
    };
  }
  if (compact === "SUPPLIERINVOICE") {
    return {
      label: "Invoice PO",
      title: "Supplier Invoice",
      variant: "info" as const,
    };
  }
  if (compact === "SUPPLIERINVOICEDP") {
    return {
      label: "Invoice DP PO",
      title: "Supplier Down Payment Invoice",
      variant: "soft" as const,
    };
  }
  if (compact === "PAYMENT") {
    return {
      label: "Payment Finance",
      title: "Finance Payment",
      variant: "success" as const,
    };
  }
  if (compact === "DO" || compact.includes("DELIVERY")) {
    return {
      label: "Delivery SO",
      title: "Delivery Order",
      variant: "outline" as const,
    };
  }
  if (compact.includes("GOODSRECEIPT")) {
    return {
      label: "Receipt PO",
      title: "Goods Receipt",
      variant: "outline" as const,
    };
  }
  if (
    compact === "CASHIN" ||
    compact === "CASHOUT" ||
    compact === "TRANSFER" ||
    compact === "CASHBANK" ||
    compact === "CB" ||
    compact === "TRF"
  ) {
    return {
      label: compact === "TRF" || compact === "TRANSFER" ? "Transfer Bank" : "Cash/Bank",
      title: "Cash & Bank Transaction",
      variant: "secondary" as const,
    };
  }
  if (compact.includes("ADJUST") || compact === "CORRECTION") {
    return {
      label: "Adjustment",
      title: "Adjustment Journal",
      variant: "warning" as const,
    };
  }
  if (compact.includes("VALUATION") || compact.includes("REVALUATION") || compact.includes("COST")) {
    return {
      label: "Valuation",
      title: "Valuation Journal",
      variant: "outline" as const,
    };
  }

  return {
    label: value,
    title: value,
    variant: "outline" as const,
  };
}

function getReferenceBadge(type: string | null) {
  return getReferenceSourceMeta(type);
}

export function getSourceHref(
  referenceType?: string | null,
  referenceID?: string | null,
): string | undefined {
  return resolveSourceRoute(referenceType, referenceID);
}

export function mapJournalToUnifiedRow<
  T extends {
    id: string;
    entry_date?: string | Date;
    description?: string | null;
    source?: string | null;
    reference_type?: string | null;
    reference_id?: string | null;
    reference_code?: string | null;
    status?: string;
    debit_total?: number;
    credit_total?: number;
    is_system_generated?: boolean;
    created_at?: string | Date;
    updated_at?: string | Date;
  },
>(item: T): UnifiedJournalRow<T> {
  const entryDate = item.entry_date instanceof Date
    ? item.entry_date.toISOString()
    : (item.entry_date ?? "");
  const createdAt = item.created_at instanceof Date
    ? item.created_at.toISOString()
    : (item.created_at ?? undefined);
  const updatedAt = item.updated_at instanceof Date
    ? item.updated_at.toISOString()
    : (item.updated_at ?? undefined);

  return {
    id: item.id,
    entryDate,
    description: item.description ?? null,
    journalType: item.source ?? item.reference_type ?? null,
    referenceType: item.reference_type ?? null,
    referenceTypeBadge: getReferenceBadge(item.reference_type ?? null),
    referenceId: item.reference_id ?? null,
    referenceCode: item.reference_code ?? null,
    status: item.status ?? "draft",
    debit: item.debit_total ?? 0,
    credit: item.credit_total ?? 0,
    isSystemGenerated: item.is_system_generated ?? false,
    createdAt,
    updatedAt,
    detailHref: `/finance/journal-entries/${item.id}`,
    sourceHref: getSourceHref(item.reference_type, item.reference_id),
    original: item,
  };
}

export function mapCashBankToUnifiedRow<
  T extends {
    id: string;
    transaction_date: string | Date;
    description?: string | null;
    type: string;
    transaction_type?: string;
    reference_type?: string;
    reference_id?: string;
    reference_code?: string;
    bank_account?: { name: string; account_number: string } | null;
    status: string;
    total_amount: number;
    created_at?: string | Date;
    updated_at?: string | Date;
  },
>(item: T): UnifiedJournalRow<T> {
  const entryDate = item.transaction_date instanceof Date
    ? item.transaction_date.toISOString()
    : item.transaction_date;
  const createdAt = item.created_at instanceof Date
    ? item.created_at.toISOString()
    : (item.created_at ?? undefined);
  const updatedAt = item.updated_at instanceof Date
    ? item.updated_at.toISOString()
    : (item.updated_at ?? undefined);
  const transactionType = (item.transaction_type ?? item.type).toLowerCase();

  const debit = transactionType === "cash_in" ? item.total_amount : 0;
  const credit = transactionType === "cash_in" ? 0 : item.total_amount;

  return {
    id: item.id,
    entryDate,
    description: item.description ?? null,
    journalType: "cash_bank",
    referenceType: item.reference_type ?? item.type.toUpperCase(),
    referenceTypeBadge: getReferenceBadge(item.reference_type ?? item.type.toUpperCase()),
    referenceId: item.reference_id ?? item.id,
    referenceCode: item.reference_code ?? null,
    transactionType,
    bankAccountName: item.bank_account?.name ?? null,
    isSystemGenerated: true,
    status: item.status,
    debit,
    credit,
    createdAt,
    updatedAt,
    detailHref: `/finance/cash-bank/${item.id}`,
    original: item,
  };
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM dd, yyyy");
}

function safeDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM dd, yyyy HH:mm");
}

function renderCell<T>(
  key: JournalTableColumnKey,
  row: UnifiedJournalRow<T>,
  index: number,
  rowStartNumber: number,
  referenceTooltipText: string,
  onReferenceClick?: (row: UnifiedJournalRow<T>) => void,
  canReferenceClick?: (row: UnifiedJournalRow<T>) => boolean,
  actionRender?: (row: UnifiedJournalRow<T>) => React.ReactNode,
) {
  if (key === "number") {
    return (
      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
        {rowStartNumber + index}
      </TableCell>
    );
  }

  if (key === "description") {
    return (
      <TableCell>
        <span className="text-sm font-medium truncate" title={row.description ?? ""}>
          {row.description ?? "-"}
        </span>
      </TableCell>
    );
  }

  if (key === "journalType") {
    const value = row.journalType ?? "-";
    return (
      <TableCell>
        <Badge variant="outline" className="text-xs uppercase">
          {value}
        </Badge>
      </TableCell>
    );
  }

  if (key === "referenceType") {
    const badge = row.referenceTypeBadge ?? getReferenceBadge(row.referenceType);
    return (
      <TableCell>
        <Badge variant={badge.variant} className="font-mono text-xs uppercase" title={badge.title}>
          {badge.label}
        </Badge>
      </TableCell>
    );
  }

  if (key === "reference") {
    return (
      <TableCell>
        <ReferenceCodeLink
          row={row}
          referenceTooltipText={referenceTooltipText}
          onReferenceClick={onReferenceClick}
          canReferenceClick={canReferenceClick}
        />
      </TableCell>
    );
  }

  if (key === "bankAccount") {
    return <TableCell>{row.bankAccountName ?? "-"}</TableCell>;
  }

  if (key === "entryDate") {
    return <TableCell className="tabular-nums text-sm">{safeDate(row.entryDate)}</TableCell>;
  }

  if (key === "debit") {
    return (
      <TableCell className="text-right font-mono text-emerald-500 tabular-nums">
        {row.debit > 0 ? formatCurrency(row.debit) : "-"}
      </TableCell>
    );
  }

  if (key === "credit") {
    return (
      <TableCell className="text-right font-mono text-rose-500 tabular-nums">
        {row.credit > 0 ? formatCurrency(row.credit) : "-"}
      </TableCell>
    );
  }

  if (key === "status") {
    return (
      <TableCell>
        {row.status.toLowerCase() === "posted" ? (
          <Badge variant="success" className="text-xs uppercase flex items-center w-fit gap-1">
            <Lock className="h-3 w-3" />
            Posted
          </Badge>
        ) : row.status.toLowerCase() === "draft" ? (
          <Badge variant="secondary" className="text-xs uppercase">Draft</Badge>
        ) : row.status.toLowerCase() === "reversed" ? (
          <Badge variant="destructive" className="text-xs uppercase">Reversed</Badge>
        ) : (
          <Badge variant="outline" className="text-xs uppercase">{row.status}</Badge>
        )}
      </TableCell>
    );
  }

  if (key === "createdAt") {
    return <TableCell className="tabular-nums text-xs text-muted-foreground">{safeDateTime(row.createdAt)}</TableCell>;
  }

  if (key === "updatedAt") {
    return <TableCell className="tabular-nums text-xs text-muted-foreground">{safeDateTime(row.updatedAt)}</TableCell>;
  }

  if (key === "action") {
    return (
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {actionRender ? (
            actionRender(row)
          ) : row.detailHref ? (
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href={row.detailHref}>
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">View details</span>
              </Link>
            </Button>
          ) : null}
        </div>
      </TableCell>
    );
  }

  return <TableCell>-</TableCell>;
}

export function JournalTable<T = unknown>({
  isLoading,
  data,
  columns = DEFAULT_COLUMNS,
  showBankAccountColumn = false,
  rowStartNumber = 1,
  referenceTooltipText = "Click to view detail",
  onReferenceClick,
  canReferenceClick,
  actionRender,
}: JournalTableProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const activeColumns = showBankAccountColumn
    ? columns.reduce<JournalTableColumn[]>((acc, column) => {
        acc.push(column);
        if (column.key === "reference" && !acc.some((it) => it.key === "bankAccount")) {
          acc.push({ key: "bankAccount", label: "Bank Account" });
        }
        return acc;
      }, [])
    : columns;

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {activeColumns.map((column) => {
              const isRight = column.key === "number" || column.key === "debit" || column.key === "credit" || column.key === "action";
              return (
                <TableHead key={column.key} className={isRight ? "text-right" : undefined}>
                  {column.label}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell colSpan={activeColumns.length} className="p-3">
                  <Skeleton className="h-12 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={activeColumns.length} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                  <p>No journal entries found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              const isExpanded = expandedIds.has(row.id);
              return (
                <React.Fragment key={row.id}>
                  <TableRow className="hover:bg-muted/50 transition-colors">
                    {activeColumns.map((column) => {
                      if (column.key === "number") {
                        return (
                          <TableCell key="number" className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              {((row.original as any)?.lines?.length > 0) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={() => toggleExpand(row.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                              <span>{rowStartNumber + index}</span>
                            </div>
                          </TableCell>
                        );
                      }
                      return (
                        <FragmentCell
                          key={`${row.id}-${column.key}`}
                          content={renderCell(
                            column.key,
                            row,
                            index,
                            rowStartNumber,
                            referenceTooltipText,
                            onReferenceClick,
                            canReferenceClick,
                            actionRender,
                          )}
                        />
                      );
                    })}
                  </TableRow>
                  {isExpanded && row.original && (row.original as any).lines && (
                    <TableRow className="bg-muted/30 border-b-0">
                      <TableCell colSpan={activeColumns.length} className="p-0">
                        <div className="px-12 py-3">
                          <Table className="border rounded-md bg-background">
                            <TableHeader className="bg-muted/50">
                              <TableRow className="hover:bg-transparent h-8">
                                <TableHead className="text-[10px] uppercase font-bold py-1">Account</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold py-1 text-right">Debit</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold py-1 text-right">Credit</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold py-1">Memo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(row.original as any).lines.map((ln: any) => (
                                <TableRow key={ln.id} className="hover:bg-muted/50 h-8">
                                  <TableCell className="py-1 text-xs">
                                    <span className="font-medium">{ln.chart_of_account?.code ?? "-"}</span>
                                    <span className="mx-2 text-muted-foreground">|</span>
                                    <span>{ln.chart_of_account?.name ?? "-"}</span>
                                  </TableCell>
                                  <TableCell className="py-1 text-right text-xs tabular-nums font-mono text-emerald-600">
                                    {ln.debit > 0 ? formatCurrency(ln.debit) : "-"}
                                  </TableCell>
                                  <TableCell className="py-1 text-right text-xs tabular-nums font-mono text-rose-600">
                                    {ln.credit > 0 ? formatCurrency(ln.credit) : "-"}
                                  </TableCell>
                                  <TableCell className="py-1 text-xs text-muted-foreground italic">
                                    {ln.memo || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FragmentCell({ content }: { content: React.ReactNode }) {
  return <>{content}</>;
}

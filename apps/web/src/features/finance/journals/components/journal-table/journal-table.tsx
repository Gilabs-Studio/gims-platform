import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink, FileText, Lock } from "lucide-react";

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

function buildReferenceCode(referenceType?: string | null, referenceID?: string | null): string | null {
  const rawType = (referenceType ?? "").trim().toUpperCase();
  const compact = rawType.replace(/[^A-Z0-9]/g, "");
  if (!rawType) return null;

  let prefix = "REF";
  if (compact.includes("SALESINVOICE")) {
    prefix = "INV";
  } else if (compact.includes("SUPPLIERINVOICE")) {
    prefix = "PINV";
  } else if (compact.includes("PAYMENT")) {
    prefix = "PAY";
  } else if (compact.includes("CASHBANK")) {
    prefix = "CB";
  } else if (compact.includes("ADJUST")) {
    prefix = "ADJ";
  } else if (compact.includes("VALUATION")) {
    prefix = "VAL";
  } else if (rawType.length >= 3) {
    prefix = rawType.slice(0, 3);
  }

  const source = (referenceID ?? "").trim();
  const short = source ? source.split("-")[0].toUpperCase().slice(0, 10) : "N/A";
  return `${prefix}-${short}`;
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
    referenceId: item.reference_id ?? null,
    referenceCode: item.reference_code ?? buildReferenceCode(item.reference_type, item.reference_id),
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
    referenceId: item.reference_id ?? item.id,
    referenceCode: item.reference_code ?? `CB-${item.id.slice(0, 8).toUpperCase()}`,
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
    return (
      <TableCell>
        <ReferenceBadge referenceType={row.referenceType} />
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
            data.map((row, index) => (
              <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                {activeColumns.map((column) => (
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
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function FragmentCell({ content }: { content: React.ReactNode }) {
  return <>{content}</>;
}

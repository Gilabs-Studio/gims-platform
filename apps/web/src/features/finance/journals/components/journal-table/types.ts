export type JournalReferenceTypeBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "active"
  | "inactive"
  | "soft"
  | "dot";

export interface JournalReferenceTypeBadgeMeta {
  label: string;
  title: string;
  variant: JournalReferenceTypeBadgeVariant;
}

export interface UnifiedJournalRow<T = unknown> {
  id: string;
  entryDate: string;
  description: string | null;
  journalType?: string | null;
  referenceType: string | null;
  referenceTypeBadge?: JournalReferenceTypeBadgeMeta | null;
  referenceId: string | null;
  referenceCode?: string | null;
  transactionType?: string | null;
  bankAccountName?: string | null;
  isSystemGenerated?: boolean;
  status: string;
  debit: number;
  credit: number;
  createdAt?: string;
  updatedAt?: string;
  detailHref?: string;
  sourceHref?: string;
  original: T;
}

export type JournalTableColumnKey =
  | "number"
  | "journalType"
  | "reference"
  | "description"
  | "referenceType"
  | "bankAccount"
  | "entryDate"
  | "debit"
  | "credit"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "action";

export type JournalTableColumn = {
  key: JournalTableColumnKey;
  label: string;
};

"use client";

/**
 * Enterprise alias for the polymorphic source-transaction preview used from journal tables.
 * Renders read-only detail UIs (payment, DO, GR, invoice, etc.) based on reference_type.
 */
export {
  JournalSourceDetailModal as TransactionModal,
  canResolveJournalSourceDetail as canResolveTransactionSource,
} from "./journal-source-detail-modal";

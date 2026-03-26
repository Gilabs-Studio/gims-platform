"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuditTrailTable } from "@/components/ui/audit-trail-table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useGoodsReceiptAuditTrail } from "../hooks/use-goods-receipts";

interface GoodsReceiptAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly goodsReceiptId?: string | null;
}

interface GoodsReceiptAuditTrailTableProps {
  readonly enabled: boolean;
  readonly goodsReceiptId?: string | null;
}

function GoodsReceiptAuditTrailTable({ enabled, goodsReceiptId }: GoodsReceiptAuditTrailTableProps) {
  const t = useTranslations("goodsReceipt");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = useGoodsReceiptAuditTrail(
    goodsReceiptId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!goodsReceiptId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return (
    <AuditTrailTable
      entries={items}
      isLoading={isLoading && items.length === 0}
      errorText={isError && items.length === 0 ? tCommon("error") : undefined}
      pagination={pagination}
      onPageChange={(p) => setPage(p)}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      labels={{
        empty: t("auditTrail.empty"),
        columns: {
          action: t("auditTrail.columns.action"),
          user: t("auditTrail.columns.user"),
          time: t("auditTrail.columns.time"),
          details: t("auditTrail.columns.details"),
        },
      }}
    />
  );
}

interface GoodsReceiptAuditTrailContentProps {
  readonly enabled: boolean;
  readonly goodsReceiptId: string;
}

/**
 * Inline audit trail content — used inside the tabbed detail dialog.
 * Renders the audit table directly without its own Dialog wrapper.
 */
export function GoodsReceiptAuditTrailContent({ enabled, goodsReceiptId }: GoodsReceiptAuditTrailContentProps) {
  return <GoodsReceiptAuditTrailTable enabled={enabled} goodsReceiptId={goodsReceiptId} />;
}

export function GoodsReceiptAuditTrail({ open, onClose, goodsReceiptId }: GoodsReceiptAuditTrailProps) {
  const t = useTranslations("goodsReceipt");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>
        <GoodsReceiptAuditTrailTable enabled={open} goodsReceiptId={goodsReceiptId} />
      </DialogContent>
    </Dialog>
  );
}

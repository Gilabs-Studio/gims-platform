"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AuditTrailTable, buildFallbackAuditTrailEntries } from "@/components/ui/audit-trail-table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { usePurchaseRequisitionAuditTrail } from "../hooks/use-purchase-requisitions";

interface PurchaseRequisitionAuditTrailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly requisitionId?: string | null;
}

interface PurchaseRequisitionAuditTrailContentProps {
  readonly enabled: boolean;
  readonly requisitionId?: string | null;
  readonly fallbackEvents?: Array<{
    id: string;
    action: string;
    at?: string | null;
    user?: string | null;
    metadata?: Record<string, unknown> | null;
    permissionCode?: string;
  }>;
}

export function PurchaseRequisitionAuditTrailContent({
  enabled,
  requisitionId,
  fallbackEvents,
}: PurchaseRequisitionAuditTrailContentProps) {
  const t = useTranslations("purchaseRequisition");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError } = usePurchaseRequisitionAuditTrail(
    requisitionId ?? "",
    { page, per_page: pageSize },
    { enabled: enabled && !!requisitionId },
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const fallbackEntries = useMemo(
    () => buildFallbackAuditTrailEntries(fallbackEvents ?? []),
    [fallbackEvents],
  );
  const useServerAudit = items.length > 0;
  const entries = useServerAudit ? items : fallbackEntries;
  const effectivePagination = useServerAudit ? pagination : undefined;

  return (
    <AuditTrailTable
      entries={entries}
      isLoading={isLoading && entries.length === 0}
      errorText={isError && entries.length === 0 ? tCommon("error") : undefined}
      pagination={effectivePagination}
      onPageChange={useServerAudit ? (p) => setPage(p) : undefined}
      onPageSizeChange={useServerAudit ? (ps) => {
        setPageSize(ps);
        setPage(1);
      } : undefined}
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

export function PurchaseRequisitionAuditTrail({
  open,
  onClose,
  requisitionId,
}: PurchaseRequisitionAuditTrailProps) {
  const t = useTranslations("purchaseRequisition");
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("auditTrail.title")}</DialogTitle>
        </DialogHeader>
        <PurchaseRequisitionAuditTrailContent enabled={open} requisitionId={requisitionId} />
      </DialogContent>
    </Dialog>
  );
}

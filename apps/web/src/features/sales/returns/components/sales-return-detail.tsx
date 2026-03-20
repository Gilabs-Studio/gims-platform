"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDeliveryOrder } from "@/features/sales/delivery/hooks/use-deliveries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import type { SalesReturn } from "../types";
import { AuditTrailTable, buildFallbackAuditTrailEntries } from "@/components/ui/audit-trail-table";
import { useSalesReturnAuditTrail } from "../hooks/use-sales-returns";

interface SalesReturnDetailProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item?: SalesReturn | null;
}

export function SalesReturnDetail({ open, onOpenChange, item }: SalesReturnDetailProps) {
  const t = useTranslations("salesReturns");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const data = item ?? null;
  const { data: deliveryResponse } = useDeliveryOrder(data?.delivery_id ?? "", {
    enabled: open && !!data?.delivery_id,
  });
  const delivery = deliveryResponse?.data;
  const { data: auditData, isFetching: auditLoading, isError: auditError } = useSalesReturnAuditTrail(
    data?.id ?? "",
    { page: auditPage, per_page: auditPageSize },
    { enabled: open && !!data?.id },
  );
  const fallbackAuditEntries = useMemo(
    () =>
      !data
        ? []
        : buildFallbackAuditTrailEntries([
            {
              id: `${data.id}-created`,
              action: "sales_return.create",
              at: data.created_at,
              metadata: {
                details: `Created sales return ${data.return_number}`,
              },
            },
            {
              id: `${data.id}-updated`,
              action: "sales_return.update",
              at: data.updated_at,
              metadata:
                data.updated_at && data.updated_at !== data.created_at
                  ? { details: "Sales return data updated" }
                  : null,
            },
            {
              id: `${data.id}-status`,
              action: "sales_return.status",
              at: data.updated_at,
              metadata: {
                status: data.status,
              },
            },
          ]),
    [data],
  );
  const useServerAudit = (auditData?.data?.length ?? 0) > 0;
  const auditEntries = useServerAudit ? auditData?.data ?? [] : fallbackAuditEntries;
  const auditPagination = useServerAudit ? auditData?.meta?.pagination : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.return_number ?? t("detail.title")}</DialogTitle>
        </DialogHeader>

        {!data ? null : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="audit-trail">{t("tabs.auditTrail")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="py-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("detail.status")}</TableCell>
                      <TableCell><Badge>{data.status}</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.delivery")}</TableCell>
                      <TableCell>{delivery?.code ?? "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.salesOrder")}</TableCell>
                      <TableCell>{delivery?.sales_order?.code ?? "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.action")}</TableCell>
                      <TableCell>{data.action}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.amount")}</TableCell>
                      <TableCell>{formatCurrency(data.total_amount ?? 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("detail.createdAt")}</TableCell>
                      <TableCell>{formatDate(data.created_at)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="audit-trail" className="py-4">
              <AuditTrailTable
                entries={auditEntries}
                isLoading={auditLoading && auditEntries.length === 0}
                errorText={auditError && auditEntries.length === 0 ? t("common.error") : undefined}
                pagination={auditPagination}
                onPageChange={useServerAudit ? setAuditPage : undefined}
                onPageSizeChange={
                  useServerAudit
                    ? (newSize) => {
                        setAuditPageSize(newSize);
                        setAuditPage(1);
                      }
                    : undefined
                }
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
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

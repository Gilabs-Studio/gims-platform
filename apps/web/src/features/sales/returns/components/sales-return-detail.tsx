"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDeliveryOrder } from "@/features/sales/delivery/hooks/use-deliveries";
import { DeliveryDetailModal } from "@/features/sales/delivery/components/delivery-detail-modal";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { SalesReturn } from "../types";
import type { DeliveryOrder } from "@/features/sales/delivery/types";
import type { SalesOrder } from "@/features/sales/order/types";
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
  const [selectedDO, setSelectedDO] = useState<DeliveryOrder | null>(null);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);

  const canViewDO = useUserPermission("delivery_order.read");
  const canViewSO = useUserPermission("sales_order.read");
  const canViewCustomer = useUserPermission("customer.read");

  const data = item ?? null;
  const { data: deliveryResponse } = useDeliveryOrder(data?.delivery_id ?? "", {
    enabled: open && !!data?.delivery_id,
  });
  const delivery = deliveryResponse?.data;

  const productMap = useMemo(() => {
    const map = new Map<string, { code?: string; name?: string }>();
    (delivery?.items ?? []).forEach((di) => {
      if (di.product_id && di.product) {
        map.set(di.product_id, di.product);
      }
    });
    return map;
  }, [delivery?.items]);

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

  const customerName = delivery?.sales_order?.customer?.name ?? (data?.customer_id ? `Customer (${data.customer_id.substring(0, 8)})` : "-");
  const warehouseName = delivery?.warehouse?.name ?? (data?.warehouse_id ? `Warehouse (${data.warehouse_id.substring(0, 8)})` : "-");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{data?.return_number ?? t("detail.title")}</DialogTitle>
          </DialogHeader>

          {!data ? null : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">Items ({data.items?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="audit-trail">{t("tabs.auditTrail")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="py-4 space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("detail.status")}</TableCell>
                        <TableCell><Badge>{data.status}</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.delivery")}</TableCell>
                        <TableCell>
                          {delivery?.code ? (
                            canViewDO ? (
                              <button
                                onClick={() => setSelectedDO(delivery as DeliveryOrder)}
                                className="font-medium text-primary hover:underline cursor-pointer text-left"
                              >
                                {delivery.code}
                              </button>
                            ) : (
                              <span>{delivery.code}</span>
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.salesOrder")}</TableCell>
                        <TableCell>
                          {delivery?.sales_order?.code ? (
                            canViewSO ? (
                              <button
                                onClick={() => setSelectedSO({ id: delivery.sales_order!.id, code: delivery.sales_order!.code } as SalesOrder)}
                                className="font-medium text-primary hover:underline cursor-pointer text-left"
                              >
                                {delivery.sales_order.code}
                              </button>
                            ) : (
                              <span>{delivery.sales_order.code}</span>
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Customer</TableCell>
                        <TableCell>
                          {delivery?.sales_order?.customer?.id && canViewCustomer ? (
                            <button
                              onClick={() => setIsCustomerOpen(true)}
                              className="font-medium text-primary hover:underline cursor-pointer text-left"
                            >
                              {customerName}
                            </button>
                          ) : (
                            <span>{customerName}</span>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Warehouse</TableCell>
                        <TableCell>{warehouseName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.action")}</TableCell>
                        <TableCell>{data.action}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Reason</TableCell>
                        <TableCell>{data.reason}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.amount")}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(data.total_amount ?? 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("detail.createdAt")}</TableCell>
                        <TableCell>{formatDate(data.created_at)}</TableCell>
                      </TableRow>
                      {data.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Notes</TableCell>
                          <TableCell className="whitespace-pre-wrap">{data.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="items" className="py-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!data.items || data.items.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            No return items available
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.items.map((item, idx) => {
                          const prod = productMap.get(item.product_id);
                          const prodLabel = prod
                            ? `${prod.code ? prod.code + " - " : ""}${prod.name ?? item.product_id}`
                            : (item.product_id ? `Product (${item.product_id.substring(0, 8)})` : "-");

                          return (
                            <TableRow key={item.id || idx}>
                              <TableCell className="font-medium">{prodLabel}</TableCell>
                              <TableCell><Badge variant="outline">{item.condition}</Badge></TableCell>
                              <TableCell className="text-right">{item.qty}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
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

      {selectedDO && (
        <DeliveryDetailModal
          open={!!selectedDO}
          onClose={() => setSelectedDO(null)}
          delivery={selectedDO}
        />
      )}

      {selectedSO && (
        <OrderDetailModal
          open={!!selectedSO}
          onClose={() => setSelectedSO(null)}
          order={selectedSO}
        />
      )}

      {delivery?.sales_order?.customer?.id && (
        <CustomerDetailModal
          open={isCustomerOpen}
          onOpenChange={setIsCustomerOpen}
          customerId={delivery.sales_order.customer.id}
        />
      )}
    </>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  ExternalLink,
  Package,
  ShoppingCart,
} from "lucide-react";
import { format, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PageMotion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPermission } from "@/hooks/use-user-permission";
import { PurchaseOrderDetail } from "@/features/purchase/orders/components/purchase-order-detail";
import { PurchaseOrderStatusBadge } from "@/features/purchase/orders/components/purchase-order-status-badge";
import { GoodsReceiptStatusBadge } from "@/features/purchase/goods-receipt/components/goods-receipt-status-badge";
import { SupplierInvoiceStatusBadge } from "@/features/purchase/supplier-invoices/components/supplier-invoice-status-badge";
import { GRLinkedDialog } from "@/features/purchase/orders/components/gr-linked-dialog";
import { SILinkedDialog } from "@/features/purchase/orders/components/si-linked-dialog";
import { usePurchaseOrders } from "@/features/purchase/orders/hooks/use-purchase-orders";
import { QuotationProductDetailModal } from "@/features/sales/quotation/components/quotation-product-detail-modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSupplierDetail } from "../hooks/use-supplier-detail";
import type { PurchaseOrderListItem } from "@/features/purchase/orders/types";

interface SupplierDetailPageProps {
  readonly supplierId: string;
}

export function SupplierDetailPage({ supplierId }: SupplierDetailPageProps) {
  const t = useTranslations("supplierResearchReport.detail");
  const router = useRouter();

  const defaultStart = useMemo(() => format(subYears(new Date(), 1), "yyyy-MM-dd"), []);
  const defaultEnd = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [grDialogItem, setGrDialogItem] = useState<PurchaseOrderListItem | null>(null);
  const [siDialogItem, setSiDialogItem] = useState<PurchaseOrderListItem | null>(null);

  const canViewPurchaseOrder = useUserPermission("purchase_order.read");
  const canViewProduct = useUserPermission("product.read");
  const canViewGR = useUserPermission("goods_receipt.read");
  const canViewSI = useUserPermission("supplier_invoice.read");

  const dateRange: DateRange | undefined = useMemo(
    () => ({
      from: new Date(startDate + "T00:00:00"),
      to: new Date(endDate + "T00:00:00"),
    }),
    [endDate, startDate]
  );

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, "yyyy-MM-dd"));
      setEndDate(range.to ? format(range.to, "yyyy-MM-dd") : defaultEnd);
      return;
    }

    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  };

  const { detail, isLoading } = useSupplierDetail(supplierId, startDate, endDate);

  const { data: purchaseOrdersData, isLoading: isOrdersLoading } = usePurchaseOrders({
    supplier_id: supplierId,
    per_page: 100,
    sort_by: "order_date",
    sort_dir: "desc",
  });

  const allPurchaseOrders = purchaseOrdersData?.data ?? [];
  const products = detail?.products ?? [];
  const activePurchaseOrders = allPurchaseOrders.filter((po) => {
    const normalized = (po.status ?? "").toUpperCase();
    return normalized === "SUBMITTED" || normalized === "APPROVED";
  });

  const handleOpenPurchaseOrder = (purchaseOrderId: string) => {
    if (!canViewPurchaseOrder) {
      toast.error(t("orders.noPermission"));
      return;
    }

    setSelectedPurchaseOrderId(purchaseOrderId);
    setIsPurchaseOrderModalOpen(true);
  };

  const handleOpenProduct = (productId: string) => {
    if (!canViewProduct) {
      toast.error(t("products.noPermission"));
      return;
    }

    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  if (isLoading) {
    return (
      <PageMotion className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </PageMotion>
    );
  }

  if (!detail) {
    return (
      <PageMotion className="space-y-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/reports/supplier-research")}
          className="inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
          {t("notFound")}
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/reports/supplier-research")}
            className="cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{detail.supplier_name}</h1>
            <p className="text-sm text-muted-foreground">{detail.supplier_code ?? "-"}</p>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <DateRangePicker dateRange={dateRange} onDateChange={handleDateRangeChange} />
        </div>
      </div>

      {activePurchaseOrders.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-semibold text-warning">
              {t("orders.activeAlert", { count: activePurchaseOrders.length })}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activePurchaseOrders.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => handleOpenPurchaseOrder(po.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-warning/30 bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-3 w-3" />
                  {po.code}
                  <PurchaseOrderStatusBadge status={po.status} className="h-4 px-1 text-[10px]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("totalPurchaseValue")}
          value={formatCurrency(detail.total_purchase_value)}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label={t("totalPurchaseOrders")}
          value={detail.total_purchase_orders.toLocaleString("id-ID")}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label={t("averageLeadTime")}
          value={`${detail.average_lead_time_days.toFixed(2)} ${t("days")}`}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label={t("dependencyScore")}
          value={`${detail.dependency_score.toFixed(2)}%`}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="cursor-pointer">
            <Package className="mr-2 h-4 w-4" />
            {t("tabs.products")}
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="cursor-pointer">
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t("orders.title")}
            {activePurchaseOrders.length > 0 ? (
              <Badge variant="destructive" className="ml-2 h-4 min-w-4 px-1 text-xs">
                {activePurchaseOrders.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">{t("products.title")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("products.description")}</p>
            </div>

            <div className="overflow-x-auto">
              {products.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t("products.empty")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("products.columns.product")}</TableHead>
                      <TableHead>{t("products.columns.code")}</TableHead>
                      <TableHead className="text-right">{t("products.columns.totalQty")}</TableHead>
                      <TableHead className="text-right">{t("products.columns.totalOrders")}</TableHead>
                      <TableHead className="text-right">{t("products.columns.totalAmount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((item) => (
                      <TableRow key={`${item.product_id}-${item.product_code}`}>
                        <TableCell className="font-medium">
                          {item.product_id ? (
                            <button
                              type="button"
                              onClick={() => handleOpenProduct(item.product_id)}
                              className="cursor-pointer text-left text-primary hover:underline font-medium"
                            >
                              {item.product_name}
                            </button>
                          ) : (
                            item.product_name
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.product_code || "-"}</TableCell>
                        <TableCell className="text-right">{item.total_qty.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right">{item.total_orders.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-4">
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-medium">{t("orders.title")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("orders.description")}</p>
            </div>

            <div className="overflow-x-auto">
              {isOrdersLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : allPurchaseOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {t("orders.empty")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("orders.columns.code")}</TableHead>
                      <TableHead>{t("orders.columns.status")}</TableHead>
                      <TableHead>{t("orders.columns.orderDate")}</TableHead>
                      <TableHead>{t("orders.columns.fulfillment")}</TableHead>
                      <TableHead>{t("orders.columns.goodsReceipts")}</TableHead>
                      <TableHead>{t("orders.columns.supplierInvoices")}</TableHead>
                      <TableHead className="text-right">{t("orders.columns.totalAmount")}</TableHead>
                      <TableHead className="text-right">{t("orders.columns.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPurchaseOrders.map((po) => {
                      const status = (po.status ?? "").toUpperCase();
                      const isActive = status === "SUBMITTED" || status === "APPROVED";

                      return (
                        <TableRow
                          key={po.id}
                          className={isActive ? "bg-warning/5 hover:bg-warning/10" : undefined}
                        >
                          <TableCell className="font-medium">{po.code}</TableCell>
                          <TableCell>
                            <PurchaseOrderStatusBadge status={po.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {po.order_date ? formatDate(po.order_date, "id-ID") : "-"}
                          </TableCell>

                          <TableCell>
                            {po.fulfillment ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-xs">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {po.fulfillment.total_received}/{po.fulfillment.total_ordered}
                                  </span>
                                  <span className="text-muted-foreground">{t("orders.received")}</span>
                                </div>
                                {po.fulfillment.total_pending > 0 && (
                                  <span className="text-xs text-warning">
                                    {po.fulfillment.total_pending} {t("orders.pending")}
                                  </span>
                                )}
                                {po.fulfillment.total_remaining > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {po.fulfillment.total_remaining} {t("orders.remaining")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {po.goods_receipts && po.goods_receipts.length > 0 ? (
                              canViewGR ? (
                                <button
                                  type="button"
                                  onClick={() => setGrDialogItem(po)}
                                  className="cursor-pointer"
                                  title={`${po.goods_receipts.length} Goods Receipt(s)`}
                                >
                                  <span className="flex items-center gap-1">
                                    <GoodsReceiptStatusBadge
                                      status={po.goods_receipts[0].status}
                                      className="text-xs font-medium hover:opacity-80 transition-opacity"
                                    />
                                    {po.goods_receipts.length > 1 && (
                                      <span className="text-xs text-muted-foreground">+{po.goods_receipts.length - 1}</span>
                                    )}
                                  </span>
                                </button>
                              ) : (
                                <GoodsReceiptStatusBadge status={po.goods_receipts[0].status} className="text-xs font-medium" />
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {po.supplier_invoices && po.supplier_invoices.length > 0 ? (
                              canViewSI ? (
                                <button
                                  type="button"
                                  onClick={() => setSiDialogItem(po)}
                                  className="cursor-pointer"
                                  title={`${po.supplier_invoices.length} Supplier Invoice(s)`}
                                >
                                  <span className="flex items-center gap-1">
                                    <SupplierInvoiceStatusBadge
                                      status={po.supplier_invoices[0].status}
                                      className="text-xs font-medium hover:opacity-80 transition-opacity"
                                    />
                                    {po.supplier_invoices.length > 1 && (
                                      <span className="text-xs text-muted-foreground">+{po.supplier_invoices.length - 1}</span>
                                    )}
                                  </span>
                                </button>
                              ) : (
                                <SupplierInvoiceStatusBadge status={po.supplier_invoices[0].status} className="text-xs font-medium" />
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatCurrency(po.total_amount ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 cursor-pointer text-xs"
                              onClick={() => handleOpenPurchaseOrder(po.id)}
                            >
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              {t("orders.viewDetail")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PurchaseOrderDetail
        open={isPurchaseOrderModalOpen}
        onClose={() => setIsPurchaseOrderModalOpen(false)}
        purchaseOrderId={selectedPurchaseOrderId}
      />
      <QuotationProductDetailModal
        open={isProductModalOpen}
        productId={selectedProductId}
        onOpenChange={setIsProductModalOpen}
      />

      {grDialogItem && (
        <GRLinkedDialog
          purchaseOrderCode={grDialogItem.code}
          items={grDialogItem.goods_receipts ?? []}
          open={!!grDialogItem}
          onOpenChange={(open) => { if (!open) setGrDialogItem(null); }}
        />
      )}

      {siDialogItem && (
        <SILinkedDialog
          purchaseOrderCode={siDialogItem.code}
          purchaseOrderId={siDialogItem.id}
          open={!!siDialogItem}
          onOpenChange={(open) => { if (!open) setSiDialogItem(null); }}
        />
      )}
    </PageMotion>
  );
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly icon: ReactNode;
}

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

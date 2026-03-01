"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Download,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";

import {
  useApprovePurchaseOrder,
  useClosePurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useRejectPurchaseOrder,
  useSubmitPurchaseOrder,
} from "../hooks/use-purchase-orders";
import { purchaseOrdersService } from "../services/purchase-orders-service";
import type { PurchaseOrderListItem, PurchaseOrderStatus } from "../types";
import { GoodsReceiptStatusBadge } from "@/features/purchase/goods-receipt/components/goods-receipt-status-badge";
import { SupplierInvoiceStatusBadge } from "@/features/purchase/supplier-invoices/components/supplier-invoice-status-badge";
import { PurchaseRequisitionDetail } from "@/features/purchase/requisitions/components/purchase-requisition-detail";

import { GRLinkedDialog } from "./gr-linked-dialog";
import { SILinkedDialog } from "./si-linked-dialog";
import { PurchaseOrderDetail } from "./purchase-order-detail";
import { PurchaseOrderForm } from "./purchase-order-form";
import { PurchaseOrderStatusBadge } from "./purchase-order-status-badge";
import { PurchaseOrderPrintDialog } from "./purchase-order-print-dialog";
import { GoodsReceiptForm } from "@/features/purchase/goods-receipt/components/goods-receipt-form";
import { GoodsReceiptDetail } from "@/features/purchase/goods-receipt/components/goods-receipt-detail";

export function PurchaseOrdersList() {
  const t = useTranslations("purchaseOrder");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<PurchaseOrderListItem | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // Supplier detail dialog
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);

  // PR reference detail dialog
  const [selectedPRId, setSelectedPRId] = useState<string | null>(null);
  const [isPRDetailOpen, setIsPRDetailOpen] = useState(false);

  // GR linked list dialog
  const [grDialogItem, setGrDialogItem] = useState<PurchaseOrderListItem | null>(null);

  // Create GR shortcut from PO row
  const [grFormOpen, setGrFormOpen] = useState(false);
  const [grFormPOId, setGrFormPOId] = useState<string | null>(null);

  // GR detail opened after successful create
  const [grCreatedId, setGrCreatedId] = useState<string | null>(null);
  const [grCreatedDetailOpen, setGrCreatedDetailOpen] = useState(false);

  // SI linked list dialog
  const [siDialogItem, setSiDialogItem] = useState<PurchaseOrderListItem | null>(null);

  const canCreate = useUserPermission("purchase_order.create");
  const canEdit = useUserPermission("purchase_order.update");
  const canExport = useUserPermission("purchase_order.export");
  const canView = useUserPermission("purchase_order.read");
  const canSubmit = useUserPermission("purchase_order.submit");
  const canApprove = useUserPermission("purchase_order.approve");
  const canReject = useUserPermission("purchase_order.reject");
  const canClose = useUserPermission("purchase_order.close");
  const canDelete = useUserPermission("purchase_order.delete");
  const canPrint = useUserPermission("purchase_order.print");
  const canViewSupplier = useUserPermission("supplier.read");
  const canViewGR = useUserPermission("goods_receipt.read");
  const canViewSI = useUserPermission("supplier_invoice.read");
  const canViewPR = useUserPermission("purchase_requisition.read");
  const canCreateGR = useUserPermission("goods_receipt.create");

  const { data, isLoading, isError } = usePurchaseOrders({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: PurchaseOrderListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeletePurchaseOrder();
  const submitMutation = useSubmitPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const rejectMutation = useRejectPurchaseOrder();
  const closeMutation = useClosePurchaseOrder();

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {tCommon("error")}
      </div>
    );
  }

  const handleExport = async () => {
    try {
      const blob = await purchaseOrdersService.exportCsv({
        search: debouncedSearch || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
        limit: 10000,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "purchase_orders.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const handleView = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  /** Renders first GR status badge + received items count; clicking opens the GR linked list dialog. */
  const renderGRBadges = (it: PurchaseOrderListItem) => {
    const grItems = it.goods_receipts;
    if (!grItems?.length) return <span className="text-muted-foreground text-xs">—</span>;
    const totalReceived = it.fulfillment?.total_received ?? 0;
    return (
      <button
        type="button"
        onClick={canViewGR ? () => setGrDialogItem(it) : undefined}
        className={canViewGR ? "cursor-pointer" : "cursor-default"}
        title={`${grItems.length} Goods Receipt(s)`}
      >
        <span className="flex flex-col gap-0.5 items-start">
          <span className="flex items-center gap-1">
        <GoodsReceiptStatusBadge
          status={grItems[0].status}
          className="text-xs font-medium hover:opacity-80 transition-opacity"
        />
            {grItems.length > 1 && (
              <span className="text-xs text-muted-foreground">+{grItems.length - 1}</span>
            )}
          </span>
        </span>
      </button>
    );
  };

  /** Renders first SI status badge; clicking opens the SI linked list dialog. */
  const renderSIBadges = (it: PurchaseOrderListItem) => {
    const items = it.supplier_invoices;
    if (!items?.length) return <span className="text-muted-foreground text-xs">—</span>;
    return (
      <button
        type="button"
        onClick={canViewSI ? () => setSiDialogItem(it) : undefined}
        className={canViewSI ? "cursor-pointer" : "cursor-default"}
        title={`${items.length} Supplier Invoice(s)`}
      >
        <span className="flex items-center gap-1">
          <SupplierInvoiceStatusBadge
            status={items[0].status}
            className="text-xs font-medium hover:opacity-80 transition-opacity"
          />
          {items.length > 1 && (
            <span className="text-xs text-muted-foreground">+{items.length - 1}</span>
          )}
        </span>
      </button>
    );
  };

  const normalStatus = (it: PurchaseOrderListItem) => (it.status ?? "").toUpperCase();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as PurchaseOrderStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all") ?? "All Status"}</SelectItem>
            <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
            <SelectItem value="SUBMITTED">{t("status.submitted")}</SelectItem>
            <SelectItem value="APPROVED">{t("status.approved")}</SelectItem>
            <SelectItem value="REJECTED">{t("status.rejected")}</SelectItem>
            <SelectItem value="CLOSED">{t("status.closed")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {canExport && (
          <Button variant="outline" onClick={handleExport} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {t("actions.export")}
          </Button>
        )}

        {canCreate && (
          <Button
            onClick={() => {
              setFormMode("create");
              setEditingId(null);
              setFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.create")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.orderDate")}</TableHead>
              <TableHead>{t("columns.purchaseRequisition")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.fulfillment")}</TableHead>
              <TableHead>{t("columns.goodsReceipts")}</TableHead>
              <TableHead>{t("columns.supplierInvoices")}</TableHead>
              <TableHead className="text-right">{t("columns.total")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => {
                const status = normalStatus(it);
                const hasRowActions =
                  canView || canEdit || canSubmit || canApprove ||
                  canReject || canClose || canDelete || canPrint;

                return (
                  <TableRow key={it.id}>
                    {/* Code — clickable to detail */}
                    <TableCell
                      className="font-medium text-primary hover:underline cursor-pointer"
                      onClick={() => canView && handleView(it.id)}
                    >
                      {it.code}
                    </TableCell>

                    {/* Order Date */}
                    <TableCell>{formatDate(it.order_date)}</TableCell>

                    {/* PR Reference — clickable if permission */}
                    <TableCell>
                      {it.purchase_requisition ? (
                        canViewPR ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPRId(it.purchase_requisition!.id);
                              setIsPRDetailOpen(true);
                            }}
                            className="text-primary hover:underline cursor-pointer text-sm font-medium"
                          >
                            {it.purchase_requisition.code}
                          </button>
                        ) : (
                          <span className="text-sm font-medium">{it.purchase_requisition.code}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>

                    {/* Supplier — clickable if permission */}
                    <TableCell>
                      {it.supplier ? (
                        canViewSupplier ? (
                          <button
                            onClick={() => {
                              setSelectedSupplierId(it.supplier!.id);
                              setIsSupplierDialogOpen(true);
                            }}
                            className="text-primary hover:underline cursor-pointer text-left text-sm"
                          >
                            {it.supplier.name}
                          </button>
                        ) : (
                          <span className="text-sm">{it.supplier.name}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <PurchaseOrderStatusBadge status={it.status ?? ""} />
                    </TableCell>

                    {/* Fulfillment progress — only rendered for APPROVED POs */}
                    <TableCell>
                      {it.fulfillment ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-xs">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {it.fulfillment.total_received}/{it.fulfillment.total_ordered}
                            </span>
                            <span className="text-muted-foreground">{t("fulfillment.received")}</span>
                          </div>
                          {it.fulfillment.total_pending > 0 && (
                            <span className="text-xs text-warning">
                              {it.fulfillment.total_pending} {t("fulfillment.pending")}
                            </span>
                          )}
                          {it.fulfillment.total_remaining > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {it.fulfillment.total_remaining} {t("fulfillment.remaining")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Goods Receipts */}
                    <TableCell>{renderGRBadges(it)}</TableCell>

                    {/* Supplier Invoices */}
                    <TableCell>{renderSIBadges(it)}</TableCell>

                    {/* Total */}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(it.total_amount)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      {hasRowActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleView(it.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t("actions.view")}
                              </DropdownMenuItem>
                            )}

                            {canEdit && status === "DRAFT" && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setFormMode("edit");
                                  setEditingId(it.id);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                            )}

                            {canSubmit && status === "DRAFT" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-blue-600 focus:text-blue-600"
                                onClick={async () => {
                                  try {
                                    await submitMutation.mutateAsync(it.id);
                                    toast.success(t("toast.submitted"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {t("actions.submit")}
                              </DropdownMenuItem>
                            )}

                            {status === "SUBMITTED" && (
                              <>
                                {canApprove && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-green-600 focus:text-green-600"
                                    onClick={async () => {
                                      try {
                                        await approveMutation.mutateAsync(it.id);
                                        toast.success(t("toast.approved"));
                                      } catch {
                                        toast.error(t("toast.failed"));
                                      }
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {t("actions.approve")}
                                  </DropdownMenuItem>
                                )}
                                {canReject && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                    onClick={async () => {
                                      try {
                                        await rejectMutation.mutateAsync(it.id);
                                        toast.success(t("toast.rejected"));
                                      } catch {
                                        toast.error(t("toast.failed"));
                                      }
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t("actions.reject")}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {canClose && status === "APPROVED" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-orange-600 focus:text-orange-600"
                                onClick={async () => {
                                  try {
                                    await closeMutation.mutateAsync(it.id);
                                    toast.success(t("toast.closed"));
                                  } catch {
                                    toast.error(t("toast.failed"));
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.close")}
                              </DropdownMenuItem>
                            )}

                            {canCreateGR && status === "APPROVED" &&
                              (!it.fulfillment || it.fulfillment.total_remaining > 0) && (
                              <DropdownMenuItem
                                className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                onClick={() => {
                                  setGrFormPOId(it.id);
                                  setGrFormOpen(true);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                {t("actions.createGR")}
                              </DropdownMenuItem>
                            )}

                            {canPrint && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setPrintingId(it.id)}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {t("actions.print")}
                              </DropdownMenuItem>
                            )}

                            {canDelete && status === "DRAFT" && (
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeletingItem(it)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("actions.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      )}

      {/* ── Dialogs ─────────────────────────────────────────── */}

      <PurchaseOrderForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
          setFormMode("create");
        }}
        mode={formMode}
        purchaseOrderId={editingId}
      />

      <PurchaseOrderDetail
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailId(null);
        }}
        purchaseOrderId={detailId}
      />

      {/* Create GR shortcut — pre-fills the PO from the selected row */}
      <GoodsReceiptForm
        open={grFormOpen}
        onClose={() => {
          setGrFormOpen(false);
          setGrFormPOId(null);
        }}
        defaultPurchaseOrderId={grFormPOId}
        onCreated={(id) => {
          setGrCreatedId(id);
          setGrCreatedDetailOpen(true);
        }}
      />

      {/* GR detail dialog opened immediately after creation */}
      <GoodsReceiptDetail
        open={grCreatedDetailOpen}
        onClose={() => {
          setGrCreatedDetailOpen(false);
          setGrCreatedId(null);
        }}
        goodsReceiptId={grCreatedId}
      />

      {printingId && (
        <PurchaseOrderPrintDialog
          open={!!printingId}
          onClose={() => setPrintingId(null)}
          orderId={printingId}
        />
      )}


      <SupplierDetailModal
        open={isSupplierDialogOpen}
        onOpenChange={(open) => {
          setIsSupplierDialogOpen(open);
          if (!open) setSelectedSupplierId(null);
        }}
        supplierId={selectedSupplierId}
      />

      <PurchaseRequisitionDetail
        open={isPRDetailOpen}
        onClose={() => {
          setIsPRDetailOpen(false);
          setSelectedPRId(null);
        }}
        requisitionId={selectedPRId}
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
          items={siDialogItem.supplier_invoices ?? []}
          open={!!siDialogItem}
          onOpenChange={(open) => { if (!open) setSiDialogItem(null); }}
        />
      )}

      <DeleteDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        itemName={tCommon("purchaseOrder") || "purchase order"}
        onConfirm={async () => {
          if (!deletingItem) return;
          try {
            await deleteMutation.mutateAsync(deletingItem.id);
            toast.success(t("toast.deleted"));
          } catch {
            toast.error(t("toast.failed"));
          } finally {
            setDeletingItem(null);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

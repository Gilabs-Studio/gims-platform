"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Download,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
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

import {
  useConfirmPurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
} from "../hooks/use-purchase-orders";
import { purchaseOrdersService } from "../services/purchase-orders-service";
import type { PurchaseOrderListItem } from "../types";
import { PurchaseOrderAuditTrail } from "./purchase-order-audit-trail";
import { PurchaseOrderDetail } from "./purchase-order-detail";
import { PurchaseOrderForm } from "./purchase-order-form";
import { PurchaseOrderReviseDialog } from "./purchase-order-revise-dialog";
import { PurchaseOrderStatusBadge } from "./purchase-order-status-badge";

export function PurchaseOrdersList() {
  const t = useTranslations("purchaseOrder");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<PurchaseOrderListItem | null>(null);

  const canCreate = useUserPermission("purchase_order.create");
  const canEdit = useUserPermission("purchase_order.update");
  const canExport = useUserPermission("purchase_order.export");
  const canView = useUserPermission("purchase_order.read");
  const canAuditTrail = useUserPermission("purchase_order.audit_trail");
  const canConfirm = useUserPermission("purchase_order.confirm");
  const canRevise = useUserPermission("purchase_order.revise");
  const canDelete = useUserPermission("purchase_order.delete");

  const { data, isLoading, isError } = usePurchaseOrders({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    sort_by: "created_at",
    sort_dir: "desc",
  });

  const items: PurchaseOrderListItem[] = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const deleteMutation = useDeletePurchaseOrder();
  const confirmMutation = useConfirmPurchaseOrder();

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
              <TableHead className="w-[180px]">{t("columns.code")}</TableHead>
              <TableHead>{t("columns.orderDate")}</TableHead>
              <TableHead>{t("columns.supplier")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="text-right">{t("columns.total")}</TableHead>
              <TableHead>{t("columns.createdAt")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {tCommon("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => canView && handleView(it.id)}
                  >
                    {it.code}
                  </TableCell>
                  <TableCell>{formatDate(it.order_date)}</TableCell>
                  <TableCell className="font-medium">
                    {it.supplier?.name ?? "-"}
                  </TableCell>
                  <TableCell>
                    <PurchaseOrderStatusBadge status={it.status ?? ""} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(it.total_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(it.created_at)}</span>
                      <span className="text-xs text-muted-foreground">
                        {it.created_at ? new Date(it.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(canView || canAuditTrail || canEdit || canConfirm || canRevise || canDelete) && (
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

                          {canAuditTrail && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setAuditId(it.id);
                                setAuditOpen(true);
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              {t("actions.auditTrail")}
                            </DropdownMenuItem>
                          )}

                          {canEdit && ["draft", "revised"].includes((it.status ?? "").toLowerCase()) && (
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

                          {canConfirm && ["draft", "revised"].includes((it.status ?? "").toLowerCase()) && (
                            <DropdownMenuItem
                              className="cursor-pointer text-green-600 focus:text-green-600"
                              onClick={async () => {
                                try {
                                  await confirmMutation.mutateAsync(it.id);
                                  toast.success(t("toast.confirmed"));
                                } catch {
                                  toast.error(t("toast.failed"));
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.confirm")}
                            </DropdownMenuItem>
                          )}

                          {canRevise && ["draft", "approved"].includes((it.status ?? "").toLowerCase()) && (
                            <DropdownMenuItem
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                              onClick={() => {
                                setReviseId(it.id);
                                setReviseOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("actions.revise")}
                            </DropdownMenuItem>
                          )}

                          {canDelete && (it.status ?? "").toLowerCase() === "draft" && (
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
              ))
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

      <PurchaseOrderAuditTrail
        open={auditOpen}
        onClose={() => {
          setAuditOpen(false);
          setAuditId(null);
        }}
        purchaseOrderId={detailId || auditId}
      />

      <PurchaseOrderReviseDialog
        open={reviseOpen}
        onClose={() => {
          setReviseOpen(false);
          setReviseId(null);
        }}
        purchaseOrderId={reviseId}
      />

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

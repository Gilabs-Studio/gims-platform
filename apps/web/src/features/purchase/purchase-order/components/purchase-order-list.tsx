"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Table,
  LayoutGrid,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { SplitViewSidebar } from "@/components/ui/split-view/split-view-sidebar";
import { SplitViewContainer } from "@/components/ui/split-view/split-view-container";
import { PurchaseOrderDetailModal } from "./purchase-order-detail-modal";
import { PurchaseOrderForm } from "./purchase-order-form";
import { usePurchaseOrderList } from "../hooks/use-purchase-order-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PurchaseOrder } from "../types";
import { useTranslations } from "next-intl";
import type {
  CreatePurchaseOrderFormData,
  UpdatePurchaseOrderFormData,
} from "../schemas/purchase-order.schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PurchaseOrderList() {
  const {
    setPage,
    setPerPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    sortOrder,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingOrder,
    setEditingOrder,
    orders,
    pagination,
    editingOrderData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleConfirm,
    deletingOrderId,
    setDeletingOrderId,
    handleSortChange,
    deleteOrder,
    createOrder,
    updateOrder,
    confirmOrder,
  } = usePurchaseOrderList();

  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const [modalOrderId, setModalOrderId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "split">("split");
  const [selectedSplitOrderId, setSelectedSplitOrderId] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const hasManuallyToggledRef = useRef(false);
  const [isSplitSidebarOpen, setIsSplitSidebarOpen] = useState(() => !isMobile);

  useEffect(() => {
    if (!hasManuallyToggledRef.current) {
      const expected = !isMobile;
      startTransition(() => {
        setIsSplitSidebarOpen(expected);
      });
    }
    hasManuallyToggledRef.current = false;
  }, [isMobile]);

  const t = useTranslations("purchaseOrders.list");

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");
  const hasDetailPermission = useHasPermission("DETAIL");

  const handleViewOrder = (orderId: number) => {
    // For table view, open modal
    setModalOrderId(orderId);
  };

  const handleSplitOrderClick = (order: PurchaseOrder) => {
    // For split view, show in container
    setSelectedSplitOrderId(order.id);
    setViewingOrderId(order.id);
  };

  const getStatusBadge = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            {t("draft")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("approved")}
          </Badge>
        );
      case "REVISED":
        return (
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            {t("revised")}
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("closed")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Map orders to have string id for DataTable compatibility
  const ordersWithStringId = orders.map((o) => ({ ...o, id: o.id.toString() }));
  type OrderWithStringId = Omit<PurchaseOrder, "id"> & { id: string };

  const columns: Column<OrderWithStringId>[] = [
    {
      id: "code",
      header: t("code"),
      accessor: (row) => (
        <button
          onClick={() => handleViewOrder(parseInt(row.id))}
          className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
      sortable: true,
      sortKey: "code",
    },
    {
      id: "supplier",
      header: t("supplier"),
      accessor: (row) => row.supplier?.code ?? row.supplier?.name ?? "-",
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => getStatusBadge(row.status),
    },
    {
      id: "orderDate",
      header: t("orderDate"),
      accessor: (row) =>
        row.order_date
          ? new Date(row.order_date).toLocaleDateString()
          : "-",
      sortable: true,
      sortKey: "order_date",
    },
    {
      id: "totalAmount",
      header: t("totalAmount"),
      accessor: (row) => formatCurrency(row.total_amount ?? 0),
      sortable: true,
      sortKey: "total_amount",
    },
    {
      id: "actions",
      header: t("actions"),
      sticky: true,
      accessor: () => null,
      actions: [
        ...(hasViewPermission || hasDetailPermission
          ? [
              {
                label: t("view"),
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: OrderWithStringId) =>
                  handleViewOrder(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("confirm"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: OrderWithStringId) =>
                  handleConfirm(parseInt(row.id)),
                show: (row: OrderWithStringId) => row.status === "DRAFT",
                disabled: confirmOrder.isPending,
              },
            ]
          : []),
        ...(hasEditPermission
          ? [
              {
                label: t("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: OrderWithStringId) =>
                  setEditingOrder(parseInt(row.id)),
                show: (row: OrderWithStringId) => row.status === "DRAFT",
              },
            ]
          : []),
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: OrderWithStringId) =>
                  handleDeleteClick(parseInt(row.id)),
                show: (row: OrderWithStringId) => row.status === "DRAFT",
                variant: "destructive" as const,
              },
            ]
          : []),
      ],
    },
  ];

  if (!hasViewPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noPermission")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Header with Search and Actions */}
      {isMobile ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={t("filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
              <SelectItem value="DRAFT">{t("draft")}</SelectItem>
              <SelectItem value="APPROVED">{t("approved")}</SelectItem>
              <SelectItem value="REVISED">{t("revised")}</SelectItem>
              <SelectItem value="CLOSED">{t("closed")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "split" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("split")}
              className="flex-1 h-9 min-w-0"
            >
              <LayoutGrid className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("split")}</span>
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="flex-1 h-9 min-w-0"
            >
              <Table className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("table")}</span>
            </Button>
          </div>
          {hasCreatePermission && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="w-full h-9"
            >
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("addOrder")}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t("filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("draft")}</SelectItem>
                <SelectItem value="APPROVED">{t("approved")}</SelectItem>
                <SelectItem value="CLOSED">{t("closed")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-md p-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "split" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("split")}
                    className="h-8 min-w-0 overflow-hidden"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate min-w-0">{t("split")}</span>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 min-w-0 overflow-hidden"
                  >
                    <Table className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate min-w-0">{t("table")}</span>
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            {hasCreatePermission && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline ml-2">{t("addOrder")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addOrder")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Split View - Sidebar + Detail */}
      {viewMode === "split" && (
        <SplitViewContainer>
          <SplitViewSidebar
            items={orders}
            selectedItemId={selectedSplitOrderId}
            onItemClick={handleSplitOrderClick}
            renderItem={(order) => (
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={order.created_by?.avatar_url ?? order.created_by?.photo_profile}
                    alt={order.created_by?.name ?? "User"}
                  />
                  <AvatarFallback>
                    {order.created_by?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) ?? "PO"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium truncate cursor-pointer text-sm">
                      {order.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {order.supplier?.name ?? order.supplier?.code ?? "-"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(order.total_amount ?? 0)}
                    </span>
                  </div>
                  {order.created_by && (
                    <p className="text-xs text-muted-foreground truncate">
                      {order.created_by.name}
                    </p>
                  )}
                </div>
              </div>
            )}
            emptyMessage={t("empty")}
            title={t("title")}
            className="w-80 shrink-0"
            isOpen={isSplitSidebarOpen}
            onClose={
              isMobile
                ? () => {
                    hasManuallyToggledRef.current = true;
                    setIsSplitSidebarOpen(false);
                  }
                : undefined
            }
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            {viewingOrderId ? (
              <PurchaseOrderDetailModal
                orderId={viewingOrderId}
                open={!!viewingOrderId}
                onOpenChange={(open) => {
                  if (!open) {
                    setViewingOrderId(null);
                    setSelectedSplitOrderId(null);
                  }
                }}
                onOrderUpdated={() => {
                  // List will automatically refresh via query invalidation
                }}
                embedded={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("selectOrder")}</p>
              </div>
            )}
          </div>
        </SplitViewContainer>
      )}

      {/* Detail Modal (for table view) */}
      <PurchaseOrderDetailModal
        orderId={modalOrderId}
        open={!!modalOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setModalOrderId(null);
          }
        }}
        onOrderUpdated={() => {
          // List will automatically refresh via query invalidation
        }}
      />

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={ordersWithStringId}
          isLoading={isLoading}
          emptyMessage={t("empty")}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  per_page: pagination.limit,
                  total: pagination.total,
                  total_pages: Math.ceil(pagination.total / pagination.limit),
                  has_next: pagination.page * pagination.limit < pagination.total,
                  has_prev: pagination.page > 1,
                }
              : undefined
          }
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          perPageOptions={[10, 20, 50, 100]}
          sort={
            sortBy && sortOrder
              ? {
                  sort_by: sortBy,
                  sort_order: sortOrder,
                }
              : undefined
          }
          sortableColumns={sortableColumns}
          onSortChange={handleSortChange}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm
            onSubmit={async (data) => {
              await handleCreate(data as CreatePurchaseOrderFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createOrder.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingOrder && editingOrderData?.data && (
        <Dialog
          open={!!editingOrder}
          onOpenChange={(open) => !open && setEditingOrder(null)}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <PurchaseOrderForm
              order={editingOrderData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdatePurchaseOrderFormData);
              }}
              onCancel={() => setEditingOrder(null)}
              isLoading={updateOrder.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingOrderId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        description={
          deletingOrderId
            ? t("deleteDescriptionWithName", {
                code:
                  orders.find((o) => o.id === deletingOrderId)?.code ??
                  t("deleteDescription"),
              })
            : t("deleteDescription")
        }
        itemName="purchase order"
        isLoading={deleteOrder.isPending}
      />
    </div>
  );
}


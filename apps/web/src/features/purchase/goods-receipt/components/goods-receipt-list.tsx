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
  Clock,
  Table,
  LayoutGrid,
  Package,
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
import { GoodsReceiptForm } from "./goods-receipt-form";
import { GoodsReceiptDetailModal } from "./goods-receipt-detail-modal";
import { useGoodsReceiptList } from "../hooks/use-goods-receipt-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GoodsReceipt } from "../types";
import { useTranslations } from "next-intl";
import type {
  CreateGoodsReceiptFormData,
  UpdateGoodsReceiptFormData,
} from "../schemas/goods-receipt.schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function GoodsReceiptList() {
  const {
    setPage,
    setPerPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    sortBy,
    sortOrder,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingGoodsReceipt,
    setEditingGoodsReceipt,
    goodsReceipts,
    pagination,
    editingGoodsReceiptData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleConfirm,
    deletingGoodsReceiptId,
    setDeletingGoodsReceiptId,
    handleSortChange,
    deleteGoodsReceipt,
    createGoodsReceipt,
    updateGoodsReceipt,
    confirmGoodsReceipt,
  } = useGoodsReceiptList();

  const [viewingGoodsReceiptId, setViewingGoodsReceiptId] = useState<number | null>(null);
  const [modalGoodsReceiptId, setModalGoodsReceiptId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "split">("split");
  const [selectedSplitGoodsReceiptId, setSelectedSplitGoodsReceiptId] = useState<number | null>(null);
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

  const t = useTranslations("goodsReceipts.list");

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const handleViewGoodsReceipt = (goodsReceiptId: number) => {
    setModalGoodsReceiptId(goodsReceiptId);
    setIsDetailModalOpen(true);
  };

  const handleSplitGoodsReceiptClick = (goodsReceipt: GoodsReceipt) => {
    setSelectedSplitGoodsReceiptId(goodsReceipt.id);
    setViewingGoodsReceiptId(goodsReceipt.id);
  };

  const getStatusBadge = (status: GoodsReceipt["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("pending")}
          </Badge>
        );
      case "RECEIVED":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("received")}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline">
            <Package className="h-3 w-3 mr-1" />
            {t("partial")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Map goods receipts to have string id for DataTable compatibility
  const goodsReceiptsWithStringId = goodsReceipts.map((r) => ({ ...r, id: r.id.toString() }));
  type GoodsReceiptWithStringId = Omit<GoodsReceipt, "id"> & { id: string };

  const columns: Column<GoodsReceiptWithStringId>[] = [
    {
      id: "code",
      header: t("code"),
      accessor: (row) => (
        <button
          onClick={() => handleViewGoodsReceipt(parseInt(row.id))}
          className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer"
        >
          {row.code}
        </button>
      ),
      sortable: true,
      sortKey: "code",
    },
    {
      id: "purchase_order",
      header: t("purchaseOrder"),
      accessor: (row) => row.purchase_order?.code ?? "-",
    },
    {
      id: "warehouse",
      header: t("warehouse"),
      accessor: (row) => row.warehouse?.name ?? "-",
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => getStatusBadge(row.status),
    },
    {
      id: "receiptDate",
      header: t("receiptDate"),
      accessor: (row) =>
        row.receipt_date
          ? new Date(row.receipt_date).toLocaleDateString()
          : "-",
      sortable: true,
      sortKey: "receipt_date",
    },
    {
      id: "receivedBy",
      header: t("receivedBy"),
      accessor: (row) => row.received_by?.name ?? "-",
    },
    {
      id: "actions",
      header: t("actions"),
      sticky: true,
      accessor: () => null,
      actions: [
        ...(hasViewPermission
          ? [
              {
                label: t("view"),
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: GoodsReceiptWithStringId) =>
                  handleViewGoodsReceipt(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("confirm"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: GoodsReceiptWithStringId) =>
                  handleConfirm(parseInt(row.id)),
                show: (row: GoodsReceiptWithStringId) => row.status === "PENDING",
                disabled: confirmGoodsReceipt.isPending,
              },
            ]
          : []),
        ...(hasEditPermission
          ? [
              {
                label: t("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: GoodsReceiptWithStringId) =>
                  setEditingGoodsReceipt(parseInt(row.id)),
                show: (row: GoodsReceiptWithStringId) => row.status === "PENDING",
              },
            ]
          : []),
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: GoodsReceiptWithStringId) =>
                  handleDeleteClick(parseInt(row.id)),
                show: (row: GoodsReceiptWithStringId) => row.status === "PENDING",
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
              <SelectItem value="PENDING">{t("pending")}</SelectItem>
              <SelectItem value="RECEIVED">{t("received")}</SelectItem>
              <SelectItem value="PARTIAL">{t("partial")}</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker
            dateRange={dateRange}
            onDateChange={setDateRange}
          />
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
              <span className="truncate">{t("addGoodsReceipt")}</span>
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
                <SelectItem value="PENDING">{t("pending")}</SelectItem>
                <SelectItem value="RECEIVED">{t("received")}</SelectItem>
                <SelectItem value="PARTIAL">{t("partial")}</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker
              dateRange={dateRange}
              onDateChange={setDateRange}
            />
            <div className="flex items-center gap-1 border rounded-md p-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "split" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("split")}
                    className="h-8 min-w-0 overflow-hidden cursor-pointer"
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
                    className="h-8 min-w-0 overflow-hidden cursor-pointer"
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
                    className="shrink-0 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline ml-2">{t("addGoodsReceipt")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addGoodsReceipt")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Split View - Sidebar + Detail */}
      {viewMode === "split" && (
        <SplitViewContainer>
          <SplitViewSidebar
            items={goodsReceipts}
            selectedItemId={selectedSplitGoodsReceiptId}
            onItemClick={handleSplitGoodsReceiptClick}
            renderItem={(goodsReceipt) => (
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage
                    src={goodsReceipt.received_by?.avatar_url ?? goodsReceipt.received_by?.photo_profile}
                    alt={goodsReceipt.received_by?.name ?? "User"}
                  />
                  <AvatarFallback>
                    {goodsReceipt.received_by?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium truncate cursor-pointer text-sm">
                      {goodsReceipt.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {goodsReceipt.warehouse?.name ?? "-"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {getStatusBadge(goodsReceipt.status)}
                  </div>
                  {goodsReceipt.received_by && (
                    <p className="text-xs text-muted-foreground truncate">
                      {goodsReceipt.received_by.name}
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
            {selectedSplitGoodsReceiptId ? (
              <GoodsReceiptDetailModal
                goodsReceiptId={selectedSplitGoodsReceiptId}
                open={!!selectedSplitGoodsReceiptId}
                onOpenChange={(open) => {
                  if (!open) {
                    setSelectedSplitGoodsReceiptId(null);
                    setViewingGoodsReceiptId(null);
                  }
                }}
                onGoodsReceiptUpdated={() => {
                  // Refresh data will be handled by react-query
                }}
                embedded={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("selectGoodsReceipt")}</p>
              </div>
            )}
          </div>
        </SplitViewContainer>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={goodsReceiptsWithStringId}
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
          <GoodsReceiptForm
            onSubmit={async (data) => {
              await handleCreate(data as CreateGoodsReceiptFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createGoodsReceipt.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingGoodsReceipt && editingGoodsReceiptData?.data && (
        <Dialog
          open={!!editingGoodsReceipt}
          onOpenChange={(open) => !open && setEditingGoodsReceipt(null)}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <GoodsReceiptForm
              goodsReceipt={editingGoodsReceiptData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdateGoodsReceiptFormData);
              }}
              onCancel={() => setEditingGoodsReceipt(null)}
              isLoading={updateGoodsReceipt.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingGoodsReceiptId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingGoodsReceiptId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        description={
          deletingGoodsReceiptId
            ? t("deleteDescriptionWithName", {
                code:
                  goodsReceipts.find((r) => r.id === deletingGoodsReceiptId)?.code ??
                  t("deleteDescription"),
              })
            : t("deleteDescription")
        }
        itemName="goods receipt"
        isLoading={deleteGoodsReceipt.isPending}
      />

      {/* Detail Modal */}
      <GoodsReceiptDetailModal
        goodsReceiptId={modalGoodsReceiptId}
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) {
            setModalGoodsReceiptId(null);
          }
        }}
        onGoodsReceiptUpdated={() => {
          // Refresh data will be handled by react-query
        }}
      />
    </div>
  );
}





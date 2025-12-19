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
  ArrowRight,
  Table,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { PurchaseRequisitionDetail } from "./purchase-requisition-detail";
import { PurchaseRequisitionDetailModal } from "./purchase-requisition-detail-modal";
import { PurchaseRequisitionForm } from "./purchase-requisition-form";
import { usePurchaseRequisitionList } from "../hooks/use-purchase-requisition-list";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PurchaseRequisition } from "../types";
import { useTranslations } from "next-intl";
import type {
  CreatePurchaseRequisitionFormData,
  UpdatePurchaseRequisitionFormData,
} from "../schemas/purchase-requisition.schema";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PurchaseRequisitionList() {
  const {
    setPage,
    setPerPage,
    search,
    setSearch,
    sortBy,
    sortOrder,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingRequisition,
    setEditingRequisition,
    requisitions,
    pagination,
    editingRequisitionData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    handleApprove,
    handleReject,
    handleConvert,
    deletingRequisitionId,
    setDeletingRequisitionId,
    handleSortChange,
    deleteRequisition,
    createRequisition,
    updateRequisition,
    approveRequisition,
    rejectRequisition,
    convertRequisition,
  } = usePurchaseRequisitionList();

  const [viewingRequisitionId, setViewingRequisitionId] = useState<number | null>(null);
  const [modalRequisitionId, setModalRequisitionId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "split">("split");
  const [selectedSplitRequisitionId, setSelectedSplitRequisitionId] = useState<number | null>(null);
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

  const t = useTranslations("purchaseRequisitions.list");

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");
  const hasRejectPermission = useHasPermission("REJECT");
  const hasConvertPermission = useHasPermission("CONVERT");

  const handleViewRequisition = (requisitionId: number) => {
    // For table view, open modal
    setModalRequisitionId(requisitionId);
  };

  const handleSplitRequisitionClick = (requisition: PurchaseRequisition) => {
    // For split view, show in container
    setSelectedSplitRequisitionId(requisition.id);
    setViewingRequisitionId(requisition.id);
  };

  const getStatusBadge = (status: PurchaseRequisition["status"]) => {
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
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("rejected")}
          </Badge>
        );
      case "CONVERTED":
        return (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("converted")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Map requisitions to have string id for DataTable compatibility
  const requisitionsWithStringId = requisitions.map((r) => ({ ...r, id: r.id.toString() }));
  type RequisitionWithStringId = Omit<PurchaseRequisition, "id"> & { id: string };

  const columns: Column<RequisitionWithStringId>[] = [
    {
      id: "code",
      header: t("code"),
      accessor: (row) => (
        <button
          onClick={() => handleViewRequisition(parseInt(row.id))}
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
      accessor: (row) => row.supplier?.name ?? "-",
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => getStatusBadge(row.status),
    },
    {
      id: "requestDate",
      header: t("requestDate"),
      accessor: (row) =>
        row.request_date
          ? new Date(row.request_date).toLocaleDateString()
          : "-",
      sortable: true,
      sortKey: "request_date",
    },
    {
      id: "totalAmount",
      header: t("totalAmount"),
      accessor: (row) => formatCurrency(row.total_amount ?? 0),
      sortable: true,
      sortKey: "total_amount",
    },
    {
      id: "businessUnit",
      header: t("businessUnit"),
      accessor: (row) => row.business_unit?.name ?? "-",
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
                onClick: (row: RequisitionWithStringId) =>
                  handleViewRequisition(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("approve"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: RequisitionWithStringId) =>
                  handleApprove(parseInt(row.id)),
                show: (row: RequisitionWithStringId) => row.status === "DRAFT",
                disabled: approveRequisition.isPending,
              },
            ]
          : []),
        ...(hasRejectPermission
          ? [
              {
                label: t("reject"),
                icon: <XCircle className="h-4 w-4 text-red-600" />,
                onClick: (row: RequisitionWithStringId) =>
                  handleReject(parseInt(row.id)),
                show: (row: RequisitionWithStringId) => row.status === "DRAFT",
                disabled: rejectRequisition.isPending,
              },
            ]
          : []),
        ...(hasConvertPermission
          ? [
              {
                label: t("convert"),
                icon: <ArrowRight className="h-4 w-4" />,
                onClick: (row: RequisitionWithStringId) =>
                  handleConvert(parseInt(row.id)),
                show: (row: RequisitionWithStringId) => row.status === "APPROVED",
                disabled: convertRequisition.isPending,
              },
            ]
          : []),
        ...(hasEditPermission
          ? [
              {
                label: t("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: RequisitionWithStringId) =>
                  setEditingRequisition(parseInt(row.id)),
                show: (row: RequisitionWithStringId) => row.status === "DRAFT",
              },
            ]
          : []),
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: RequisitionWithStringId) =>
                  handleDeleteClick(parseInt(row.id)),
                show: (row: RequisitionWithStringId) => row.status === "DRAFT",
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
              <span className="truncate">{t("addRequisition")}</span>
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
                <TooltipContent>{t("split")}</TooltipContent>
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
                <TooltipContent>{t("table")}</TooltipContent>
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
                    <span className="hidden xl:inline ml-2">{t("addRequisition")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addRequisition")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Split View - Sidebar + Detail */}
      {viewMode === "split" && (
        <SplitViewContainer>
          <SplitViewSidebar
            items={requisitions}
            selectedItemId={selectedSplitRequisitionId}
            onItemClick={handleSplitRequisitionClick}
            onViewDetail={(item) => {
              // Optional: Open modal when clicking "View Details" button
              setModalRequisitionId(item.id);
            }}
            renderItem={(requisition) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate cursor-pointer">
                        {requisition.code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {requisition.supplier?.name ?? "-"}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(requisition.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(requisition.total_amount ?? 0)}
                      </span>
                    </div>
                  </div>
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
          <div className="flex-1 min-w-0 overflow-y-auto">
            {viewingRequisitionId ? (
              <div className="p-6">
                <PurchaseRequisitionDetail requisitionId={viewingRequisitionId} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("selectRequisition")}</p>
              </div>
            )}
          </div>
        </SplitViewContainer>
      )}

      {/* Detail Modal (for table view) */}
      <PurchaseRequisitionDetailModal
        requisitionId={modalRequisitionId}
        open={!!modalRequisitionId}
        onOpenChange={(open) => {
          if (!open) {
            setModalRequisitionId(null);
          }
        }}
        onRequisitionUpdated={() => {
          // List will automatically refresh via query invalidation
        }}
      />

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={requisitionsWithStringId}
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
          <PurchaseRequisitionForm
            onSubmit={async (data) => {
              await handleCreate(data as CreatePurchaseRequisitionFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createRequisition.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingRequisition && editingRequisitionData?.data && (
        <Dialog
          open={!!editingRequisition}
          onOpenChange={(open) => !open && setEditingRequisition(null)}
        >
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <PurchaseRequisitionForm
              requisition={editingRequisitionData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdatePurchaseRequisitionFormData);
              }}
              onCancel={() => setEditingRequisition(null)}
              isLoading={updateRequisition.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingRequisitionId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRequisitionId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        description={
          deletingRequisitionId
            ? t("deleteDescriptionWithName", {
                code:
                  requisitions.find((r) => r.id === deletingRequisitionId)?.code ??
                  t("deleteDescription"),
              })
            : t("deleteDescription")
        }
        itemName="purchase requisition"
        isLoading={deleteRequisition.isPending}
      />
    </div>
  );
}


"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { Edit, Trash2, Plus, Search, Eye, CheckCircle2, Map, Table, XCircle } from "lucide-react";
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
import { FileOperations } from "@/components/ui/file-operations";
import { SupplierMapView, SupplierMapSidebar } from "./supplier-map-view";
import { SupplierDetailModal } from "./supplier-detail-modal";
import { useSupplierList } from "../hooks/use-supplier-list";
import { SupplierForm } from "./supplier-form";
import { useHasPermission } from "../hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Supplier } from "../types";
import { useTranslations } from "next-intl";
import type { CreateSupplierFormData, UpdateSupplierFormData } from "../schemas/supplier.schema";
import { useApproveSupplier } from "../hooks/use-suppliers";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SupplierList() {
  const {
    setPage,
    setPerPage,
    search,
    setSearch,
    sortBy,
    sortOrder,
    sortMeta,
    sortableColumns,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingSupplier,
    setEditingSupplier,
    suppliers,
    pagination,
    editingSupplierData,
    isLoading,
    handleCreate,
    handleUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    deletingSupplierId,
    setDeletingSupplierId,
    handleApproveAll,
    handleExport,
    handleDownloadTemplate,
    handleImport,
    handleSortChange,
    deleteSupplier,
    createSupplier,
    updateSupplier,
    approveAll,
    exportSuppliers,
    downloadTemplate,
    importSuppliers,
  } = useSupplierList();

  const [viewingSupplierId, setViewingSupplierId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "map">("map");
  const [selectedMapSupplierId, setSelectedMapSupplierId] = useState<number | null>(null);
  const isMobile = useIsMobile();
  // Track if user has manually toggled the sidebar
  const hasManuallyToggledRef = useRef(false);
  // Derive initial sidebar state from mobile state, but allow manual override
  const [isMapSidebarOpen, setIsMapSidebarOpen] = useState(() => !isMobile);
  
  // Update sidebar state when mobile state changes (only if not manually overridden)
  useEffect(() => {
    if (!hasManuallyToggledRef.current) {
      const expected = !isMobile;
      // Use startTransition to batch the update and avoid cascading renders
      startTransition(() => {
        setIsMapSidebarOpen(expected);
      });
    }
    // Reset manual toggle flag when mobile state changes
    hasManuallyToggledRef.current = false;
  }, [isMobile]);
  
  // Wrapper for manual toggle that sets the ref
  const handleToggleSidebar = () => {
    hasManuallyToggledRef.current = true;
    setIsMapSidebarOpen((prev) => !prev);
  };
  const t = useTranslations("suppliers.list");
  const approveSupplier = useApproveSupplier();

  // Permission checks
  const hasViewPermission = useHasPermission("VIEW");
  const hasCreatePermission = useHasPermission("CREATE");
  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");
  const hasImportPermission = useHasPermission("IMPORT");
  const hasExportPermission = useHasPermission("EXPORT");

  // Check if there are unapproved suppliers
  const hasUnapprovedSuppliers = suppliers.some((c) => !c.is_approved);

  const handleViewSupplier = (supplierId: number) => {
    setViewingSupplierId(supplierId);
    setIsDetailModalOpen(true);
  };

  const handleMapSupplierClick = (supplier: Supplier) => {
    setSelectedMapSupplierId(supplier.id);
    // Map will automatically navigate to supplier location via useEffect in SupplierMapView
  };

  const handleMapViewDetail = (supplier: Supplier) => {
    setViewingSupplierId(supplier.id);
    setIsDetailModalOpen(true);
  };

  const handleApproveSupplier = async (supplierId: number) => {
    try {
      await approveSupplier.mutateAsync(supplierId);
      toast.success(t("approvedSuccess"));
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  // Map suppliers to have string id for DataTable compatibility
  const suppliersWithStringId = suppliers.map((c) => ({ ...c, id: c.id.toString() }));
  type SupplierWithStringId = Omit<Supplier, "id"> & { id: string };

  const columns: Column<SupplierWithStringId>[] = [
    {
      id: "name",
      header: t("name"),
      accessor: (row) => (
        <button
          onClick={() => handleViewSupplier(parseInt(row.id))}
          className="flex items-center gap-3 font-medium text-primary hover:underline cursor-pointer"
        >
          {row.name}
        </button>
      ),
      sortable: true,
      sortKey: "name",
    },
    {
      id: "status",
      header: t("status"),
      accessor: (row) => (
        <Badge variant={row.is_approved ? "default" : "secondary"}>
          {row.is_approved ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("approved")}
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              {t("pending")}
            </>
          )}
        </Badge>
      ),
    },
    {
      id: "city",
      header: t("city"),
      accessor: (row) => row.city?.name ?? row.village?.district_name ?? "-",
    },
    {
      id: "address",
      header: t("address"),
      accessor: (row) => row.address ?? "-",
      sortable: true,
      sortKey: "address",
    },
    {
      id: "phone",
      header: t("phone"),
      accessor: (row) => row.phone ?? "-",
      sortable: true,
      sortKey: "phone",
    },
    {
      id: "email",
      header: t("email"),
      accessor: (row) => row.email ?? "-",
      sortable: true,
      sortKey: "email",
    },
    {
      id: "actions",
      header: t("actions"),
      sticky: true,
      accessor: () => null, // Fallback accessor for columns with actions
      actions: [
        ...(hasViewPermission
          ? [
              {
                label: t("view"),
                icon: <Eye className="h-4 w-4" />,
                onClick: (row: SupplierWithStringId) =>
                  handleViewSupplier(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasApprovePermission
          ? [
              {
                label: t("approve"),
                icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
                onClick: (row: SupplierWithStringId) =>
                  handleApproveSupplier(parseInt(row.id)),
                show: (row: SupplierWithStringId) => !row.is_approved,
                disabled: approveSupplier.isPending,
              },
            ]
          : []),
        ...(hasEditPermission
          ? [
              {
                label: t("edit"),
                icon: <Edit className="h-4 w-4" />,
                onClick: (row: SupplierWithStringId) =>
                  setEditingSupplier(parseInt(row.id)),
                show: true,
              },
            ]
          : []),
        ...(hasDeletePermission
          ? [
              {
                label: t("delete"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onClick: (row: SupplierWithStringId) =>
                  handleDeleteClick(parseInt(row.id)),
                show: false, // Delete in dropdown
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
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="flex-1 h-9 min-w-0"
            >
              <Map className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("map")}</span>
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
          <div className="flex items-center gap-2">
            {hasCreatePermission && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="flex-1 h-9 min-w-0"
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">{t("addSupplier")}</span>
              </Button>
            )}
            {hasApprovePermission && hasUnapprovedSuppliers && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApproveAll}
                disabled={approveAll.isPending}
                className="h-9 min-w-0 flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">
                  {approveAll.isPending ? t("approving") : t("approveAll")}
                </span>
              </Button>
            )}
          </div>
          <FileOperations
            onImport={handleImport}
            onExport={handleExport}
            onDownloadTemplate={handleDownloadTemplate}
            hasImportPermission={hasImportPermission}
            hasExportPermission={hasExportPermission}
            importLoading={importSuppliers.isPending}
            exportLoading={exportSuppliers.isPending}
            templateLoading={downloadTemplate.isPending}
            className="w-full"
          />
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
                    variant={viewMode === "map" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("map")}
                    className="h-8 min-w-0 overflow-hidden"
                  >
                    <Map className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate min-w-0">{t("map")}</span>
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
            <div className="shrink-0">
              <FileOperations
                onImport={handleImport}
                onExport={handleExport}
                onDownloadTemplate={handleDownloadTemplate}
                hasImportPermission={hasImportPermission}
                hasExportPermission={hasExportPermission}
                importLoading={importSuppliers.isPending}
                exportLoading={exportSuppliers.isPending}
                templateLoading={downloadTemplate.isPending}
              />
            </div>
            {hasApprovePermission && hasUnapprovedSuppliers && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApproveAll}
                    disabled={approveAll.isPending}
                    className="shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline ml-2">
                      {approveAll.isPending ? t("approving") : t("approveAll")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {approveAll.isPending ? t("approving") : t("approveAll")}
                </TooltipContent>
              </Tooltip>
            )}
            {hasCreatePermission && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:inline ml-2">{t("addSupplier")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addSupplier")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Map View - Full Page with Sidebar */}
      {viewMode === "map" && (
        <div className={cn(
          "relative h-[calc(100vh-12rem)] min-h-[400px] sm:min-h-[600px] border rounded-lg overflow-hidden bg-background",
          !isMobile && "flex"
        )}>
          <SupplierMapSidebar
            suppliers={suppliers}
            onSupplierClick={handleMapSupplierClick}
            onViewDetail={handleMapViewDetail}
            selectedSupplierId={selectedMapSupplierId}
            className="w-80 shrink-0"
            isOpen={isMapSidebarOpen}
            onClose={isMobile ? () => {
              hasManuallyToggledRef.current = true;
              setIsMapSidebarOpen(false);
            } : undefined}
          />
          <div className={cn(
            "relative min-w-0 h-full",
            !isMobile && "flex-1"
          )}>
            <SupplierMapView
              suppliers={suppliers}
              onSupplierClick={handleMapSupplierClick}
              onViewDetail={handleMapViewDetail}
              selectedSupplierId={selectedMapSupplierId}
              className="w-full h-full"
              showSidebar={isMapSidebarOpen}
              onToggleSidebar={handleToggleSidebar}
            />
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={suppliersWithStringId}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={async (data) => {
              await handleCreate(data as CreateSupplierFormData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createSupplier.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingSupplier && editingSupplierData?.data && (
        <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
            </DialogHeader>
            <SupplierForm
              supplier={editingSupplierData.data}
              onSubmit={async (data) => {
                await handleUpdate(data as UpdateSupplierFormData);
              }}
              onCancel={() => setEditingSupplier(null)}
              isLoading={updateSupplier.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Modal */}
      <SupplierDetailModal
        supplierId={viewingSupplierId}
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) {
            setViewingSupplierId(null);
          }
        }}
        onSupplierUpdated={() => {
          // Refresh will be handled by query invalidation in hooks
        }}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingSupplierId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSupplierId(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title={t("deleteTitle")}
        description={
          deletingSupplierId
            ? t("deleteDescriptionWithName", {
                name:
                  suppliers.find((c) => c.id === deletingSupplierId)?.name ??
                  t("deleteDescription"),
              })
            : t("deleteDescription")
        }
        itemName="supplier"
        isLoading={deleteSupplier.isPending}
      />
    </div>
  );
}

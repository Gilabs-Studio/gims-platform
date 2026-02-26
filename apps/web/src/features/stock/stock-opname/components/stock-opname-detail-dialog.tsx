"use client";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockOpnameItem, StockOpnameItemRequest, StockOpnameStatus } from "../types";
import { 
    useStockOpname, 
    useStockOpnameItems, 
    useUpdateStockOpnameStatus,
    useSaveStockOpnameItems
} from "../hooks/use-stock-opnames";
import { StockOpnameStatusBadge } from "./stock-opname-status-badge";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserPermission } from "@/hooks/use-user-permission";
import { 
    FileText, 
    Calendar, 
    User, 
    BoxSelect, 
    Package,
    Pencil,
    Plus,
    Trash2,
    CheckCircle,
    XCircle,
    Archive,
    Send
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { EditStockOpnameDialog } from "./edit-stock-opname-dialog";
import { StockOpnameItemDialog } from "./stock-opname-item-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opnameId: string | null;
}

export function StockOpnameDetailDialog({ open, onOpenChange, opnameId }: Props) {
  const t = useTranslations("stock_opname");
  const tCommon = useTranslations("common");
  
  // Permissions
  const canUpdate = useUserPermission("stock_opname.update");
  const canApprove = useUserPermission("stock_opname.approve");
  
  // Queries & Mutations
  const opnameQuery = useStockOpname(opnameId);
  const itemsQuery = useStockOpnameItems(opnameId);
  const statusMutation = useUpdateStockOpnameStatus();
  const saveItemsMutation = useSaveStockOpnameItems();
  
  const isLoading = opnameQuery.isLoading || itemsQuery.isLoading;
  const opname = opnameQuery.data?.data;
  const items = itemsQuery.data?.data ?? [];

  // Dialog States
  const [editOpnameOpen, setEditOpnameOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockOpnameItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Pagination for Items
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const totalItems = items.length;

  // Handlers
  const handleStatusChange = async (newStatus: StockOpnameStatus) => {
      if (!opnameId) return;
      try {
          await statusMutation.mutateAsync({
              id: opnameId,
              data: { status: newStatus }
          });
          toast.success(tCommon("saved"));
      } catch {
          toast.error(tCommon("error"));
      }
  };

  const handleSaveItem = async (itemReq: StockOpnameItemRequest & { id?: string }) => {
      if (!opnameId) return;

      // Prepare new items list
      const newItemsRequests: StockOpnameItemRequest[] = items.map(i => ({
          product_id: i.product_id,
          system_qty: i.system_qty,
          physical_qty: i.physical_qty,
          notes: i.notes
      }));

      if (itemReq.id) {
          // Edit existing - find by product_id as simplistic matching since items are replaced
          // Actually, we should map from the current items list, but replace the one being edited.
          // Since we might not have a stable ID for new items effectively until saved, 
          // we align by product_id or just index if we were truly local.
          // Yet, here `itemReq.id` comes from the `items` list which has IDs from backend.
          
          const index = items.findIndex(i => i.id === itemReq.id);
          if (index !== -1) {
              newItemsRequests[index] = {
                  product_id: itemReq.product_id,
                  system_qty: itemReq.system_qty,
                  physical_qty: itemReq.physical_qty,
                  notes: itemReq.notes
              };
          }
      } else {
          // Add new
          // Check if product already exists
          const exists = items.find(i => i.product_id === itemReq.product_id);
          if (exists) {
              toast.error("Product already exists in list. Edit it instead.");
              return;
          }
           newItemsRequests.push({
              product_id: itemReq.product_id,
              system_qty: itemReq.system_qty,
              physical_qty: itemReq.physical_qty,
              notes: itemReq.notes
          });
      }

      try {
          await saveItemsMutation.mutateAsync({
              id: opnameId,
              data: { items: newItemsRequests }
          });
          toast.success(tCommon("saved"));
          setItemDialogOpen(false);
          setEditingItem(null);
      } catch {
          toast.error(tCommon("error"));
      }
  };

  const handleDeleteItem = async () => {
      if (!opnameId || !deletingItemId) return;
      
      const newItemsRequests: StockOpnameItemRequest[] = items
          .filter(i => i.id !== deletingItemId)
          .map(i => ({
              product_id: i.product_id,
              system_qty: i.system_qty,
              physical_qty: i.physical_qty,
              notes: i.notes
          }));
      
      try {
          await saveItemsMutation.mutateAsync({
              id: opnameId,
              data: { items: newItemsRequests }
          });
          toast.success(tCommon("deleted"));
          setDeletingItemId(null);
      } catch {
          toast.error(tCommon("error"));
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="sr-only">
             <DialogTitle>{t("dialog.createTitle")}</DialogTitle>
        </DialogHeader>
        {isLoading || !opname ? (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        ) : (
            <>
                {/* Header Section */}
                <div className="p-6 pb-4 border-b space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-2xl font-bold">
                                {opname.opname_number} 
                            </DialogTitle>
                            <StockOpnameStatusBadge status={opname.status} />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                             {opname.status === 'draft' && canUpdate && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="cursor-pointer"
                                        onClick={() => setEditOpnameOpen(true)}
                                    >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {tCommon("edit")}
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="cursor-pointer"
                                        onClick={() => handleStatusChange('pending')}
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        {t("actions.submit")}
                                    </Button>
                                </>
                             )}
                             
                             {opname.status === 'pending' && canApprove && (
                                 <>
                                     <Button 
                                        variant="outline"
                                        size="sm" 
                                        className="cursor-pointer text-destructive border-destructive hover:bg-destructive/10"
                                        onClick={() => handleStatusChange('rejected')}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        {t("actions.reject")}
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="cursor-pointer bg-green-600 hover:bg-green-700"
                                        onClick={() => handleStatusChange('approved')}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        {t("actions.approve")}
                                    </Button>
                                 </>
                             )}

                             {opname.status === 'approved' && canUpdate && (
                                  <Button 
                                        size="sm" 
                                        className="cursor-pointer"
                                        onClick={() => handleStatusChange('posted')}
                                    >
                                        <Archive className="h-4 w-4 mr-2" />
                                        {t("actions.post")}
                                    </Button>
                             )}
                        </div>
                    </div>
                    
                    {/* Info Card */}
                    <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                             <FileText className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                             <h3 className="font-bold text-lg">{opname.warehouse_name}</h3>
                             <p className="text-sm text-muted-foreground">{opname.description || "-"}</p>
                        </div>
                        <div className="text-right space-y-1">
                             <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                                 <Calendar className="h-3 w-3" />
                                 {formatDate(opname.date)}
                             </div>
                             <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                                 <User className="h-3 w-3" />
                                 {opname.created_by_name || opname.created_by || "-"}
                             </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 border rounded-lg text-center space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">{t("dialog.summary.totalItems")}</p>
                            <p className="text-2xl font-bold">{opname.total_items}</p>
                        </div>
                        <div className="p-3 border rounded-lg text-center space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">{t("dialog.summary.matched")}</p>
                            <p className="text-2xl font-bold text-green-600">
                                {items.filter(i => i.variance_qty === 0).length}
                            </p>
                        </div>
                        <div className="p-3 border rounded-lg text-center space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">{t("dialog.summary.unmatched")}</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {items.filter(i => i.variance_qty !== 0).length}
                            </p>
                        </div>
                         <div className="p-3 border rounded-lg text-center space-y-1 bg-muted/20">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">{t("dialog.summary.totalVariance")}</p>
                            <p className={`text-2xl font-bold ${opname.total_variance_qty < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                {opname.total_variance_qty > 0 ? '+' : ''}{opname.total_variance_qty}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs defaultValue="items" className="flex-1 flex flex-col">
                        <div className="px-6 pt-2 border-b bg-muted/10 flex justify-between items-center">
                            <TabsList className="bg-transparent p-0 gap-6 h-auto">
                                <TabsTrigger 
                                    value="items" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent font-medium"
                                >
                                    {t("dialog.tabs.items")}
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="info" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 bg-transparent font-medium"
                                >
                                    {t("dialog.tabs.info")}
                                </TabsTrigger>
                            </TabsList>
                            
                            {opname.status === 'draft' && canUpdate && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="mb-2 cursor-pointer"
                                    onClick={() => {
                                        setEditingItem(null);
                                        setItemDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("actions.addItem")}
                                </Button>
                            )}
                        </div>

                        <TabsContent value="items" className="flex-1 min-h-0 m-0 border-none p-0">
                            <ScrollArea className="h-full">
                                <div className="p-6">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[300px]">Product</TableHead>
                                                    <TableHead className="text-right">System Qty</TableHead>
                                                    <TableHead className="text-right">Counted Qty</TableHead>
                                                    <TableHead className="text-center">Variance</TableHead>
                                                    <TableHead>Notes</TableHead>
                                                    {opname.status === 'draft' && canUpdate && (
                                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.length === 0 ? (
                                                     <TableRow>
                                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                            No items. Add one to start.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    paginatedItems.map((item) => (
                                                        <TableRow key={item.id} className="hover:bg-muted/5">
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium flex items-center gap-2">
                                                                        <Package className="h-3 w-3 text-muted-foreground" />
                                                                        {item.product_name}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground pl-5 font-mono">{item.product_code}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                                {item.system_qty}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-medium">
                                                                {item.physical_qty ?? "-"}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {item.variance_qty === 0 ? (
                                                                    <Badge>Match</Badge>
                                                                ) : (
                                                                    item.variance_qty > 0 ? (
                                                                        <Badge variant="success">+{item.variance_qty}</Badge>                                                                    ) : (
                                                                        <Badge variant="destructive">{item.variance_qty}</Badge>
                                                                    )
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground italic">
                                                                {item.notes || "-"}
                                                            </TableCell>
                                                            {opname.status === 'draft' && canUpdate && (
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 cursor-pointer"
                                                                            onClick={() => {
                                                                                setEditingItem(item);
                                                                                setItemDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                                                                            onClick={() => setDeletingItemId(item.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {totalItems > 0 && (
                                        <div className="mt-4">
                                            <DataTablePagination
                                                pageIndex={page}
                                                pageSize={pageSize}
                                                rowCount={totalItems}
                                                onPageChange={setPage}
                                                onPageSizeChange={(newSize) => {
                                                    setPageSize(newSize);
                                                    setPage(1);
                                                }}
                                                pageSizeOptions={[5, 10, 20, 50]}
                                            />
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="info" className="flex-1 min-h-0 m-0 border-none p-0">
                            <ScrollArea className="h-full">
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-8 max-w-3xl">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold flex items-center gap-2 border-b pb-2 text-sm">
                                                <BoxSelect className="h-4 w-4" />
                                                Warehouse Information
                                            </h4>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-muted-foreground">Warehouse</span>
                                                <span className="col-span-2 font-medium">{opname.warehouse_name}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-semibold flex items-center gap-2 border-b pb-2 text-sm">
                                                <Calendar className="h-4 w-4" />
                                                Timestamps
                                            </h4>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-muted-foreground">Created At</span>
                                                <span className="col-span-2 text-muted-foreground font-mono text-xs">{formatDate(opname.created_at)}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <span className="text-muted-foreground">Updated At</span>
                                                <span className="col-span-2 text-muted-foreground font-mono text-xs">{formatDate(opname.updated_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>

                <EditStockOpnameDialog 
                    open={editOpnameOpen} 
                    onOpenChange={setEditOpnameOpen} 
                    opname={opname} 
                />

                <StockOpnameItemDialog
                    open={itemDialogOpen}
                    onOpenChange={setItemDialogOpen}
                    item={editingItem}
                    onSave={handleSaveItem}
                />

                <DeleteDialog
                    open={!!deletingItemId}
                    onOpenChange={(open) => !open && setDeletingItemId(null)}
                    onConfirm={handleDeleteItem}
                    title={t("deleteItemConfirmation.title")}
                    description={t("deleteItemConfirmation.description")}
                    isLoading={saveItemsMutation.isPending}
                />
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}

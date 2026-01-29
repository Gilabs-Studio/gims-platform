"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, resolveImageUrl } from "@/lib/utils";
import { InventoryStockItem } from "../types";
import { useInventoryTreeBatches } from "../hooks/use-inventory-tree";
import { Package, Calendar, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface InventoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryStockItem | null;
}

function BatchList({ warehouseId, productId }: { warehouseId: string; productId: string }) {
  const { batches, isLoading } = useInventoryTreeBatches(warehouseId, productId, true);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
        <p>No active batches found for this product in this warehouse.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => (
        <div 
          key={batch.id} 
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-3"
        >
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded text-sm">
                  {batch.batch_number}
                </span>
                {batch.expiry_date && (
                    <Badge variant="outline" className="text-xs font-normal">
                        Exp: {formatDate(batch.expiry_date)}
                    </Badge>
                )}
             </div>
             <p className="text-xs text-muted-foreground">ID: {batch.id}</p>
          </div>
          
          <div className="flex items-center gap-6 text-sm tabular-nums">
              <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-muted-foreground text-xs">Qty</span>
                  <span className="font-medium">{batch.current_quantity}</span>
              </div>
              <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-muted-foreground text-xs">Reserved</span>
                  <span>{batch.reserved_quantity}</span>
              </div>
              <div className="flex flex-col items-center min-w-[60px] border-l pl-4">
                  <span className="text-muted-foreground text-xs">Available</span>
                  <span className="font-bold text-primary">{batch.available}</span>
              </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InventoryDetailDialog({
  open,
  onOpenChange,
  item,
}: InventoryDetailDialogProps) {
  const t = useTranslations("inventory");

  if (!item) return null;

  const getStatusBadge = (status: string) => {
      switch (status) {
        case "ok":
          return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>;
        case "low_stock":
          return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" /> Low Stock</Badge>;
        case "out_of_stock":
          return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Out of Stock</Badge>;
        case "overstock":
          return <Badge variant="secondary"><Package className="h-3 w-3 mr-1" /> Overstock</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Inventory Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
           {/* Header Info */}
           <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                  {item.product_image_url ? (
                      <img 
                        src={resolveImageUrl(item.product_image_url)} 
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                  ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {item.product_name.substring(0, 2).toUpperCase()}
                      </span>
                  )}
              </div>
              <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{item.product_name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{item.product_code}</p>
                      </div>
                      {getStatusBadge(item.status)}
                  </div>
                  <div className="text-sm">
                      <span className="text-muted-foreground">Warehouse: </span>
                      <span className="font-medium">{item.warehouse_name}</span>
                  </div>
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-4 gap-2 bg-muted/20 p-4 rounded-lg border">
              <div className="space-y-1 text-center">
                  <p className="text-xs text-muted-foreground uppercase">On Hand</p>
                  <p className="text-lg font-semibold tabular-nums">{item.on_hand}</p>
              </div>
              <div className="space-y-1 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Reserved</p>
                  <p className="text-lg font-semibold tabular-nums">{item.reserved}</p>
              </div>
              <div className="space-y-1 text-center">
                  <p className="text-xs text-primary font-bold uppercase">Available</p>
                  <p className="text-xl font-bold tabular-nums text-primary">{item.available}</p>
              </div>
              <div className="space-y-1 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Min - Max</p>
                  <p className="text-lg font-medium tabular-nums text-muted-foreground">
                    {item.min_stock} - {item.max_stock}
                  </p>
              </div>
           </div>

           {/* Batch List Section */}
           <div>
               <h4 className="font-semibold mb-3 flex items-center gap-2">
                   <Layers className="h-4 w-4" />
                   Batch Information
               </h4>
               <BatchList warehouseId={item.warehouse_id} productId={item.product_id} />
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { Layers } from "lucide-react";

"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StockMovement } from "../types";
import { MovementBadge } from "./movement-badge";
import { 
  FileText, 
  MapPin, 
  Package, 
  User, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  CreditCard
} from "lucide-react";

interface MovementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockMovement | null;
}

export function MovementDetailDialog({
  open,
  onOpenChange,
  item,
}: MovementDetailDialogProps) {
  const t = useTranslations("stock_movement.dialog");
  const tCommon = useTranslations("common");

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{t("title")}</DialogTitle>
            <MovementBadge type={item.type} />
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
           {/* Section 1: Product & Time */}
           <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Package className="h-6 w-6" />
              </div>
              <div className="flex-1">
                  <h3 className="font-bold text-lg">{item.product?.name || "Unknown Product"}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{item.product?.code}</p>
              </div>
              <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.date)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 justify-end">
                      <User className="h-3 w-3" />
                      {item.creator?.name || "-"}
                  </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Section 2: Reference Info */}
               <div className="space-y-3">
                   <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                       <FileText className="h-4 w-4" />
                       {t("refInfo")}
                   </h4>
                   <div className="space-y-2 text-sm">
                       <div className="grid grid-cols-3 gap-2">
                           <span className="text-muted-foreground">Type</span>
                           <span className="col-span-2 font-medium">{item.ref_type}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                           <span className="text-muted-foreground">No.</span>
                           <span className="col-span-2 font-mono font-medium text-primary cursor-pointer hover:underline">
                               {item.ref_number}
                           </span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                           <span className="text-muted-foreground">ID</span>
                           <span className="col-span-2 font-mono text-xs text-muted-foreground truncate" title={item.ref_id}>
                               {item.ref_id.substring(0, 8)}...
                           </span>
                       </div>
                   </div>
               </div>

               {/* Section 3: Location Info */}
               <div className="space-y-3">
                   <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                       <MapPin className="h-4 w-4" />
                       {t("movementInfo")}
                   </h4>
                   <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                           <span className="text-muted-foreground">Warehouse</span>
                           <span className="col-span-2 font-medium">{item.warehouse?.name}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2">
                           <span className="text-muted-foreground">Source</span>
                           <span className="col-span-2 font-medium">{item.source || "-"}</span>
                       </div>
                   </div>
               </div>
           </div>

           {/* Section 4: Quantitative & Financial */}
           <div className="bg-card border rounded-lg overflow-hidden">
               <div className="grid grid-cols-3 divide-x divide-y md:divide-y-0">
                   <div className="p-4 text-center space-y-1">
                       <p className="text-xs text-muted-foreground uppercase font-semibold">{t("qtyIn")}</p>
                       <p className={`text-xl font-bold font-mono ${item.qty_in > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                           {item.qty_in > 0 ? `+${item.qty_in}` : "-"} <span className="text-xs text-muted-foreground font-normal">{item.product?.unit_of_measure?.symbol}</span>
                       </p>
                   </div>
                   <div className="p-4 text-center space-y-1">
                       <p className="text-xs text-muted-foreground uppercase font-semibold">{t("qtyOut")}</p>
                       <p className={`text-xl font-bold font-mono ${item.qty_out > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                           {item.qty_out > 0 ? `-${item.qty_out}` : "-"} <span className="text-xs text-muted-foreground font-normal">{item.product?.unit_of_measure?.symbol}</span>
                       </p>
                   </div>
                   <div className="p-4 text-center space-y-1 bg-muted/20">
                       <p className="text-xs text-muted-foreground uppercase font-semibold">{t("balanceAfter")}</p>
                       <p className="text-xl font-bold font-mono">
                           {item.balance} <span className="text-xs text-muted-foreground font-normal">{item.product?.unit_of_measure?.symbol}</span>
                       </p>
                   </div>
               </div>
               
               <div className="grid grid-cols-2 divide-x border-t">
                   <div className="p-3 flex justify-between items-center px-6">
                       <span className="text-sm text-muted-foreground">{t("unitCost")}</span>
                       <span className="font-mono font-medium">{formatCurrency(item.cost)}</span>
                   </div>
                   <div className="p-3 flex justify-between items-center px-6">
                       <span className="text-sm text-muted-foreground">{t("totalValue")}</span>
                       <span className="font-mono font-bold">
                         {formatCurrency((item.qty_in + item.qty_out) * item.cost)}
                       </span>
                   </div>
               </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Package, AlertTriangle, CheckCircle2, XCircle, Layers, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryTree, useInventoryTreeProducts, useInventoryTreeBatches } from "../hooks/use-inventory-tree";
import { InventoryTreeWarehouse, InventoryStockItem } from "../types";
import { resolveImageUrl } from "@/lib/utils";

// --- Sub-components for cleaner file ---

function StatusBadge({ count, type }: { count: number; type: "ok" | "low" | "out" | "over" }) {
  if (count === 0) return null;
  
  const config = {
    ok: { color: "bg-success", icon: CheckCircle2, label: "OK" },
    low: { color: "bg-warning", icon: AlertTriangle, label: "Low" },
    out: { color: "bg-destructive", icon: XCircle, label: "OOS" },
    over: { color: "bg-primary", icon: Package, label: "Over" },
  };

  const { color, icon: Icon, label } = config[type];

  return (
    <Badge className={`${color} hover:${color} text-white gap-1`}>
      <Icon className="h-3 w-3" />
      {count} {label}
    </Badge>
  );
}

function BatchList({ warehouseId, productId }: { warehouseId: string; productId: string }) {
  const PAGE_SIZE = 5;
  const { batches, meta, isLoading, page, setPage } = useInventoryTreeBatches(warehouseId, productId, true, PAGE_SIZE);

  if (isLoading) {
    return <Skeleton className="h-8 w-full my-1" />;
  }

  if (batches.length === 0) {
    return <div className="text-xs text-muted-foreground pl-8 py-1">No active batches</div>;
  }

  return (
    <div className="pl-6 py-1 space-y-1">
      {/* Column headers for alignment */}
      <div className="grid text-[10px] font-medium text-muted-foreground/60 px-1 mb-0.5"
           style={{ gridTemplateColumns: "1.5rem 1fr 9rem 5rem 6rem" }}>
        <span />
        <span>Batch</span>
        <span>Expiry</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Reserved</span>
      </div>

      {batches.map((batch) => (
        <div
          key={batch.id}
          className="grid items-center text-xs text-muted-foreground gap-x-2 bg-muted/30 px-1 py-1.5 rounded-sm border-l-2 border-primary/20"
          style={{ gridTemplateColumns: "1.5rem 1fr 9rem 5rem 6rem" }}
        >
          <span className="text-muted-foreground/50">▶</span>
          <span className="font-mono truncate">{batch.batch_number}</span>
          <span className="tabular-nums">
            {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : "—"}
          </span>
          <span className="font-medium tabular-nums text-right">{batch.current_quantity}</span>
          <span className="tabular-nums text-right">{batch.reserved_quantity}</span>
        </div>
      ))}

      {/* Pagination controls */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between pt-1 px-1">
          <span className="text-[10px] text-muted-foreground">
            Page {meta.page} of {meta.total_pages} ({meta.total} batches)
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!meta.has_prev}
              onClick={(e) => { e.stopPropagation(); setPage(page - 1); }}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!meta.has_next}
              onClick={(e) => { e.stopPropagation(); setPage(page + 1); }}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductNode({ product, warehouseId, isOpen, onToggle }: { product: InventoryStockItem; warehouseId: string; isOpen: boolean; onToggle: () => void }) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case "low_stock": return "text-warning font-medium";
      case "out_of_stock": return "text-destructive font-medium";
      case "overstock": return "text-primary font-medium";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div>
      <div 
        className={`flex items-center py-2 px-2 hover:bg-accent/50 rounded-md cursor-pointer group transtion-colors ${isOpen ? "bg-accent/30" : ""}`}
        onClick={onToggle}
      >
        <div className="w-6 flex justify-center mr-2">
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
        </div>
        
        <div className="flex items-center gap-3 flex-1">
            <div className="h-8 w-8 rounded-sm border shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                {product.product_image_url ? (
                    <img 
                        src={resolveImageUrl(product.product_image_url)} 
                        alt={product.product_name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {product.product_name.substring(0, 2).toUpperCase()}
                    </span>
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium">{product.product_name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{product.product_code}</span>
            </div>
        </div>

        <div className="flex items-center gap-6 text-xs tabular-nums mr-4">
            <div className="flex flex-col items-end">
                <span className="text-muted-foreground">On Hand</span>
                <span className="font-medium">{product.on_hand}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Reserved</span>
                <span>{product.reserved}</span>
            </div>
            <div className="flex flex-col items-end min-w-[60px]">
                <span className="text-muted-foreground">Available</span>
                <span className="font-bold text-sm">{product.available}</span>
            </div>
            <div className={`min-w-20 text-right ${getStatusColor(product.status)}`}>
                {product.status.replace("_", " ")}
            </div>
        </div>
      </div>
      
      {isOpen && (
          <div className="ml-10 border-l pl-2 my-1">
            <div className="text-[10px] text-muted-foreground mb-1 pl-6">
                 Min: {product.min_stock} | Max: {product.max_stock}
            </div>
            <BatchList warehouseId={warehouseId} productId={product.product_id} />
          </div>
      )}
    </div>
  );
}

function WarehouseNode({ warehouse, isOpen, onToggle }: { warehouse: InventoryTreeWarehouse; isOpen: boolean; onToggle: () => void }) {
  const { data: products, isLoading, meta, page, setPage } = useInventoryTreeProducts(warehouse.id, isOpen);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm mb-4">
      <div 
        className="flex items-center p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="mr-3 p-1 rounded-md bg-muted text-muted-foreground">
             {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
        <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">{warehouse.name}</span>
            </div>
            <div className="flex gap-2">
                <StatusBadge count={warehouse.summary.ok} type="ok" />
                <StatusBadge count={warehouse.summary.low} type="low" />
                <StatusBadge count={warehouse.summary.out_of_stock} type="out" />
                <StatusBadge count={warehouse.summary.overstock} type="over" />
            </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/10 p-2">
            {isLoading && products.length === 0 ? (
                <div className="space-y-2 p-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            ) : (
                <div className="space-y-1">
                    {products.map(product => (
                        <ProductNode 
                            key={product.product_id} 
                            product={product} 
                            warehouseId={warehouse.id}
                            isOpen={!!expandedProducts[product.product_id]}
                            onToggle={() => toggleProduct(product.product_id)}
                        />
                    ))}
                    
                    {meta && meta.has_next && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-muted-foreground mt-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPage(page + 1);
                                // Note: Simple pagination for now replaces list. 
                                // Ideally we append, but that requires more complex hook state.
                                // For MVP tree, simple pagination per node is acceptable or "Load More" to append.
                                // Let's stick to simple next page for now to keep it safe.
                            }}
                        >
                            Load next page ({meta.total_pages - page} remaining)
                        </Button>
                    )}
                </div>
            )}
            
            {!isLoading && products.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                    No items in this warehouse
                </div>
            )}
        </div>
      )}
    </div>
  );
}

/**
 * Simplified view for when there is only one warehouse.
 * Skips the expandable card wrapper and renders products directly,
 * with a flat non-interactive header showing warehouse name and stock badges.
 */
function SingleWarehouseView({ warehouse }: { warehouse: InventoryTreeWarehouse }) {
  const { data: products, isLoading, meta, page, setPage } = useInventoryTreeProducts(warehouse.id, true);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      {/* Non-expandable warehouse header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <span className="font-semibold text-base">{warehouse.name}</span>
        </div>
        <div className="flex gap-2">
          <StatusBadge count={warehouse.summary.ok} type="ok" />
          <StatusBadge count={warehouse.summary.low} type="low" />
          <StatusBadge count={warehouse.summary.out_of_stock} type="out" />
          <StatusBadge count={warehouse.summary.overstock} type="over" />
        </div>
      </div>

      {/* Products rendered directly without collapse */}
      <div className="bg-muted/10 p-2">
        {isLoading && products.length === 0 ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-1">
            {products.map(product => (
              <ProductNode
                key={product.product_id}
                product={product}
                warehouseId={warehouse.id}
                isOpen={!!expandedProducts[product.product_id]}
                onToggle={() => toggleProduct(product.product_id)}
              />
            ))}
            {meta && meta.has_next && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground mt-2"
                onClick={() => setPage(page + 1)}
              >
                Load next page ({meta.total_pages - page} remaining)
              </Button>
            )}
          </div>
        )}
        {!isLoading && products.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No items in this warehouse
          </div>
        )}
      </div>
    </div>
  );
}

export function InventoryTree() {
  const { warehouses, isLoading, expandedWarehouses, toggleWarehouse } = useInventoryTree();

  if (isLoading) {
    return <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
    </div>;
  }

  if (warehouses.length === 0) {
    return (
      <div className="p-10 border rounded-lg text-center text-muted-foreground">
        No warehouses found.
      </div>
    );
  }

  // Single warehouse: skip expandable card, render products directly
  if (warehouses.length === 1) {
    return (
      <div className="space-y-2">
        <SingleWarehouseView warehouse={warehouses[0]} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {warehouses.map((warehouse) => (
        <WarehouseNode 
            key={warehouse.id} 
            warehouse={warehouse} 
            isOpen={!!expandedWarehouses[warehouse.id]}
            onToggle={() => toggleWarehouse(warehouse.id)}
        />
      ))}
    </div>
  );
}

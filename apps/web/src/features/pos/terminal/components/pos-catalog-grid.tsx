"use client";

import { useState } from "react";
import { Search, Package, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";
import { usePOSCatalog } from "../hooks/use-pos";
import { usePOSUIStore, type POSGridSize } from "../../stores/use-pos-ui-store";
import type { POSCatalogItem } from "../types";
import { cn } from "@/lib/utils";

interface POSCatalogGridProps {
  outletId: string;
  onAddItem: (item: POSCatalogItem) => void;
  disabled?: boolean;
  /** Map of product_id → quantity already in the cart (for live stock deduction) */
  cartQuantities?: Record<string, number>;
}

const GRID_SIZE_CONFIG: Record<POSGridSize, string> = {
  small: "repeat(auto-fill, minmax(180px, 1fr))",
  medium: "repeat(auto-fill, minmax(225px, 1fr))",
  large: "repeat(auto-fill, minmax(300px, 1fr))",
};

export function POSCatalogGrid({ outletId, onAddItem, disabled = false, cartQuantities }: POSCatalogGridProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const gridSize = usePOSUIStore((s) => s.gridSize);
  const setGridSize = usePOSUIStore((s) => s.setGridSize);

  const { data: catalogData, isLoading } = usePOSCatalog(outletId, {
    enabled: !!outletId,
  });

  const allItems = catalogData?.data ?? [];

  const categories = Array.from(
    new Set(allItems.map((p) => p.category).filter(Boolean) as string[])
  );

  const filtered = allItems.filter((p) => {
    const matchSearch =
      !search ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  if (isLoading) {
    return (
      <div className="grid gap-2.5 p-3 sm:p-4" style={{ gridTemplateColumns: GRID_SIZE_CONFIG[gridSize] }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + category filters */}
      <div className="p-3 space-y-2 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20 shrink-0">
            {(["small", "medium", "large"] as const).map((size) => (
              <Button
                key={size}
                type="button"
                variant={gridSize === size ? "secondary" : "ghost"}
                size="icon-sm"
                className="size-7 cursor-pointer"
                onClick={() => setGridSize(size)}
                title={`Grid size: ${size}`}
              >
                <span className="text-[10px] uppercase font-bold">
                  {size.substring(0, 1)}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <Badge
              variant={!categoryFilter ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            No products found.
          </p>
        ) : (
          <div className="grid gap-2.5 p-3 sm:p-4" style={{ gridTemplateColumns: GRID_SIZE_CONFIG[gridSize] }}>
            {filtered.map((item) => (
              <ProductCard
                key={item.product_id}
                item={item}
                onAdd={onAddItem}
                disabled={disabled}
                cartQuantity={cartQuantities?.[item.product_id] ?? 0}
                gridSize={gridSize}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  item: POSCatalogItem;
  onAdd: (item: POSCatalogItem) => void;
  disabled?: boolean;
  cartQuantity?: number;
}

function ProductCard({
  item,
  onAdd,
  disabled = false,
  cartQuantity = 0,
  gridSize,
}: ProductCardProps & { gridSize: POSGridSize }) {
  const displayStock = Math.max(0, item.stock - cartQuantity);
  const isStockLike = item.product_kind === "STOCK" || item.product_kind === "RECIPE";
  const isLowStock = isStockLike && displayStock < 5 && displayStock > 0;
  const isOutOfStock = !item.is_available || (isStockLike && displayStock === 0);
  const [imageBroken, setImageBroken] = useState(false);
  const resolvedImageUrl = resolveImageUrl(item.image_url ?? undefined);
  const showImage = !!resolvedImageUrl && !imageBroken;
  const FallbackIcon = item.product_kind === "STOCK" ? Package : UtensilsCrossed;

  return (
    <button
      type="button"
      disabled={disabled || isOutOfStock}
      onClick={() => onAdd(item)}
      className={cn(
        "group flex flex-col rounded-2xl border bg-card text-left",
        "transition-all duration-200 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]",
        "cursor-pointer overflow-hidden",
        (disabled || isOutOfStock) && "opacity-30 cursor-not-allowed",
      )}
    >
      {/* Product image / fallback */}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedImageUrl}
          alt={item.product_name}
          className="aspect-square w-full object-cover border-b"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <div className="aspect-square w-full flex items-center justify-center bg-muted/30 border-b group-hover:bg-muted/50 transition-colors">
          <FallbackIcon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}

      {/* Details */}
      <div className={cn("flex flex-col flex-1", gridSize === "large" ? "p-4 gap-2" : "p-2.5 gap-1.5")}>
        <p
          className={cn(
            "font-medium leading-snug line-clamp-2 text-foreground",
            gridSize === "small" && "text-[11px]",
            gridSize === "medium" && "text-xs",
            gridSize === "large" && "text-base",
          )}
        >
          {item.product_name}
        </p>
        <div className="flex items-center justify-between gap-1 mt-auto">
          <span
            className={cn(
              "font-bold text-primary tabular-nums",
              gridSize === "small" && "text-xs",
              gridSize === "medium" && "text-sm",
              gridSize === "large" && "text-xl",
            )}
          >
            {formatCurrency(item.price)}
          </span>
          {isStockLike && (
            <Badge
              variant={isOutOfStock ? "destructive" : isLowStock ? "warning" : "secondary"}
              className={cn(
                "font-semibold px-1.5 py-0",
                gridSize === "large" ? "text-sm" : "text-[9px]",
              )}
            >
              {Number.isInteger(displayStock) ? displayStock : displayStock.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

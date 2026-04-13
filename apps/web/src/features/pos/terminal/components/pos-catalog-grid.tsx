"use client";

import { useState } from "react";
import { Search, Package, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";
import { usePOSCatalog } from "../hooks/use-pos";
import type { POSCatalogItem } from "../types";
import { cn } from "@/lib/utils";

interface POSCatalogGridProps {
  outletId: string;
  onAddItem: (item: POSCatalogItem) => void;
  disabled?: boolean;
  /** Map of product_id → quantity already in the cart (for live stock deduction) */
  cartQuantities?: Record<string, number>;
}

export function POSCatalogGrid({ outletId, onAddItem, disabled = false, cartQuantities }: POSCatalogGridProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

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
      <div className="grid gap-2.5 p-3 sm:p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + category filters */}
      <div className="p-3 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <div className="grid gap-2.5 p-3 sm:p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
            {filtered.map((item) => (
              <ProductCard
                key={item.product_id}
                item={item}
                onAdd={onAddItem}
                disabled={disabled}
                cartQuantity={cartQuantities?.[item.product_id] ?? 0}
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

function ProductCard({ item, onAdd, disabled = false, cartQuantity = 0 }: ProductCardProps) {
  const displayStock = Math.max(0, item.stock - cartQuantity);
  const isLowStock = item.product_kind === "STOCK" && displayStock < 5 && displayStock > 0;
  const isOutOfStock = !item.is_available || (item.product_kind === "STOCK" && displayStock === 0);
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
        (disabled || isOutOfStock) && "opacity-50 cursor-not-allowed",
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
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground">
          {item.product_name}
        </p>
        <div className="flex items-center justify-between gap-1 mt-auto">
          <span className="text-sm font-bold text-primary tabular-nums">
            {formatCurrency(item.price)}
          </span>
                      {item.product_kind === "STOCK" && (
            <Badge
              variant={isOutOfStock ? "destructive" : isLowStock ? "warning" : "secondary"}
              className="text-[9px] font-semibold px-1.5 py-0"
            >
              {displayStock}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

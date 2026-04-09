"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
}

type SellTypeFilter = "ALL" | "FNB" | "GOODS";

export function POSCatalogGrid({ outletId, onAddItem, disabled = false }: POSCatalogGridProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sellTypeFilter, setSellTypeFilter] = useState<SellTypeFilter>("ALL");

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
    const matchSellType =
      sellTypeFilter === "ALL" ||
      (sellTypeFilter === "GOODS" && p.product_kind === "STOCK") ||
      (sellTypeFilter === "FNB" && (p.product_kind === "RECIPE" || p.product_kind === "SERVICE"));
    return matchSearch && matchCategory && matchSellType;
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 p-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search + filters */}
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
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={sellTypeFilter === "ALL" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSellTypeFilter("ALL")}
          >
            Semua Tipe
          </Badge>
          <Badge
            variant={sellTypeFilter === "FNB" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSellTypeFilter("FNB")}
          >
            F&B
          </Badge>
          <Badge
            variant={sellTypeFilter === "GOODS" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSellTypeFilter("GOODS")}
          >
            Goods
          </Badge>
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
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No products found.
          </p>
        ) : (
          <div className="grid gap-2.5 p-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {filtered.map((item) => (
              <ProductCard
                key={item.product_id}
                item={item}
                onAdd={onAddItem}
                disabled={disabled}
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
}

function ProductCard({ item, onAdd, disabled = false }: ProductCardProps) {
  const isLowStock = item.product_kind === "STOCK" && item.stock < 5;
  const productTypeLabel = item.product_kind === "STOCK" ? "Goods" : "F&B";
  const [imageBroken, setImageBroken] = useState(false);
  const resolvedImageUrl = resolveImageUrl(item.image_url ?? undefined);
  const showImage = !!resolvedImageUrl && !imageBroken;

  return (
    <button
      type="button"
      disabled={disabled || !item.is_available}
      onClick={() => onAdd(item)}
      className={cn(
        "group flex flex-col rounded-xl border p-2 text-left transition-all duration-200",
        "hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.99]",
        "bg-card cursor-pointer",
        (disabled || !item.is_available) && "opacity-50 cursor-not-allowed"
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedImageUrl}
          alt={item.product_name}
          className="aspect-square w-full rounded-lg object-cover mb-2 border"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <div className="aspect-square w-full rounded-lg border bg-muted/40 flex items-center justify-center mb-2 text-3xl group-hover:bg-muted/60">
          {item.product_kind === "STOCK" ? "📦" : "🍽️"}
        </div>
      )}
      <div className="mb-1 flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {productTypeLabel}
        </Badge>
        <Badge variant="secondary" className="text-[10px] font-mono">
          {item.product_code}
        </Badge>
      </div>
      <p className="text-xs font-medium leading-tight line-clamp-2 flex-1">
        {item.product_name}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-primary">
          {formatCurrency(item.price)}
        </span>
        {item.product_kind === "STOCK" && (
          <Badge
            variant={!item.is_available ? "destructive" : isLowStock ? "warning" : "default"}
            className="text-[10px] font-semibold"
          >
            Stock: {item.stock}
          </Badge>
        )}
      </div>
    </button>
  );
}

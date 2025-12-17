"use client";

import { DynamicIcon } from "@/lib/icon-utils";
import { MerchandiseProduct } from "../types";

interface MerchandiseProductCardProps {
  readonly product: MerchandiseProduct;
  readonly onEdit?: (productId: string) => void;
  readonly onClick?: (productId: string) => void;
}

export function MerchandiseProductCard({
  product,
  onEdit,
  onClick,
}: MerchandiseProductCardProps) {
  const stockColorClass =
    product.stockStatus === "healthy"
      ? "text-emerald-500"
      : product.stockStatus === "low"
        ? "text-orange-500"
        : "text-red-500";

  const stockBarColorClass =
    product.stockStatus === "healthy"
      ? "bg-emerald-500"
      : product.stockStatus === "low"
        ? "bg-orange-500"
        : "bg-red-500";

  const stockStatusText =
    product.stockStatus === "healthy"
      ? "Healthy"
      : product.stockStatus === "low"
        ? "Low"
        : "Out";

  return (
    <div
      className="border border-border bg-card/30 rounded-lg p-4 group hover:border-ring transition-all cursor-pointer"
      onClick={() => onClick?.(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(product.id);
        }
      }}
    >
      <div className="aspect-square bg-muted rounded border border-border mb-4 flex items-center justify-center relative overflow-hidden">
        <DynamicIcon
          name={product.iconName}
          className="text-muted-foreground"
          size={48}
        />
      </div>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
          <p className="text-xs text-muted-foreground">
            {product.variant ?? product.description ?? ""}
          </p>
        </div>
        <span className="text-sm font-medium text-foreground">
          {product.priceFormatted}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase text-muted-foreground font-medium">
          <span>Stock</span>
          <span className={stockColorClass}>{stockStatusText}</span>
        </div>
        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
          <div
            className={`${stockBarColorClass} h-full rounded-full transition-all`}
            style={{ width: `${Math.max(0, Math.min(100, product.stockPercentage))}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground text-right pt-1">
          {product.stock} left
        </div>
      </div>
    </div>
  );
}

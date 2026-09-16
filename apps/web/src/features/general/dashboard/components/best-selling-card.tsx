"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useProduct } from "@/features/master-data/product/hooks/use-products";
import { ProductDetailDialog } from "@/features/master-data/product/components/product/product-detail-dialog";
import { cn, formatCurrency, resolveImageUrl } from "@/lib/utils";
import type { TopProductRow } from "../types";

function ProductImage({ src, alt }: { readonly src?: string; readonly alt: string }) {
  const [error, setError] = useState(false);
  const resolved = resolveImageUrl(src);

  if (!resolved || error) {
    return <Package className="size-4 text-muted-foreground" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      className="size-full object-cover"
      onError={() => setError(true)}
    />
  );
}

interface BestSellingCardProps {
  readonly data?: TopProductRow[];
  readonly isLoading?: boolean;
}

export function BestSellingCard({ data, isLoading }: BestSellingCardProps) {
  const t = useTranslations("dashboard");
  const rows = data ?? [];
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const canViewProduct = useHasPermission("product.read");

  const { data: productData } = useProduct(selectedProductId ?? "", {
    enabled: !!selectedProductId,
  });

  return (
    <>
      <Card className="flex h-full flex-col">
        <CardHeader className="space-y-0 pb-4">
          <CardTitle className="text-base font-semibold leading-normal">{t("bestSelling.title")}</CardTitle>
          <CardDescription className="mt-1.5 text-xs text-muted-foreground leading-normal">
            {t("bestSelling.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {rows.slice(0, 5).map((row, i) => {
                const handleClick = canViewProduct
                  ? () => setSelectedProductId(row.id)
                  : undefined;

                return (
                  <div
                    key={row.id || `bp-${i}`}
                    className={cn(
                      "group flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40",
                      canViewProduct && "cursor-pointer"
                    )}
                    onClick={handleClick}
                    role={canViewProduct ? "button" : undefined}
                    tabIndex={canViewProduct ? 0 : undefined}
                    onKeyDown={
                      canViewProduct
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleClick?.();
                            }
                          }
                        : undefined
                    }
                  >
                    {/* Left: Rank #, Thumbnail, Name & Revenue */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-5 shrink-0 font-mono text-xs font-medium text-muted-foreground">
                        #{i + 1}
                      </span>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 overflow-hidden">
                        <ProductImage src={row.image} alt={row.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium text-foreground",
                            canViewProduct && "group-hover:text-primary transition-colors"
                          )}
                        >
                          {row.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {formatCurrency(row.revenue)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Quantity sold badge */}
                    <div className="flex shrink-0 items-center">
                      <Badge variant="secondary" className="text-xs font-medium shrink-0">
                        {row.quantity_sold} {t("bestSelling.itemsSold")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canViewProduct && (
        <ProductDetailDialog
          open={!!selectedProductId}
          onOpenChange={(v) => {
            if (!v) setSelectedProductId(null);
          }}
          product={productData?.data ?? null}
        />
      )}
    </>
  );
}

"use client";

import { useProduct } from "@/features/master-data/product/hooks/use-products";
import { ProductDetailDialog } from "@/features/master-data/product/components/product/product-detail-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuotationProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Minimal product id from quotation item */
  productId: string | null;
}

/**
 * Wrapper that fetches the full product data before rendering ProductDetailDialog.
 * The product prop passed from quotation items only contains partial fields,
 * so we need to re-fetch to get the complete product information.
 */
export function QuotationProductDetailModal({
  open,
  onOpenChange,
  productId,
}: QuotationProductDetailModalProps) {
  const { data, isLoading } = useProduct(productId ?? "", {
    enabled: open && !!productId,
  });

  const product = data?.data ?? null;

  if (!productId) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="xl" className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              <Skeleton className="h-5 w-40" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ProductDetailDialog
      open={open}
      onOpenChange={onOpenChange}
      product={product}
    />
  );
}

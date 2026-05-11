"use client";

import { Minus, Plus, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OutletAddonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: number;
  max: number;
  quantity: number;
  onQuantityChange: (value: number) => void;
  unitPrice: number;
  isSubmitting: boolean;
  onSubmit: () => void;
};

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OutletAddonDialog({
  open,
  onOpenChange,
  current,
  max,
  quantity,
  onQuantityChange,
  unitPrice,
  isSubmitting,
  onSubmit,
}: OutletAddonDialogProps) {
  const t = useTranslations("outlet");
  const total = Math.max(1, quantity) * Math.max(0, unitPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            {t("outlet.addon.title")}
          </DialogTitle>
          <DialogDescription>
            {t("outlet.addon.description", { current, max })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("outlet.addon.unitPrice")}</span>
              <span className="font-medium">{formatIDR(unitPrice)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-center">{t("outlet.addon.quantityLabel")}</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={isSubmitting || quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-16 text-center text-lg font-semibold tabular-nums">{quantity}</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onQuantityChange(Math.min(99, quantity + 1))}
                disabled={isSubmitting || quantity >= 99}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("outlet.addon.totalPrice")}</span>
              <span className="font-semibold">{formatIDR(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? t("outlet.addon.processing") : t("outlet.addon.continuePayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

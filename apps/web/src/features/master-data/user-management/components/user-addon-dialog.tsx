"use client";

import { Minus, Plus, Users } from "lucide-react";
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

type UserAddonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: number;
  max: number;
  quantity: number;
  onQuantityChange: (value: number) => void;
  unitPrice: number;
  billingPeriod: string;
  isSubmitting: boolean;
  onSubmit: () => void;
};

const MAX_ADDON_QUANTITY = 99;

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function UserAddonDialog({
  open,
  onOpenChange,
  current,
  max,
  quantity,
  onQuantityChange,
  unitPrice,
  billingPeriod,
  isSubmitting,
  onSubmit,
}: UserAddonDialogProps) {
  const t = useTranslations("userManagement.list");
  const total = Math.max(1, quantity) * Math.max(0, unitPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("addon.title")}
          </DialogTitle>
          <DialogDescription>{t("addon.description", { current, max })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("addon.unitPrice")}</span>
              <span className="font-medium">
                {formatIDR(unitPrice)} / {billingPeriod}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-center text-sm font-medium">{t("addon.quantityLabel")}</p>
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
                onClick={() => onQuantityChange(Math.min(MAX_ADDON_QUANTITY, quantity + 1))}
                disabled={isSubmitting || quantity >= MAX_ADDON_QUANTITY}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("addon.totalPrice")}</span>
              <span className="font-semibold">{formatIDR(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("cancelAddOn")}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? t("addon.processing") : t("addon.continuePayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
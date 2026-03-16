"use client";

import { AlertTriangle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface WarehouseDeleteBlockedDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function WarehouseDeleteBlockedDialog({
  open,
  onOpenChange,
}: WarehouseDeleteBlockedDialogProps) {
  const t = useTranslations("warehouse");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">{t("warehouse.deleteBlocked.title")}</DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                {t("warehouse.deleteBlocked.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            {t("warehouse.deleteBlocked.transferFirst")}
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer mt-2 sm:mt-0"
          >
            {t("warehouse.deleteBlocked.close")}
          </Button>
          <Button asChild className="cursor-pointer">
            <Link href="/stock/movements">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {t("warehouse.deleteBlocked.goToStockMovement")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

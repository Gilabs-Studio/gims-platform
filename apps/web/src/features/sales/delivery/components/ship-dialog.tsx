"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trackingNumber: string) => Promise<void>;
  isLoading: boolean;
  initialTrackingNumber?: string;
}

export function ShipDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  initialTrackingNumber = "",
}: ShipDialogProps) {
  const t = useTranslations("delivery");
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);

  // Update state when initialTrackingNumber changes or dialog opens
  if (open && trackingNumber === "" && initialTrackingNumber !== "" && trackingNumber !== initialTrackingNumber) {
     setTrackingNumber(initialTrackingNumber);
  }

  // Effect to reset or set initial value when dialog opens
  useEffect(() => {
    if (open) {
      setTrackingNumber(initialTrackingNumber || "");
    }
  }, [open, initialTrackingNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    await onConfirm(trackingNumber);
    setTrackingNumber("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("actions.ship")}</DialogTitle>
          <DialogDescription>
            {t("batchSelection.enterTrackingNumber")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tracking-number">{t("trackingNumber")}</Label>
              <Input
                id="tracking-number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t("trackingNumber")}
                autoFocus
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !trackingNumber.trim()} className="cursor-pointer">
              {isLoading ? (
                <>
                  <Truck className="mr-2 h-4 w-4 animate-bounce" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  {t("actions.ship")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

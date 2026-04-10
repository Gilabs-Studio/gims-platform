"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useVoidOrder } from "../hooks/use-pos";
import { Loader2 } from "lucide-react";

interface VoidOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  onSuccess: () => void;
}

export function VoidOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  onSuccess,
}: VoidOrderDialogProps) {
  const [reason, setReason] = useState("");
  const voidOrder = useVoidOrder();

  async function handleSubmit() {
    if (reason.trim().length < 3) return;
    await voidOrder.mutateAsync({ id: orderId, data: { reason: reason.trim() } });
    setReason("");
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Void Order #{orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason for voiding</Label>
          <Textarea
            id="void-reason"
            placeholder="Enter reason (minimum 3 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. Stock will be restored.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={voidOrder.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            onClick={handleSubmit}
            disabled={reason.trim().length < 3 || voidOrder.isPending}
          >
            {voidOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Void Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

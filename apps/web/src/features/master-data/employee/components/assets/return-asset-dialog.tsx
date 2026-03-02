"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EmployeeAsset, AssetCondition } from "../../types";
import { useReturnEmployeeAsset } from "../../hooks/use-employees";

const CONDITION_OPTIONS: AssetCondition[] = [
  "NEW",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
];

interface ReturnAssetDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly asset: EmployeeAsset | null;
  readonly onSuccess?: () => void;
}

export function ReturnAssetDialog({
  open,
  onOpenChange,
  employeeId,
  asset,
  onSuccess,
}: ReturnAssetDialogProps) {
  const t = useTranslations("employee");
  const returnMutation = useReturnEmployeeAsset();

  const [returnDate, setReturnDate] = useState<Date | undefined>(new Date());
  const [returnCondition, setReturnCondition] = useState<string>("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setReturnDate(new Date());
    setReturnCondition("");
    setNotes("");
  };

  const borrowDate = asset?.borrow_date
    ? (() => {
        const d = new Date(asset.borrow_date);
        d.setHours(0, 0, 0, 0);
        return d;
      })()
    : undefined;

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!asset) return;

    if (!returnDate || !returnCondition) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      return_date: format(returnDate, "yyyy-MM-dd"),
      return_condition: returnCondition as AssetCondition,
      notes: notes || undefined,
    };

    try {
      await returnMutation.mutateAsync({
        employeeId,
        assetId: asset.id,
        data: payload,
      });
      toast.success(t("asset.success.returned"));
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("asset.error.returnFailed"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("asset.form.returnTitle")}</DialogTitle>
          <DialogDescription>
            {t("asset.form.returnConfirm")}
          </DialogDescription>
        </DialogHeader>

        {asset && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">
                {t("asset.fields.assetCode")}:
              </span>{" "}
              <span className="font-medium">{asset.asset_code}</span>
            </p>
            <p>
              <span className="text-muted-foreground">
                {t("asset.fields.assetName")}:
              </span>{" "}
              <span className="font-medium">{asset.asset_name}</span>
            </p>
            <p>
              <span className="text-muted-foreground">
                {t("asset.form.borrowedSince")}:
              </span>{" "}
              <span className="font-medium">
                {asset.borrow_date
                  ? format(new Date(asset.borrow_date), "PPP")
                  : "-"}
              </span>
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("asset.fields.returnDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !returnDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate
                      ? format(returnDate, "PPP")
                      : t("asset.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={
                      borrowDate
                        ? (date) => date < borrowDate
                        : undefined
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("asset.fields.returnCondition")} *</Label>
              <Select
                value={returnCondition}
                onValueChange={setReturnCondition}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue
                    placeholder={t("asset.form.selectCondition")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c} className="cursor-pointer">
                      {t(`asset.conditions.${c}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("asset.fields.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("asset.form.notesPlaceholder")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={returnMutation.isPending}
            className="cursor-pointer"
          >
            {returnMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {returnMutation.isPending
              ? t("asset.actions.processing")
              : t("asset.actions.return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

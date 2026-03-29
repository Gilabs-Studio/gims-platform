"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
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
import { CalendarIcon, Loader2, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import {
  useCreateEmployeeAsset,
  useAvailableAssets,
} from "../../hooks/use-employees";
import type { AssetCondition, AvailableAsset } from "../../types";

const CONDITION_OPTIONS: AssetCondition[] = [
  "NEW",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
];

interface CreateAssetDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly onSuccess?: () => void;
}

export function CreateAssetDialog({
  open,
  onOpenChange,
  employeeId,
  onSuccess,
}: CreateAssetDialogProps) {
  const t = useTranslations("employee");
  const createMutation = useCreateEmployeeAsset();
  const { data: availableAssets, isLoading: isLoadingAssets } =
    useAvailableAssets({ enabled: open });

  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [borrowDate, setBorrowDate] = useState<Date | undefined>(new Date());
  const [borrowCondition, setBorrowCondition] = useState<string>("");
  const [assetImage, setAssetImage] = useState("");
  const [notes, setNotes] = useState("");

  const selectedAsset = useMemo(() => {
    return availableAssets?.find((a) => a.id === selectedAssetId);
  }, [availableAssets, selectedAssetId]);

  const resetForm = () => {
    setSelectedAssetId("");
    setBorrowDate(new Date());
    setBorrowCondition("");
    setAssetImage("");
    setNotes("");
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedAssetId || !borrowDate || !borrowCondition) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!selectedAsset) {
      toast.error("Selected asset not found");
      return;
    }

    const payload = {
      asset_id: selectedAssetId,
      asset_name: selectedAsset.name,
      asset_code: selectedAsset.code,
      asset_category: selectedAsset.category?.name || "Uncategorized",
      borrow_date: format(borrowDate, "yyyy-MM-dd"),
      borrow_condition: borrowCondition as AssetCondition,
      asset_image: assetImage || selectedAsset.asset_image || undefined,
      notes: notes || undefined,
    };

    try {
      await createMutation.mutateAsync({ employeeId, data: payload });
      toast.success(t("asset.success.created"));
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("asset.error.createFailed"));
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("asset.form.createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label>{t("asset.fields.selectAsset")} *</Label>
            <Select
              value={selectedAssetId}
              onValueChange={setSelectedAssetId}
              disabled={isLoadingAssets}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue
                  placeholder={
                    isLoadingAssets
                      ? t("asset.form.loadingAssets")
                      : t("asset.form.selectAssetPlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {availableAssets?.map((asset: AvailableAsset) => (
                  <SelectItem
                    key={asset.id}
                    value={asset.id}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-muted-foreground">
                        ({asset.code})
                      </span>
                      {asset.category && (
                        <span className="text-xs text-muted-foreground ml-1">
                          - {asset.category.name}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Asset Info */}
          {selectedAsset && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedAsset.name}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {t("asset.fields.assetCode")}: {selectedAsset.code}
                </p>
                {selectedAsset.category && (
                  <p>
                    {t("asset.fields.assetCategory")}:{" "}
                    {selectedAsset.category.name}
                  </p>
                )}
                {selectedAsset.location && (
                  <p>
                    {t("asset.fields.location")}: {selectedAsset.location.name}
                  </p>
                )}
                {selectedAsset.asset_image && !assetImage && (
                  <p className="text-xs text-green-600">
                    {t("asset.form.hasDefaultImage")}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("asset.fields.borrowDate")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !borrowDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {borrowDate
                      ? format(borrowDate, "PPP")
                      : t("asset.form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={borrowDate}
                    onSelect={setBorrowDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("asset.fields.borrowCondition")} *</Label>
              <Select
                value={borrowCondition}
                onValueChange={setBorrowCondition}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("asset.form.selectCondition")} />
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
            <Label>{t("asset.fields.assetImage")}</Label>
            <FileUpload
              value={assetImage}
              onChange={(url) => setAssetImage(url ?? "")}
              accept=".jpg,.jpeg,.png,.webp"
              uploadEndpoint="/upload/image"
            />
            <p className="text-xs text-muted-foreground">
              {t("asset.form.imageHint")}
            </p>
            {selectedAsset?.asset_image && !assetImage && (
              <p className="text-xs text-green-600">
                {t("asset.form.willUseDefaultImage")}
              </p>
            )}
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
            disabled={createMutation.isPending || !selectedAssetId}
            className="cursor-pointer"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {createMutation.isPending
              ? t("asset.actions.processing")
              : t("asset.actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

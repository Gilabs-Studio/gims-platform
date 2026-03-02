"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
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
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import { useCreateEmployeeAsset } from "../../hooks/use-employees";
import type { AssetCondition } from "../../types";

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

  const [assetName, setAssetName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [borrowDate, setBorrowDate] = useState<Date | undefined>(new Date());
  const [borrowCondition, setBorrowCondition] = useState<string>("");
  const [assetImage, setAssetImage] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setAssetName("");
    setAssetCode("");
    setAssetCategory("");
    setBorrowDate(new Date());
    setBorrowCondition("");
    setAssetImage("");
    setNotes("");
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!assetName || !assetCode || !assetCategory || !borrowDate || !borrowCondition) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      asset_name: assetName,
      asset_code: assetCode,
      asset_category: assetCategory,
      borrow_date: format(borrowDate, "yyyy-MM-dd"),
      borrow_condition: borrowCondition as AssetCondition,
      asset_image: assetImage || undefined,
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
          <div className="space-y-2">
            <Label>{t("asset.fields.assetName")} *</Label>
            <Input
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder={t("asset.form.assetNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("asset.fields.assetCode")} *</Label>
              <Input
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder={t("asset.form.assetCodePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("asset.fields.assetCategory")} *</Label>
              <Input
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value)}
                placeholder={t("asset.form.assetCategoryPlaceholder")}
              />
            </div>
          </div>

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
            <Label>{t("asset.fields.assetImage")}</Label>
            <FileUpload
              value={assetImage}
              onChange={setAssetImage}
              accept=".jpg,.jpeg,.png,.webp"
              uploadEndpoint="/upload/image"
            />
            <p className="text-xs text-muted-foreground">
              {t("asset.form.imageHint")}
            </p>
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
            disabled={createMutation.isPending}
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

"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";

import {
  depreciateAssetSchema,
  disposeAssetSchema,
  transferAssetSchema,
  type DepreciateAssetValues,
  type DisposeAssetValues,
  type TransferAssetValues,
} from "../schemas/asset.schema";
import type { Asset } from "../types";
import { useDepreciateFinanceAsset, useDisposeFinanceAsset, useTransferFinanceAsset } from "../hooks/use-finance-assets";

type ActionMode = "depreciate" | "transfer" | "dispose";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ActionMode;
  asset: Asset | null;
};

export function AssetActionsDialogs({ open, onOpenChange, mode, asset }: Props) {
  const t = useTranslations("financeAssets");

  const depreciateMutation = useDepreciateFinanceAsset();
  const transferMutation = useTransferFinanceAsset();
  const disposeMutation = useDisposeFinanceAsset();

  const { data: locationsData } = useFinanceAssetLocations({ page: 1, per_page: 100, sort_by: "name", sort_dir: "asc" });
  const locationOptions = locationsData?.data ?? [];

  const defaultDepreciate: DepreciateAssetValues = useMemo(
    () => ({ as_of_date: new Date().toISOString().slice(0, 10) }),
    [],
  );

  const defaultTransfer: TransferAssetValues = useMemo(
    () => ({
      location_id: asset?.location_id ?? "",
      transfer_date: new Date().toISOString().slice(0, 10),
      description: "",
    }),
    [asset?.location_id],
  );

  const defaultDispose: DisposeAssetValues = useMemo(
    () => ({ disposal_date: new Date().toISOString().slice(0, 10), description: "" }),
    [],
  );

  const depreciateForm = useForm<DepreciateAssetValues>({
    resolver: zodResolver(depreciateAssetSchema),
    defaultValues: defaultDepreciate,
  });

  const transferForm = useForm<TransferAssetValues>({
    resolver: zodResolver(transferAssetSchema),
    defaultValues: defaultTransfer,
  });

  const disposeForm = useForm<DisposeAssetValues>({
    resolver: zodResolver(disposeAssetSchema),
    defaultValues: defaultDispose,
  });

  const transferLocationId = useWatch({
    control: transferForm.control,
    name: "location_id",
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "depreciate") depreciateForm.reset(defaultDepreciate);
    if (mode === "transfer") transferForm.reset(defaultTransfer);
    if (mode === "dispose") disposeForm.reset(defaultDispose);
  }, [open, mode, defaultDepreciate, defaultTransfer, defaultDispose, depreciateForm, transferForm, disposeForm]);

  const isSubmitting = depreciateMutation.isPending || transferMutation.isPending || disposeMutation.isPending;

  const submitDepreciate = async (values: DepreciateAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await depreciateMutation.mutateAsync({ id, data: { as_of_date: values.as_of_date } });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitTransfer = async (values: TransferAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await transferMutation.mutateAsync({
        id,
        data: {
          location_id: values.location_id,
          transfer_date: values.transfer_date,
          description: values.description ?? "",
        },
      });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitDispose = async (values: DisposeAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await disposeMutation.mutateAsync({
        id,
        data: { disposal_date: values.disposal_date, description: values.description ?? "" },
      });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const title =
    mode === "depreciate" ? t("dialogs.depreciateTitle") : mode === "transfer" ? t("dialogs.transferTitle") : t("dialogs.disposeTitle");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {mode === "depreciate" && (
          <form className="space-y-4" onSubmit={depreciateForm.handleSubmit(submitDepreciate)}>
            <div className="space-y-2">
              <Label htmlFor="as_of_date">{t("fields.asOfDate")}</Label>
              <Input id="as_of_date" type="date" {...depreciateForm.register("as_of_date")} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "transfer" && (
          <form className="space-y-4" onSubmit={transferForm.handleSubmit(submitTransfer)}>
            <div className="space-y-2">
              <Label>{t("fields.location")}</Label>
              <Select
                value={transferLocationId || ""}
                onValueChange={(v) => transferForm.setValue("location_id", v, { shouldDirty: true })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="cursor-pointer">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_date">{t("fields.transferDate")}</Label>
              <Input id="transfer_date" type="date" {...transferForm.register("transfer_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_description">{t("dialogs.description")}</Label>
              <Textarea id="transfer_description" rows={4} {...transferForm.register("description")} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "dispose" && (
          <form className="space-y-4" onSubmit={disposeForm.handleSubmit(submitDispose)}>
            <div className="space-y-2">
              <Label htmlFor="disposal_date">{t("fields.disposalDate")}</Label>
              <Input id="disposal_date" type="date" {...disposeForm.register("disposal_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispose_description">{t("dialogs.description")}</Label>
              <Textarea id="dispose_description" rows={4} {...disposeForm.register("description")} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

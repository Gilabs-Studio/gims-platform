"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";

import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";

import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";

import {
  depreciateAssetSchema,
  disposeAssetSchema,
  transferAssetSchema,
  revalueAssetSchema,
  adjustAssetSchema,
  sellAssetSchema,
  assignAssetSchema,
  returnAssetSchema,
  type DepreciateAssetValues,
  type DisposeAssetValues,
  type TransferAssetValues,
  type RevalueAssetValues,
  type AdjustAssetValues,
  type SellAssetValues,
  type AssignAssetValues,
  type ReturnAssetValues,
} from "../schemas/asset.schema";
import type { Asset } from "../types";
import {
  useDepreciateFinanceAsset,
  useDisposeFinanceAsset,
  useTransferFinanceAsset,
  useRevalueFinanceAsset,
  useAdjustFinanceAsset,
  useSellFinanceAsset,
  useAssignAsset,
  useReturnAsset,
} from "../hooks/use-finance-assets";
import { DatePicker } from "./date-picker";

type ActionMode =
  | "depreciate"
  | "transfer"
  | "dispose"
  | "sell"
  | "revalue"
  | "adjust"
  | "assign"
  | "return";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ActionMode;
  asset: Asset | null;
};

export function AssetActionsDialogs({
  open,
  onOpenChange,
  mode,
  asset,
}: Props) {
  const t = useTranslations("financeAssets");

  const depreciateMutation = useDepreciateFinanceAsset();
  const transferMutation = useTransferFinanceAsset();
  const disposeMutation = useDisposeFinanceAsset();
  const revalueMutation = useRevalueFinanceAsset();
  const adjustMutation = useAdjustFinanceAsset();
  const sellMutation = useSellFinanceAsset();
  const assignMutation = useAssignAsset();
  const returnMutation = useReturnAsset();

  const { data: locationsData } = useFinanceAssetLocations({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });
  const locationOptions = locationsData?.data ?? [];

  const { data: employeesData } = useEmployees({ page: 1, per_page: 100 });
  const employeeOptions = employeesData?.data ?? [];

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
    () => ({
      disposal_date: new Date().toISOString().slice(0, 10),
      description: "",
    }),
    [],
  );

  const defaultRevalue: RevalueAssetValues = useMemo(
    () => ({
      new_cost: asset?.acquisition_cost ?? 0,
      transaction_date: new Date().toISOString().slice(0, 10),
      description: "",
    }),
    [asset?.acquisition_cost],
  );

  const defaultAdjust: AdjustAssetValues = useMemo(
    () => ({
      amount: 0,
      transaction_date: new Date().toISOString().slice(0, 10),
      description: "",
    }),
    [],
  );

  const defaultSell: SellAssetValues = useMemo(
    () => ({
      disposal_date: new Date().toISOString().slice(0, 10),
      sale_amount: 0,
      description: "",
    }),
    [],
  );

  const defaultAssign: AssignAssetValues = useMemo(
    () => ({
      employee_id: "",
      notes: "",
    }),
    [],
  );

  const defaultReturn: ReturnAssetValues = useMemo(
    () => ({
      return_date: new Date().toISOString().slice(0, 10),
      return_reason: "",
      notes: "",
    }),
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

  const revalueForm = useForm<RevalueAssetValues>({
    resolver: zodResolver(revalueAssetSchema),
    defaultValues: defaultRevalue,
  });

  const adjustForm = useForm<AdjustAssetValues>({
    resolver: zodResolver(adjustAssetSchema),
    defaultValues: defaultAdjust,
  });

  const sellForm = useForm<SellAssetValues>({
    resolver: zodResolver(sellAssetSchema),
    defaultValues: defaultSell,
  });

  const assignForm = useForm<AssignAssetValues>({
    resolver: zodResolver(assignAssetSchema),
    defaultValues: defaultAssign,
  });

  const returnForm = useForm<ReturnAssetValues>({
    resolver: zodResolver(returnAssetSchema),
    defaultValues: defaultReturn,
  });

  const transferLocationId = useWatch({
    control: transferForm.control,
    name: "location_id",
  });

  const assignEmployeeId = useWatch({
    control: assignForm.control,
    name: "employee_id",
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "depreciate") depreciateForm.reset(defaultDepreciate);
    if (mode === "transfer") transferForm.reset(defaultTransfer);
    if (mode === "dispose") disposeForm.reset(defaultDispose);
    if (mode === "revalue") revalueForm.reset(defaultRevalue);
    if (mode === "adjust") adjustForm.reset(defaultAdjust);
    if (mode === "sell") sellForm.reset(defaultSell);
    if (mode === "assign") assignForm.reset(defaultAssign);
    if (mode === "return") returnForm.reset(defaultReturn);
  }, [
    open,
    mode,
    defaultDepreciate,
    defaultTransfer,
    defaultDispose,
    defaultRevalue,
    defaultAdjust,
    defaultSell,
    defaultAssign,
    defaultReturn,
    depreciateForm,
    transferForm,
    disposeForm,
    revalueForm,
    adjustForm,
    sellForm,
    assignForm,
    returnForm,
  ]);

  const isSubmitting =
    depreciateMutation.isPending ||
    transferMutation.isPending ||
    disposeMutation.isPending ||
    revalueMutation.isPending ||
    adjustMutation.isPending ||
    sellMutation.isPending ||
    assignMutation.isPending ||
    returnMutation.isPending;

  const submitDepreciate = async (values: DepreciateAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await depreciateMutation.mutateAsync({
        id,
        data: { as_of_date: values.as_of_date },
      });
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
        data: {
          disposal_date: values.disposal_date,
          description: values.description ?? "",
        },
      });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitRevalue = async (values: RevalueAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await revalueMutation.mutateAsync({ id, data: values });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitAdjust = async (values: AdjustAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await adjustMutation.mutateAsync({ id, data: values });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitSell = async (values: SellAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await sellMutation.mutateAsync({
        id,
        data: {
          disposal_date: values.disposal_date,
          sale_amount: values.sale_amount,
          description: values.description ?? "",
        },
      });
      toast.success(t("toast.done"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitAssign = async (values: AssignAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await assignMutation.mutateAsync({
        id,
        data: {
          employee_id: values.employee_id,
          notes: values.notes ?? "",
        },
      });
      toast.success(t("toast.assigned"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const submitReturn = async (values: ReturnAssetValues) => {
    const id = asset?.id ?? "";
    if (!id) return;
    try {
      await returnMutation.mutateAsync({
        id,
        data: {
          return_date: values.return_date,
          return_reason: values.return_reason ?? "",
          notes: values.notes ?? "",
        },
      });
      toast.success(t("toast.returned"));
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const titleMap: Record<ActionMode, string> = {
    depreciate: t("dialogs.depreciateTitle"),
    transfer: t("dialogs.transferTitle"),
    sell: t("dialogs.sellTitle"),
    revalue: t("dialogs.revalueTitle"),
    adjust: t("dialogs.adjustTitle"),
    dispose: t("dialogs.disposeTitle"),
    assign: t("dialogs.assignTitle"),
    return: t("dialogs.returnTitle"),
  };
  const title = titleMap[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {mode === "depreciate" && (
          <form
            className="space-y-4"
            onSubmit={depreciateForm.handleSubmit(submitDepreciate)}
          >
            <div className="space-y-2">
              <Label htmlFor="as_of_date">{t("fields.asOfDate")}</Label>
              <Controller
                name="as_of_date"
                control={depreciateForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="as_of_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "transfer" && (
          <form
            className="space-y-4"
            onSubmit={transferForm.handleSubmit(submitTransfer)}
          >
            <div className="space-y-2">
              <Label>{t("fields.location")}</Label>
              <Select
                value={transferLocationId || ""}
                onValueChange={(v) =>
                  transferForm.setValue("location_id", v, { shouldDirty: true })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((l) => (
                    <SelectItem
                      key={l.id}
                      value={l.id}
                      className="cursor-pointer"
                    >
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust_date">{t("fields.transactionDate")}</Label>
              <Controller
                name="transaction_date"
                control={adjustForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="adjust_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_description">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="transfer_description"
                rows={4}
                {...transferForm.register("description")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "dispose" && (
          <form
            className="space-y-4"
            onSubmit={disposeForm.handleSubmit(submitDispose)}
          >
            <div className="space-y-2">
              <Label htmlFor="sell_disposal_date">
                {t("fields.disposalDate")}
              </Label>
              <Controller
                name="disposal_date"
                control={sellForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="sell_disposal_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispose_description">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="dispose_description"
                rows={4}
                {...disposeForm.register("description")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "revalue" && (
          <form
            className="space-y-4"
            onSubmit={revalueForm.handleSubmit(submitRevalue)}
          >
            <div className="space-y-2">
              <Label htmlFor="revalue_new_cost">{t("fields.newCost")}</Label>
              <Controller
                name="new_cost"
                control={revalueForm.control}
                render={({ field }) => (
                  <NumericInput
                    id="revalue_new_cost"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revalue_date">
                {t("fields.transactionDate")}
              </Label>
              <Controller
                name="transaction_date"
                control={revalueForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="revalue_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revalue_description">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="revalue_description"
                rows={4}
                {...revalueForm.register("description")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "adjust" && (
          <form
            className="space-y-4"
            onSubmit={adjustForm.handleSubmit(submitAdjust)}
          >
            <div className="space-y-2">
              <Label htmlFor="adjust_amount">{t("fields.amount")}</Label>
              <Controller
                name="amount"
                control={adjustForm.control}
                render={({ field }) => (
                  <NumericInput
                    id="adjust_amount"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust_date">{t("fields.transactionDate")}</Label>
              <Controller
                name="transaction_date"
                control={adjustForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="adjust_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust_description">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="adjust_description"
                rows={4}
                {...adjustForm.register("description")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "sell" && (
          <form
            className="space-y-4"
            onSubmit={sellForm.handleSubmit(submitSell)}
          >
            <div className="space-y-2">
              <Label htmlFor="sell_disposal_date">
                {t("fields.disposalDate")}
              </Label>
              <Controller
                name="disposal_date"
                control={sellForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="sell_disposal_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell_sale_amount">
                {t("dialogs.saleAmount")}
              </Label>
              <Controller
                name="sale_amount"
                control={sellForm.control}
                render={({ field }) => (
                  <NumericInput
                    id="sell_sale_amount"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell_description">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="sell_description"
                rows={4}
                {...sellForm.register("description")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "assign" && (
          <form
            className="space-y-4"
            onSubmit={assignForm.handleSubmit(submitAssign)}
          >
            <div className="space-y-2">
              <Label>{t("dialogs.employee")}</Label>
              <Select
                value={assignEmployeeId || ""}
                onValueChange={(v) =>
                  assignForm.setValue("employee_id", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                      className="cursor-pointer"
                    >
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignForm.formState.errors.employee_id && (
                <p className="text-sm text-destructive">
                  {assignForm.formState.errors.employee_id.message || "Employee is required"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign_notes">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="assign_notes"
                rows={4}
                {...assignForm.register("notes")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === "return" && (
          <form
            className="space-y-4"
            onSubmit={returnForm.handleSubmit(submitReturn)}
          >
            <div className="space-y-2">
              <Label htmlFor="return_date">{t("dialogs.returnDate")}</Label>
              <Controller
                name="return_date"
                control={returnForm.control}
                render={({ field }) => (
                  <DatePicker
                    id="return_date"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("placeholders.selectDate")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_reason">
                {t("dialogs.returnReason")}
              </Label>
              <Textarea
                id="return_reason"
                rows={3}
                {...returnForm.register("return_reason")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_notes">
                {t("dialogs.description")}
              </Label>
              <Textarea
                id="return_notes"
                rows={3}
                {...returnForm.register("notes")}
              />
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
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {t("dialogs.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

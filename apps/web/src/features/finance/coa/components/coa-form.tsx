"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { coaFormSchema, type CoaFormValues } from "../schemas/coa.schema";
import type { ChartOfAccount, CoaType } from "../types";
import { useCreateFinanceCoa, useUpdateFinanceCoa } from "../hooks/use-finance-coa";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    type: CoaType;
    parent_id?: string | null;
    is_active: boolean;
    is_postable?: boolean;
    is_protected?: boolean;
  } | null;
  parentOptions: Array<Pick<ChartOfAccount, "id" | "code" | "name">>;
};

const COA_TYPES: Array<{ value: CoaType; labelKey: string }> = [
  { value: "ASSET", labelKey: "asset" },
  { value: "LIABILITY", labelKey: "liability" },
  { value: "EQUITY", labelKey: "equity" },
  { value: "REVENUE", labelKey: "revenue" },
  { value: "EXPENSE", labelKey: "expense" },
  { value: "CASH_BANK", labelKey: "cash_bank" },
  { value: "CURRENT_ASSET", labelKey: "current_asset" },
  { value: "FIXED_ASSET", labelKey: "fixed_asset" },
  { value: "TRADE_PAYABLE", labelKey: "trade_payable" },
  { value: "COST_OF_GOODS_SOLD", labelKey: "cost_of_goods_sold" },
  { value: "SALARY_WAGES", labelKey: "salary_wages" },
  { value: "OPERATIONAL", labelKey: "operational" },
];

export function CoaForm({ open, onOpenChange, mode, initialData, parentOptions }: Props) {
  const t = useTranslations("financeCoa");

  const createMutation = useCreateFinanceCoa();
  const updateMutation = useUpdateFinanceCoa();

  const isProtected = mode === "edit" && (initialData?.is_protected ?? false);

  const defaultValues: CoaFormValues = useMemo(
    () => ({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      type: initialData?.type ?? "ASSET",
      parent_id: initialData?.parent_id ?? null,
      is_active: initialData?.is_active ?? true,
      is_postable: initialData?.is_postable ?? true,
    }),
    [initialData],
  );

  type ZodResolverSchemaArg = Parameters<typeof zodResolver>[0];

  const form = useForm<CoaFormValues>({
    resolver: zodResolver(coaFormSchema as unknown as ZodResolverSchemaArg) as unknown as Resolver<CoaFormValues>,
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const watchedParentId = useWatch({ control: form.control, name: "parent_id" });
  const watchedType = useWatch({ control: form.control, name: "type" });
  const watchedIsActive = useWatch({ control: form.control, name: "is_active" });
  const watchedIsPostable = useWatch({ control: form.control, name: "is_postable" });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: CoaFormValues) => {
    try {
      const payload = {
        code: values.code,
        name: values.name,
        type: values.type,
        parent_id: values.parent_id ?? null,
        is_active: values.is_active ?? true,
        is_postable: values.is_postable ?? true,
      };

      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success(t("toast.updated"));
      }

      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          {isProtected && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-100">
              <p className="font-medium">{t("messages.protectedAccount")}</p>
            </div>
          )}

          {/* Code Field */}
          <div className="space-y-2">
            <Label htmlFor="code" className="font-medium">{t("fields.code")}</Label>
            <Input
              id="code"
              {...form.register("code")}
              disabled={isProtected || (mode === "create" && (watchedParentId ?? null) !== null)}
              placeholder={mode === "create" && (watchedParentId ?? null) !== null ? t("messages.autoCodeFromParent") : t("placeholders.code")}
              className="font-mono"
            />
            {mode === "create" && (watchedParentId ?? null) !== null && (
              <p className="text-xs text-muted-foreground">{t("messages.autoCodeHint")}</p>
            )}
            {form.formState.errors.code && (
              <p className="text-sm text-destructive font-medium">{form.formState.errors.code.message}</p>
            )}
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="font-medium">{t("fields.name")}</Label>
            <Input
              id="name"
              {...form.register("name")}
              disabled={isProtected}
              placeholder={t("placeholders.name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive font-medium">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Type & Parent Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">{t("fields.type")}</Label>
              <Select
                value={watchedType}
                onValueChange={(v) => {
                  form.setValue("type", v as CoaType, { shouldDirty: true });
                }}
                disabled={isProtected}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  {COA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="cursor-pointer">
                      {t(`types.${type.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive font-medium">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">{t("fields.parent")}</Label>
              <Select
                value={watchedParentId ?? "__none__"}
                onValueChange={(v) => {
                  form.setValue("parent_id", v === "__none__" ? null : v, { shouldDirty: true });
                  if (mode === "create" && v !== "__none__") {
                    form.setValue("code", "", { shouldDirty: true, shouldValidate: true });
                  }
                }}
                disabled={isProtected}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("placeholders.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="cursor-pointer">
                    {t("messages.noParent")}
                  </SelectItem>
                  {parentOptions
                    .filter((p) => p.id !== (initialData?.id ?? ""))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                        {p.code} {t("fields.parentSeparator")} {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.parent_id && (
                <p className="text-sm text-destructive font-medium">{form.formState.errors.parent_id.message}</p>
              )}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{t("fields.isActive")}</div>
              <div className="text-xs text-muted-foreground">
                {watchedIsActive ?? true ? t("messages.accountActive") : t("messages.accountInactive")}
              </div>
            </div>
            <Switch
              checked={watchedIsActive ?? true}
              onCheckedChange={(checked) => {
                form.setValue("is_active", checked, { shouldDirty: true });
              }}
              className="cursor-pointer"
              disabled={isProtected}
            />
          </div>

          {/* Postable Toggle (Create mode only) */}
          {mode === "create" && (
            <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{t("fields.isPostable")}</div>
                <div className="text-xs text-muted-foreground">
                  {(watchedIsPostable ?? true) ? t("status.postable") : t("status.nonPostable")}
                </div>
              </div>
              <Switch
                checked={watchedIsPostable ?? true}
                onCheckedChange={(checked) => {
                  form.setValue("is_postable", checked, { shouldDirty: true });
                }}
                className="cursor-pointer"
                disabled={isProtected}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

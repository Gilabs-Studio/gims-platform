"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createLoyaltyProgramSchema,
  type CreateLoyaltyProgramFormValues,
} from "../schemas/loyalty.schema";
import { useCreateLoyaltyProgram, useUpdateLoyaltyProgram } from "../hooks/use-loyalty";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { LoyaltyProgram } from "../types";
import { useOutlets } from "@/features/master-data/outlet/hooks/use-outlets";

interface Props {
  open: boolean;
  onClose: () => void;
  program?: LoyaltyProgram | null;
}

const DEFAULT_CONFIG: CreateLoyaltyProgramFormValues["config"] = {
  point_rules: { amount_per_point: 10000, points_per_amount: 1 },
  tiers: [
    { name: "Bronze", min_lifetime_points: 0, multiplier: 1.0, badge_color: "#CD7F32" },
    { name: "Silver", min_lifetime_points: 500, multiplier: 1.5, badge_color: "#C0C0C0" },
    { name: "Gold", min_lifetime_points: 2000, multiplier: 2.0, badge_color: "#FFD700" },
  ],
  rewards: [
    {
      id: "discount-5k",
      name: "Diskon Rp 5.000",
      type: "discount_fixed",
      value: 5000,
      points_required: 50,
      is_active: true,
    },
  ],
  point_expiry_days: 365,
};

export function LoyaltyProgramFormDialog({ open, onClose, program }: Props) {
  const t = useTranslations("loyalty");
  const tCommon = useTranslations("common");
  const { user } = useAuthStore();
  const isOutletScoped = user?.role.data_scope === "OUTLET";
  const createMutation = useCreateLoyaltyProgram();
  const updateMutation = useUpdateLoyaltyProgram();
  // Admins fetch all outlets; outlet managers get their own outlets via RBAC.
  const { data: outletRes } = useOutlets({ page: 1, per_page: 100 }, { enabled: open });
  const outlets = outletRes?.data ?? [];
  // Stable primitive — safe as useEffect dependency (avoids infinite loop from array ref changes).
  const firstOutletId = outlets[0]?.id;

  const [activeTab, setActiveTab] = useState<"basic" | "config">("basic");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateLoyaltyProgramFormValues>({
    resolver: zodResolver(createLoyaltyProgramSchema),
    defaultValues: { config: DEFAULT_CONFIG, is_active: true },
  });

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({ control, name: "config.tiers" });

  const {
    fields: rewardFields,
    append: appendReward,
    remove: removeReward,
  } = useFieldArray({ control, name: "config.rewards" });

  useEffect(() => {
    if (program) {
      reset({
        name: program.name,
        description: program.description ?? "",
        outlet_id: program.outlet_id ?? "",
        is_active: program.is_active,
        config: {
          ...program.config,
          tiers: program.config.tiers.map((tier) => ({
            ...tier,
            min_lifetime_points: tier.min_lifetime_points ?? 0,
            multiplier: tier.multiplier ?? 1,
          })),
          rewards: program.config.rewards.map((reward) => ({
            ...reward,
            points_required: reward.points_required ?? 0,
            value: reward.value ?? 0,
            is_active: reward.is_active ?? true,
          })),
        },
      });
    } else {
      // When an outlet manager creates a new program, pre-select their first outlet.
      const defaultOutletId = isOutletScoped && firstOutletId ? firstOutletId : "";
      reset({ config: DEFAULT_CONFIG, is_active: true, outlet_id: defaultOutletId });
    }
  }, [program, reset, isOutletScoped, firstOutletId]);

  async function onSubmit(values: CreateLoyaltyProgramFormValues) {
    const payload = {
      ...values,
      outlet_id: values.outlet_id || undefined,
      config: {
        ...values.config,
        rewards: values.config.rewards.map((reward) => ({
          ...reward,
          is_active: reward.is_active ?? true,
        })),
      },
    };
    try {
      if (program) {
        await updateMutation.mutateAsync({ id: program.id, data: payload });
        toast.success(t("programs.updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("programs.created"));
      }
      setActiveTab("basic");
      onClose();
    } catch {
      toast.error("Operation failed");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setActiveTab("basic");
          onClose();
        }
      }}
    >
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{program ? t("programs.edit") : t("programs.create")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value === "config" ? "config" : "basic")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t("programs.tab.basic")}</TabsTrigger>
              <TabsTrigger value="config">{t("programs.tab.config")}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical" className="col-span-2">
                  <FieldLabel>{t("programs.form.name")}</FieldLabel>
                  <Input {...register("name")} />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
                <Field orientation="vertical" className="col-span-2">
                  <FieldLabel>{t("programs.form.description")}</FieldLabel>
                  <Textarea {...register("description")} rows={3} />
                </Field>
                <Field orientation="vertical" className="col-span-2">
                  <FieldLabel>{t("programs.form.outlet")}</FieldLabel>
                  <Controller
                    control={control}
                    name="outlet_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || "global"}
                        onValueChange={(value) => field.onChange(value === "global" ? "" : value)}
                        disabled={isOutletScoped}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("programs.global")} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Outlet managers cannot create global programs. */}
                          {!isOutletScoped && (
                            <SelectItem value="global">{t("programs.global")}</SelectItem>
                          )}
                          {outlets.map((outlet) => (
                            <SelectItem key={outlet.id} value={outlet.id}>
                              {outlet.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <Separator />

              {/* Point rules */}
              <div className="space-y-4">
                <h4 className="font-medium">{t("programs.form.pointRules")}</h4>
                <div className="grid grid-cols-1 gap-4">
                  <Field
                    orientation="vertical"
                    data-invalid={!!errors.config?.point_rules?.amount_per_point}
                  >
                    <FieldLabel>{t("programs.form.amountPerPoint")}</FieldLabel>
                    <Controller
                      control={control}
                      name="config.point_rules.amount_per_point"
                      render={({ field }) => (
                        <NumericInput
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          inputMode="numeric"
                        />
                      )}
                    />
                    {errors.config?.point_rules?.amount_per_point && (
                      <FieldError>{errors.config.point_rules.amount_per_point.message}</FieldError>
                    )}
                  </Field>

                  <Field
                    orientation="vertical"
                    data-invalid={!!errors.config?.point_rules?.points_per_amount}
                  >
                    <FieldLabel>{t("programs.form.pointsPerAmount")}</FieldLabel>
                    <Controller
                      control={control}
                      name="config.point_rules.points_per_amount"
                      render={({ field }) => (
                        <NumericInput
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          inputMode="numeric"
                        />
                      )}
                    />
                    {errors.config?.point_rules?.points_per_amount && (
                      <FieldError>{errors.config.point_rules.points_per_amount.message}</FieldError>
                    )}
                  </Field>

                  <Field
                    orientation="vertical"
                    data-invalid={!!errors.config?.point_expiry_days}
                  >
                    <FieldLabel>{t("programs.form.pointExpiryDays")}</FieldLabel>
                    <Controller
                      control={control}
                      name="config.point_expiry_days"
                      render={({ field }) => (
                        <NumericInput
                          ref={field.ref}
                          name={field.name}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                          inputMode="numeric"
                        />
                      )}
                    />
                    {errors.config?.point_expiry_days && (
                      <FieldError>{errors.config.point_expiry_days.message}</FieldError>
                    )}
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      id="isActive"
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
                <Label htmlFor="isActive">{t("programs.form.isActive")}</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setActiveTab("basic");
                  onClose();
                }}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" onClick={() => setActiveTab("config")}>
                  {tCommon("next")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-6 mt-4">
              {/* Tiers */}
              <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{t("programs.form.tiers")}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendTier({ name: "", min_lifetime_points: 0, multiplier: 1.0, badge_color: "#888888" })}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("programs.form.addTier")}
              </Button>
            </div>
            {tierFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-5 gap-2 items-end border rounded p-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.tier.name")}</Label>
                  <Input className="h-8 text-sm" {...register(`config.tiers.${index}.name`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.tier.minLifetimePoints")}</Label>
                  <Controller
                    control={control}
                    name={`config.tiers.${index}.min_lifetime_points`}
                    render={({ field: f }) => (
                      <NumericInput
                        ref={f.ref}
                        name={f.name}
                        value={f.value}
                        onBlur={f.onBlur}
                        onChange={f.onChange}
                        inputMode="numeric"
                        className="h-8 text-sm"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.tier.multiplier")}</Label>
                  <Controller
                    control={control}
                    name={`config.tiers.${index}.multiplier`}
                    render={({ field: f }) => (
                      <NumericInput
                        ref={f.ref}
                        name={f.name}
                        value={f.value}
                        onBlur={f.onBlur}
                        onChange={f.onChange}
                        step={0.1}
                        inputMode="decimal"
                        className="h-8 text-sm"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.tier.badgeColor")}</Label>
                  <Input
                    className="h-8 text-sm"
                    type="color"
                    {...register(`config.tiers.${index}.badge_color`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer text-destructive hover:text-destructive h-8 w-8"
                  onClick={() => removeTier(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Rewards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{t("programs.form.rewards")}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendReward({
                    id: `reward-${Date.now()}`,
                    name: "",
                    type: "discount_fixed",
                    value: 0,
                    points_required: 100,
                    is_active: true,
                    merch_description: undefined,
                  })
                }
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("programs.form.addReward")}
              </Button>
            </div>
            {rewardFields.map((field, index) => {
              const rewardType = field.type;
              return (
                <div key={field.id} className="space-y-2 border rounded p-2">
                  <div className="grid grid-cols-5 gap-2 items-end">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">{t("programs.reward.name")}</Label>
                      <Input className="h-8 text-sm" {...register(`config.rewards.${index}.name`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("programs.reward.type")}</Label>
                      <Controller
                        control={control}
                        name={`config.rewards.${index}.type`}
                        render={({ field: f }) => (
                          <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger className="h-8 text-sm cursor-pointer">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="discount_fixed">{t("programs.reward.typeDiscountFixed")}</SelectItem>
                              <SelectItem value="discount_percent">{t("programs.reward.typeDiscountPercent")}</SelectItem>
                              <SelectItem value="merch">{t("programs.reward.typeMerch")}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {rewardType === "merch"
                          ? t("programs.reward.value")
                          : rewardType === "discount_percent"
                          ? t("programs.reward.valuePercent")
                          : t("programs.reward.valueFixed")}
                      </Label>
                      <Controller
                        control={control}
                        name={`config.rewards.${index}.value`}
                        render={({ field: f }) => (
                          <NumericInput
                            ref={f.ref}
                            name={f.name}
                            value={f.value}
                            onBlur={f.onBlur}
                            onChange={f.onChange}
                            inputMode={rewardType === "discount_percent" ? "decimal" : "numeric"}
                            disabled={rewardType === "merch"}
                            className="h-8 text-sm"
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("programs.reward.pointsRequired")}</Label>
                      <Controller
                        control={control}
                        name={`config.rewards.${index}.points_required`}
                        render={({ field: f }) => (
                          <NumericInput
                            ref={f.ref}
                            name={f.name}
                            value={f.value}
                            onBlur={f.onBlur}
                            onChange={f.onChange}
                            inputMode="numeric"
                            className="h-8 text-sm"
                          />
                        )}
                      />
                    </div>
                  </div>
                  {rewardType === "merch" && (
                    <div className="space-y-1">
                      <Label className="text-xs">{t("programs.reward.merchDescription")}</Label>
                      <Input
                        className="h-8 text-sm"
                        placeholder={t("programs.reward.merchDescriptionPlaceholder")}
                        {...register(`config.rewards.${index}.merch_description`)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`config.rewards.${index}.is_active`}
                        render={({ field: f }) => (
                          <Switch
                            id={`reward-active-${index}`}
                            checked={!!f.value}
                            onCheckedChange={f.onChange}
                            className="cursor-pointer"
                          />
                        )}
                      />
                      <Label htmlFor={`reward-active-${index}`} className="text-xs cursor-pointer">
                        {t("programs.reward.isActive")}
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => removeReward(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>
              {tCommon("back")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
            </TabsContent>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
    { id: "discount-5k", name: "Diskon Rp 5.000", points_cost: 50, description: "Potongan Rp 5.000" },
  ],
  point_expiry_days: 365,
};

export function LoyaltyProgramFormDialog({ open, onClose, program }: Props) {
  const t = useTranslations("loyalty");
  const tCommon = useTranslations("common");
  const createMutation = useCreateLoyaltyProgram();
  const updateMutation = useUpdateLoyaltyProgram();
  const { data: outletRes } = useOutlets({ page: 1, per_page: 100 }, { enabled: open });
  const outlets = outletRes?.data ?? [];

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
        config: program.config,
      });
    } else {
      reset({ config: DEFAULT_CONFIG, is_active: true });
    }
  }, [program, reset]);

  async function onSubmit(values: CreateLoyaltyProgramFormValues) {
    const payload = { ...values, outlet_id: values.outlet_id || undefined };
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
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("programs.global")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">{t("programs.global")}</SelectItem>
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
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    {...register(`config.tiers.${index}.min_lifetime_points`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.tier.multiplier")}</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    step="0.1"
                    {...register(`config.tiers.${index}.multiplier`, { valueAsNumber: true })}
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
                onClick={() => appendReward({ id: `reward-${Date.now()}`, name: "", points_cost: 100, description: "" })}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("programs.form.addReward")}
              </Button>
            </div>
            {rewardFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-5 gap-2 items-end border rounded p-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.reward.name")}</Label>
                  <Input className="h-8 text-sm" {...register(`config.rewards.${index}.name`)} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">{t("programs.reward.description")}</Label>
                  <Input className="h-8 text-sm" {...register(`config.rewards.${index}.description`)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("programs.reward.pointsCost")}</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    {...register(`config.rewards.${index}.points_cost`, { valueAsNumber: true })}
                  />
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
            ))}
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

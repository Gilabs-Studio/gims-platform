"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Loader2,
  Wallet,
  PieChart,
  DollarSign,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import { DatePicker } from "@/features/finance/assets/components/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";

import {
  assetBudgetSchema,
  type AssetBudgetFormValues,
} from "../schemas/asset-budget.schema";
import {
  useCreateAssetBudget,
  useUpdateAssetBudget,
  useAssetBudgetFormData,
} from "../hooks/use-asset-budgets";
import type { AssetBudget } from "../types";

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  budget?: AssetBudget | null;
}

export function BudgetForm({
  open,
  onOpenChange,
  mode,
  budget,
}: BudgetFormProps) {
  const t = useTranslations("assetBudget");
  const [activeTab, setActiveTab] = useState("basic");
  const createMutation = useCreateAssetBudget();
  const updateMutation = useUpdateAssetBudget();
  const { data: formData } = useAssetBudgetFormData();

  const categories = formData?.data?.categories || [];

  const defaultValues: AssetBudgetFormValues = useMemo(
    () => ({
      budget_name: budget?.budget_name || "",
      description: budget?.description || "",
      fiscal_year: budget?.fiscal_year || new Date().getFullYear(),
      start_date: budget?.start_date || "",
      end_date: budget?.end_date || "",
      categories:
        budget?.categories.map((cat) => ({
          id: cat.id,
          category_id: cat.category_id || undefined,
          category_name: cat.category_name,
          allocated_amount: cat.allocated_amount,
          notes: cat.notes || "",
        })) || [],
    }),
    [budget],
  );

  const form = useForm<AssetBudgetFormValues>({
    resolver: zodResolver(assetBudgetSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setActiveTab("basic");
    }
  }, [open, defaultValues, form]);

  const totalAllocated =
    form
      .watch("categories")
      ?.reduce((sum, cat) => sum + (cat.allocated_amount || 0), 0) || 0;

  const onSubmit = async (values: AssetBudgetFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(values);
      } else if (budget) {
        await updateMutation.mutateAsync({ id: budget.id, data: values });
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("form.createTitle") : t("form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("form.budgetInfo")}</TabsTrigger>
            <TabsTrigger value="categories">
              {t("form.categories")} ({fields.length})
            </TabsTrigger>
          </TabsList>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-4"
          >
            <TabsContent value="basic" className="space-y-6 mt-0">
              {/* Budget Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">
                    {t("form.budgetInfo")}
                  </h3>
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("fields.budgetName")} *</Label>
                    <Input
                      {...form.register("budget_name")}
                      placeholder={t("fields.budgetName")}
                    />
                    {form.formState.errors.budget_name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.budget_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("fields.fiscalYear")} *</Label>
                    <Input
                      type="number"
                      {...form.register("fiscal_year", { valueAsNumber: true })}
                    />
                    {form.formState.errors.fiscal_year && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.fiscal_year.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("fields.startDate")} *</Label>
                    <Controller
                      name="start_date"
                      control={form.control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    {form.formState.errors.start_date && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.start_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("fields.endDate")} *</Label>
                    <Controller
                      name="end_date"
                      control={form.control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    {form.formState.errors.end_date && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.end_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>{t("fields.description")}</Label>
                    <Textarea
                      {...form.register("description")}
                      rows={3}
                      placeholder={t("fields.description")}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Summary Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <PieChart className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("form.summary")}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("summary.totalAllocated")}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(totalAllocated)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Jumlah Kategori
                    </p>
                    <p className="text-2xl font-bold">{fields.length}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("form.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab("categories")}
                >
                  {t("common.next") || "Next"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4 mt-0">
              {/* Categories Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">
                      {t("form.categories")}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        category_name: "",
                        allocated_amount: 0,
                        notes: "",
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("actions.addCategory")}
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    {t("messages.noCategories")}
                  </p>
                )}

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border rounded-lg p-4 space-y-3 bg-card"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">
                          Kategori {index + 1}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {t("fields.category")} *
                          </Label>
                          <Controller
                            name={`categories.${index}.category_name`}
                            control={form.control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t(
                                      "placeholders.selectCategory",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {form.formState.errors.categories?.[index]
                            ?.category_name && (
                            <p className="text-xs text-destructive">
                              {
                                form.formState.errors.categories[index]
                                  ?.category_name?.message
                              }
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">
                            {t("fields.allocatedAmount")} *
                          </Label>
                          <Controller
                            name={`categories.${index}.allocated_amount`}
                            control={form.control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="0"
                              />
                            )}
                          />
                          {form.formState.errors.categories?.[index]
                            ?.allocated_amount && (
                            <p className="text-xs text-destructive">
                              {
                                form.formState.errors.categories[index]
                                  ?.allocated_amount?.message
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">{t("fields.notes")}</Label>
                        <Textarea
                          {...form.register(`categories.${index}.notes`)}
                          rows={2}
                          placeholder={t("fields.notes")}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {form.formState.errors.categories &&
                  typeof form.formState.errors.categories === "object" &&
                  "message" in form.formState.errors.categories && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.categories.message}
                    </p>
                  )}
              </div>

              {/* Navigation and Submit Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("basic")}
                >
                  {t("common.back") || "Back"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    {t("form.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <ButtonLoading
                      loading={isSubmitting}
                      loadingText={t("common.saving")}
                    >
                      {mode === "create"
                        ? t("common.create")
                        : t("common.update")}
                    </ButtonLoading>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

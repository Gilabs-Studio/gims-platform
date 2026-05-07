"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ButtonLoading } from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductCategoryDialog } from "../product-category/product-category-dialog";
import { UnitOfMeasureDialog } from "../unit-of-measure/unit-of-measure-dialog";

import type { Product } from "../../types";
import { useProductForm } from "../../hooks/use-product-form";

// Section component for grouping form fields
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Product | null;
  onCreated?: (item: { id: string; name: string }) => void;
  defaultProductKind?: "STOCK" | "RECIPE" | "SERVICE";
}

export function ProductDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
  defaultProductKind,
}: ProductDialogProps) {
  const {
    form,
    t,
    tCommon,
    isEditing,
    isSubmitting,
    categories,
    brands,
    segments,
    types,
    uoms,
    packagings,
    procurementTypes,
    outlets,
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    handleCategoryCreated,
    handleUomCreated,
    handlePurchaseUomCreated,
    handleAutoCreateBrand,
    handleAutoCreateSegment,
    handleAutoCreateType,
    handleAutoCreatePackaging,
    handleAutoCreateProcurementType,
    onSubmit,
  } = useProductForm({ open, onOpenChange, editingItem, onCreated, defaultProductKind });

  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;


  const outletIds = watch("outlet_ids") ?? [];
  const posScope = watch("pos_scope") ?? "none";
  const isTaxInclusive = watch("is_tax_inclusive");

  const [outletSearch, setOutletSearch] = useState("");
  const filteredOutlets = outletSearch.trim()
    ? outlets.filter((o) => o.name.toLowerCase().includes(outletSearch.toLowerCase()))
    : outlets;

  // Watch IDs for Select values
  const categoryId = watch("category_id");
  const brandId = watch("brand_id");
  const segmentId = watch("segment_id");
  const typeId = watch("type_id");
  const uomId = watch("uom_id");
  const purchaseUomId = watch("purchase_uom_id");
  const packagingId = watch("packaging_id");
  const procurementTypeId = watch("procurement_type_id");

  const validationErrors = [
    { label: t("form.name"), message: errors.name?.message },
    { label: t("conversion"), message: errors.purchase_uom_conversion?.message },
    { label: t("form.costPrice"), message: errors.cost_price?.message },
    { label: t("form.sellingPrice"), message: errors.selling_price?.message },
    { label: `${t("leadTime")} (${t("days")})`, message: errors.lead_time_days?.message },
    { label: t("form.minStock"), message: errors.min_stock?.message },
    { label: t("form.maxStock"), message: errors.max_stock?.message },
    { label: t("recipe.title"), message: errors.recipe_items?.message },
  ].filter((item): item is { label: string; message: string } => typeof item.message === "string" && item.message.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{isEditing ? t("edit") : t("create")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="mx-6 mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
            >
              <p className="text-sm font-semibold text-destructive">
                {tCommon("error")}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {validationErrors.map((error) => (
                  <li key={error.label} className="flex gap-2">
                    <span className="font-medium">{error.label}:</span>
                    <span className="text-destructive">{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 space-y-6">
            {/* Basic Information */}
            <Section title={t("section.basicInfo")}>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3">
                  <FieldLabel>{t("image")}</FieldLabel>
                  <ImageUpload
                    value={watch("image_url")}
                    onChange={(url) => setValue("image_url", url || null, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    disabled={isSubmitting}
                    enableUrlInput
                    enableImageSearch
                    initialSearchQuery={watch("name")}
                    labels={{
                      dragActive: tCommon("dragActive"),
                      dragInactive: tCommon("dragInactive"),
                      uploadSuccess: tCommon("uploadSuccess"),
                      uploadFailed: tCommon("uploadFailed"),
                      invalidFile: tCommon("invalidFile"),
                      removeImage: tCommon("removeImage"),
                      pasteImageUrl: t("imageAssist.pasteImageUrl"),
                      imageUrlPlaceholder: t("imageAssist.imageUrlPlaceholder"),
                      applyUrl: t("imageAssist.applyUrl"),
                      searchImage: t("imageAssist.searchImage"),
                      searchPlaceholder: t("imageAssist.searchPlaceholder"),
                      searchButton: t("imageAssist.searchButton"),
                      searchNoResults: t("imageAssist.searchNoResults"),
                      searchFailed: t("imageAssist.searchFailed"),
                      selectFromResults: t("imageAssist.selectFromResults"),
                      attributionPrefix: t("imageAssist.attributionPrefix"),
                      onUnsplash: t("imageAssist.onUnsplash"),
                      termsNotice: t("imageAssist.termsNotice"),
                    }}
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <Field>
                    <FieldLabel className="required">{t("form.name")}</FieldLabel>
                    <Input placeholder={t("form.name")} {...register("name")} />
                    {errors.name && <FieldError>{errors.name.message}</FieldError>}
                  </Field>
                  <Field>
                    <FieldLabel>{t("mpn")}</FieldLabel>
                    <Input
                      placeholder={t("mpnPlaceholder")}
                      {...register("manufacturer_part_number")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t("form.description")}</FieldLabel>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      className="resize-none"
                      rows={4}
                      {...register("description")}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Separator />

            {/* Classification */}
            <Section title={t("section.classification")}>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("form.category")}</FieldLabel>
                  <CreatableCombobox
                    value={categoryId ?? ""}
                    onValueChange={(val) => setValue("category_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    placeholder={t("selectCategory")}
                    createPermission="product_category.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={(q) => openQuickCreate("category", q)}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.brand")}</FieldLabel>
                  <CreatableCombobox
                    value={brandId ?? ""}
                    onValueChange={(val) => setValue("brand_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={brands.map(b => ({ value: b.id, label: b.name }))}
                    placeholder={t("selectBrand")}
                    createPermission="product_brand.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={handleAutoCreateBrand}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.segment")}</FieldLabel>
                  <CreatableCombobox
                    value={segmentId ?? ""}
                    onValueChange={(val) => setValue("segment_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={segments.map(b => ({ value: b.id, label: b.name }))}
                    placeholder={t("selectSegment")}
                    createPermission="product_segment.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={handleAutoCreateSegment}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.type")}</FieldLabel>
                  <CreatableCombobox
                    value={typeId ?? ""}
                    onValueChange={(val) => setValue("type_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={types.map(b => ({ value: b.id, label: b.name }))}
                    placeholder="Select Type"
                    createPermission="product_type.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={handleAutoCreateType}
                  />
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Units & Packaging */}
            <Section title={t("section.unitsPackaging")}>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("form.uom")}</FieldLabel>
                  <CreatableCombobox
                    value={uomId ?? ""}
                    onValueChange={(val) => setValue("uom_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={uoms.map(b => ({ value: b.id, label: `${b.name} (${b.symbol})` }))}
                    placeholder="Base Unit"
                    createPermission="unit_of_measure.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={(q) => openQuickCreate("uom", q)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Purchase UoM</FieldLabel>
                  <CreatableCombobox
                    value={purchaseUomId ?? ""}
                    onValueChange={(val) => setValue("purchase_uom_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={uoms.map(b => ({ value: b.id, label: `${b.name} (${b.symbol})` }))}
                    placeholder={t("unitsPerPurchase")}
                    createPermission="unit_of_measure.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={(q) => openQuickCreate("purchaseUom", q)}
                  />
                </Field>
                <Field>
                  <FieldLabel className="required">{t("conversion")}</FieldLabel>
                  <Controller
                    name="purchase_uom_conversion"
                    control={control}
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="1"
                      />
                    )}
                  />
                  {errors.purchase_uom_conversion && (
                    <FieldError>{errors.purchase_uom_conversion.message}</FieldError>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("unitsPerPurchase")}
                  </p>
                </Field>
                <Field>
                  <FieldLabel>{t("form.packaging")}</FieldLabel>
                  <CreatableCombobox
                    value={packagingId ?? "none"}
                    onValueChange={(val) => setValue("packaging_id", val === "none" ? null : val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={[{ value: "none", label: "None" }, ...packagings.map(b => ({ value: b.id, label: b.name }))]}
                    placeholder={t("selectPackaging")}
                    createPermission="packaging.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={handleAutoCreatePackaging}
                  />
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Supply Chain */}
            <Section title={t("section.supplyChain")}>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("form.procurementType")}</FieldLabel>
                  <CreatableCombobox
                    value={procurementTypeId ?? ""}
                    onValueChange={(val) => setValue("procurement_type_id", val, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                    options={procurementTypes.map(b => ({ value: b.id, label: b.name }))}
                    placeholder="Select Type"
                    createPermission="procurement_type.create"
                    createLabel={`${t("create")} "{query}"`}
                    onCreateClick={handleAutoCreateProcurementType}
                  />
                </Field>
                <Field>
                  <FieldLabel className="required">{t("leadTime")} ({t("days")})</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("lead_time_days", { valueAsNumber: true })}
                  />
                  {errors.lead_time_days && (
                    <FieldError>{errors.lead_time_days.message}</FieldError>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("taxType")}</FieldLabel>
                  <Select
                    value={watch("tax_type")}
                    onValueChange={(val) => setValue("tax_type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectTax")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPN">PPN (11%)</SelectItem>
                      <SelectItem value="PPH">PPH</SelectItem>
                      <SelectItem value="NONE">{t("noTax")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  orientation="horizontal"
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5">
                    <FieldLabel className="text-sm">{t("taxInclusive")}</FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      {t("taxInclusiveHint")}
                    </p>
                  </div>
                  <Switch
                    checked={isTaxInclusive}
                    onCheckedChange={(val) => setValue("is_tax_inclusive", val)}
                  />
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Pricing & Stock */}
            <Section title={t("section.pricingStock")}>
              <div className="grid grid-cols-2 gap-4">
                <Field className="col-span-1">
                  <FieldLabel className="required">{t("form.costPrice")}</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm z-10">
                      Rp
                    </span>
                    <Controller
                      name="cost_price"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          className="pl-9"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  {errors.cost_price && (
                    <FieldError>{errors.cost_price.message}</FieldError>
                  )}
                </Field>
                <Field className="col-span-1">
                  <FieldLabel className="required">{t("form.sellingPrice")}</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm z-10">
                      Rp
                    </span>
                    <Controller
                      name="selling_price"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          className="pl-9"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  {errors.selling_price && (
                    <FieldError>{errors.selling_price.message}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel className="required">{t("form.minStock")}</FieldLabel>
                  <Controller
                    name="min_stock"
                    control={control}
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.min_stock && (
                    <FieldError>{errors.min_stock.message}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel className="required">{t("form.maxStock")}</FieldLabel>
                  <Controller
                    name="max_stock"
                    control={control}
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.max_stock && (
                    <FieldError>{errors.max_stock.message}</FieldError>
                  )}
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Outlet Availability */}
            {outlets.length > 0 && (
              <Section title={t("section.outletAssignment")}>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("outletAssignment.hint")}
                </p>

                {/* POS Scope segmented selector */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(["none", "global", "specific"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => {
                        setValue("pos_scope", scope, { shouldDirty: true });
                        if (scope !== "specific") {
                          setValue("outlet_ids", [], { shouldDirty: true });
                        }
                      }}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer",
                        posScope === scope
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-semibold",
                        posScope === scope ? "text-primary" : "text-foreground"
                      )}>
                        {t(`outletAssignment.posScope${scope.charAt(0).toUpperCase()}${scope.slice(1)}` as "outletAssignment.posScopeNone")}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-snug">
                        {t(`outletAssignment.posScope${scope.charAt(0).toUpperCase()}${scope.slice(1)}Desc` as "outletAssignment.posScopeNoneDesc")}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Specific outlet picker — shown only when scope = specific */}
                {posScope === "specific" && (
                  <div className="rounded-lg border">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      <Input
                        placeholder={t("outletAssignment.searchPlaceholder")}
                        value={outletSearch}
                        onChange={(e) => setOutletSearch(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <button
                        type="button"
                        className="shrink-0 text-[10px] text-primary hover:underline cursor-pointer"
                        onClick={() => setValue("outlet_ids", filteredOutlets.map((o) => o.id), { shouldDirty: true })}
                      >
                        {t("outletAssignment.selectAll")}
                      </button>
                      <span className="text-muted-foreground text-[10px]">·</span>
                      <button
                        type="button"
                        className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() => setValue("outlet_ids", [], { shouldDirty: true })}
                      >
                        {t("outletAssignment.clearAll")}
                      </button>
                      {outletIds.length > 0 && (
                        <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {outletIds.length}
                        </span>
                      )}
                    </div>

                    {/* Outlet list */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredOutlets.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground">
                          {t("outletAssignment.noOutlets")}
                        </p>
                      ) : (
                        filteredOutlets.map((outlet) => {
                          const checked = outletIds.includes(outlet.id);
                          return (
                            <label
                              key={outlet.id}
                              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 select-none border-b last:border-b-0"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = v
                                    ? [...outletIds, outlet.id]
                                    : outletIds.filter((id) => id !== outlet.id);
                                  setValue("outlet_ids", next, { shouldDirty: true });
                                }}
                              />
                              <span className="text-sm">{outlet.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </Section>
            )}

          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              <ButtonLoading loading={isSubmitting} loadingText="Saving...">
                {isEditing ? tCommon("save") : t("create")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ProductCategoryDialog
        open={quickCreate.type === "category"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        initialName={quickCreate.query}
        onCreated={(id) => handleCategoryCreated(id)}
      />

      <UnitOfMeasureDialog
        open={quickCreate.type === "uom" || quickCreate.type === "purchaseUom"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => quickCreate.type === "purchaseUom" ? handlePurchaseUomCreated(id) : handleUomCreated(id)}
      />

    </Dialog>
  );
}

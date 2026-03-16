"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ButtonLoading } from "@/components/loading";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ImageUpload } from "@/components/ui/image-upload";
import { ProductCategoryDialog } from "../product-category/product-category-dialog";
import { ProductBrandDialog } from "../product-brand/product-brand-dialog";
import { ProductSegmentDialog } from "../product-segment/product-segment-dialog";
import { ProductTypeDialog } from "../product-type/product-type-dialog";
import { UnitOfMeasureDialog } from "../unit-of-measure/unit-of-measure-dialog";
import { PackagingDialog } from "../packaging/packaging-dialog";
import { ProcurementTypeDialog } from "../procurement-type/procurement-type-dialog";

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
}

export function ProductDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
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
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    handleCategoryCreated,
    handleBrandCreated,
    handleSegmentCreated,
    handleTypeCreated,
    handleUomCreated,
    handlePurchaseUomCreated,
    handlePackagingCreated,
    handleProcurementTypeCreated,
    onSubmit,
  } = useProductForm({ open, onOpenChange, editingItem, onCreated });

  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;


  const isTaxInclusive = watch("is_tax_inclusive");

  // Watch IDs for Select values
  const categoryId = watch("category_id");
  const brandId = watch("brand_id");
  const segmentId = watch("segment_id");
  const typeId = watch("type_id");
  const uomId = watch("uom_id");
  const purchaseUomId = watch("purchase_uom_id");
  const packagingId = watch("packaging_id");
  const procurementTypeId = watch("procurement_type_id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{isEditing ? t("edit") : t("create")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
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
                    labels={{
                      dragActive: tCommon("dragActive"),
                      dragInactive: tCommon("dragInactive"),
                      uploadSuccess: tCommon("uploadSuccess"),
                      uploadFailed: tCommon("uploadFailed"),
                      invalidFile: tCommon("invalidFile"),
                      removeImage: tCommon("removeImage"),
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
                    onCreateClick={(q) => openQuickCreate("brand", q)}
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
                    onCreateClick={(q) => openQuickCreate("segment", q)}
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
                    onCreateClick={(q) => openQuickCreate("type", q)}
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
                  <FieldLabel>{t("conversion")}</FieldLabel>
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
                    onCreateClick={(q) => openQuickCreate("packaging", q)}
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
                    onCreateClick={(q) => openQuickCreate("procurementType", q)}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("leadTime")} ({t("days")})</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("lead_time_days", { valueAsNumber: true })}
                  />
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
                <Field className="col-span-2 md:col-span-2">
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
                <Field>
                  <FieldLabel>{t("form.minStock")}</FieldLabel>
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
                </Field>
                <Field>
                  <FieldLabel>{t("form.maxStock")}</FieldLabel>
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
                </Field>
              </div>
            </Section>

            <Separator />

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
        onCreated={(id) => handleCategoryCreated(id)}
      />

      <ProductBrandDialog
        open={quickCreate.type === "brand"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => handleBrandCreated(id)}
      />
      
      <ProductSegmentDialog
        open={quickCreate.type === "segment"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => handleSegmentCreated(id)}
      />
      
      <ProductTypeDialog
        open={quickCreate.type === "type"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => handleTypeCreated(id)}
      />
      
      <UnitOfMeasureDialog
        open={quickCreate.type === "uom" || quickCreate.type === "purchaseUom"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => quickCreate.type === "purchaseUom" ? handlePurchaseUomCreated(id) : handleUomCreated(id)}
      />
      
      <PackagingDialog
        open={quickCreate.type === "packaging"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => handlePackagingCreated(id)}
      />
      
      <ProcurementTypeDialog
        open={quickCreate.type === "procurementType"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={(id) => handleProcurementTypeCreated(id)}
      />

    </Dialog>
  );
}

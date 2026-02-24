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
import { CategoryTreePicker } from "@/components/ui/category-tree-picker";
import { ImageUpload } from "@/components/ui/image-upload";
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
}

export function ProductDialog({
  open,
  onOpenChange,
  editingItem,
}: ProductDialogProps) {
  const {
    form,
    t,
    tCommon,
    isEditing,
    isSubmitting,
    brands,
    segments,
    types,
    uoms,
    packagings,
    procurementTypes,
    onSubmit,
  } = useProductForm({ open, onOpenChange, editingItem });

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
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
                  <CategoryTreePicker
                    value={categoryId ?? null}
                    onChange={(id) => setValue("category_id", id ?? undefined)}
                    placeholder={t("selectCategory")}
                    showProductCount
                    clearable
                    labels={{
                      searchPlaceholder: tCommon("searchCategories"),
                      noCategoriesFound: tCommon("noCategoriesFound"),
                      noCategories: tCommon("noCategories"),
                      category: tCommon("categoryRes"),
                      categories: tCommon("categoriesRes"),
                      selected: tCommon("selectedRes"),
                      inactive: tCommon("inactiveRes"),
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.brand")}</FieldLabel>
                  <Select
                    value={brandId ?? ""}
                    onValueChange={(val) => setValue("brand_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectBrand")} />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t("form.segment")}</FieldLabel>
                  <Select
                    value={segmentId ?? ""}
                    onValueChange={(val) => setValue("segment_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectSegment")} />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t("form.type")}</FieldLabel>
                  <Select
                    value={typeId ?? ""}
                    onValueChange={(val) => setValue("type_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Units & Packaging */}
            <Section title={t("section.unitsPackaging")}>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>{t("form.uom")}</FieldLabel>
                  <Select
                    value={uomId ?? ""}
                    onValueChange={(val) => setValue("uom_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Base Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Purchase UoM</FieldLabel>
                  <Select
                    value={purchaseUomId ?? ""}
                    onValueChange={(val) => setValue("purchase_uom_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("unitsPerPurchase")} />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>
              <Field>
                <FieldLabel>{t("form.packaging")}</FieldLabel>
                <Select
                  value={packagingId ?? "none"}
                  onValueChange={(val) =>
                    setValue("packaging_id", val === "none" ? null : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectPackaging")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {packagings.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Separator />

            {/* Supply Chain */}
            <Section title={t("section.supplyChain")}>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("form.procurementType")}</FieldLabel>
                  <Select
                    value={procurementTypeId ?? ""}
                    onValueChange={(val) => setValue("procurement_type_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {procurementTypes.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="grid grid-cols-3 gap-4">
                <Field>
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
    </Dialog>
  );
}

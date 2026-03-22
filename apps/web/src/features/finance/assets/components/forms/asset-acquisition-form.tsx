"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Calculator,
  DollarSign,
  Package,
  Truck,
  Wrench,
  Receipt,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AsyncSelect } from "@/components/ui/async-select";
import { NumericInput } from "@/components/ui/numeric-input";

// Services for searchable dropdowns - adjust paths as needed for your project structure
// These are placeholder imports - replace with actual service imports from your project
const purchaseOrderService = {
  list: async (params?: unknown) => ({
    data: [] as Array<{ id: string; po_number: string; po_date?: string }>,
  }),
};
const supplierInvoiceService = {
  list: async (params?: unknown) => ({
    data: [] as Array<{
      id: string;
      invoice_number: string;
      invoice_date?: string;
    }>,
  }),
};
const supplierService = {
  list: async (params?: unknown) => ({
    data: [] as Array<{ id: string; name: string; code?: string }>,
  }),
};

import type { Asset } from "@/features/finance/assets/types";
import { DatePicker } from "../date-picker";

// Schema for acquisition form
export const assetAcquisitionFormSchema = z.object({
  acquisition_date: z.string().min(1, "Acquisition date is required"),
  acquisition_cost: z.number().min(0, "Acquisition cost must be positive"),
  shipping_cost: z.number().min(0).optional(),
  installation_cost: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  other_costs: z.number().min(0).optional(),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  purchase_order_id: z.string().uuid().optional().or(z.literal("")),
  supplier_invoice_id: z.string().uuid().optional().or(z.literal("")),
});

export type AssetAcquisitionFormValues = z.infer<
  typeof assetAcquisitionFormSchema
>;

interface AssetAcquisitionFormProps {
  asset?: Asset | null;
  onSubmit: (values: AssetAcquisitionFormValues) => Promise<void>;
  isSubmitting?: boolean;
  isLoading?: boolean;
}

// Type definitions for async select options
interface SupplierOption {
  id: string;
  name: string;
  code?: string;
}

interface PurchaseOrderOption {
  id: string;
  po_number: string;
  po_date?: string;
}

interface InvoiceOption {
  id: string;
  invoice_number: string;
  invoice_date?: string;
}

export function AssetAcquisitionForm({
  asset,
  onSubmit,
  isSubmitting = false,
  isLoading = false,
}: AssetAcquisitionFormProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierOption | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderOption | null>(
    null,
  );
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOption | null>(
    null,
  );

  const defaultValues: AssetAcquisitionFormValues = useMemo(
    () => ({
      acquisition_date: asset?.acquisition_date
        ? asset.acquisition_date.slice(0, 10)
        : "",
      acquisition_cost: asset?.acquisition_cost ?? 0,
      shipping_cost: asset?.shipping_cost ?? 0,
      installation_cost: asset?.installation_cost ?? 0,
      tax_amount: asset?.tax_amount ?? 0,
      other_costs: asset?.other_costs ?? 0,
      supplier_id: asset?.acquisition_cost_breakdown?.supplier_id ?? "",
      purchase_order_id:
        asset?.acquisition_cost_breakdown?.purchase_order_id ?? "",
      supplier_invoice_id:
        asset?.acquisition_cost_breakdown?.supplier_invoice_id ?? "",
    }),
    [asset],
  );

  const form = useForm<AssetAcquisitionFormValues>({
    resolver: zodResolver(assetAcquisitionFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    const values = form.getValues();
    return (
      (values.acquisition_cost || 0) +
      (values.shipping_cost || 0) +
      (values.installation_cost || 0) +
      (values.tax_amount || 0) +
      (values.other_costs || 0)
    );
  }, [
    form.watch("acquisition_cost"),
    form.watch("shipping_cost"),
    form.watch("installation_cost"),
    form.watch("tax_amount"),
    form.watch("other_costs"),
  ]);

  // Fetch suppliers for async select
  const fetchSuppliers = async (query: string): Promise<SupplierOption[]> => {
    try {
      const response = await supplierService.list({
        page: 1,
        per_page: 20,
        search: query,
      });
      return response.data ?? [];
    } catch {
      return [];
    }
  };

  // Fetch purchase orders for async select
  const fetchPurchaseOrders = async (
    query: string,
  ): Promise<PurchaseOrderOption[]> => {
    try {
      const response = await purchaseOrderService.list({
        page: 1,
        per_page: 20,
        search: query,
      });
      return response.data ?? [];
    } catch {
      return [];
    }
  };

  // Fetch invoices for async select
  const fetchInvoices = async (query: string): Promise<InvoiceOption[]> => {
    try {
      const response = await supplierInvoiceService.list({
        page: 1,
        per_page: 20,
        search: query,
      });
      return response.data ?? [];
    } catch {
      return [];
    }
  };

  const handleSubmit = async (values: AssetAcquisitionFormValues) => {
    try {
      await onSubmit(values);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Acquisition Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("sections.acquisitionDetails") || "Acquisition Details"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Acquisition Date */}
          <Field>
            <FieldLabel>{t("fields.acquisitionDate")} *</FieldLabel>
            <Controller
              name="acquisition_date"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("placeholders.selectDate") || "Select date"}
                />
              )}
            />
            {form.formState.errors.acquisition_date && (
              <FieldError>
                {form.formState.errors.acquisition_date.message}
              </FieldError>
            )}
          </Field>

          {/* Base Price / Acquisition Cost */}
          <Field>
            <FieldLabel>
              <DollarSign className="h-4 w-4 inline mr-1" />
              {t("fields.acquisitionCost")} *
            </FieldLabel>
            <Controller
              name="acquisition_cost"
              control={form.control}
              render={({ field }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0.00"
                  min={0}
                />
              )}
            />
            {form.formState.errors.acquisition_cost && (
              <FieldError>
                {form.formState.errors.acquisition_cost.message}
              </FieldError>
            )}
          </Field>
        </div>
      </div>

      {/* Source Information */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("sections.acquisitionSource") || "Acquisition Source"}
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {/* Supplier */}
          <Field>
            <FieldLabel>{t("fields.supplier")}</FieldLabel>
            <Controller
              name="supplier_id"
              control={form.control}
              render={({ field }) => (
                <AsyncSelect
                  fetcher={fetchSuppliers}
                  renderOption={(supplier) => (
                    <div className="flex flex-col">
                      <span>{supplier.name}</span>
                      {supplier.code && (
                        <span className="text-xs text-muted-foreground">
                          {supplier.code}
                        </span>
                      )}
                    </div>
                  )}
                  getLabel={(supplier) => supplier.name}
                  getValue={(supplier) => supplier.id}
                  value={field.value}
                  onChange={(value, item) => {
                    field.onChange(value);
                    setSelectedSupplier(item || null);
                  }}
                  label={t("fields.supplier")}
                  placeholder={
                    t("placeholders.searchSupplier") || "Search supplier..."
                  }
                  emptyMessage={
                    t("messages.noSuppliers") || "No suppliers found"
                  }
                />
              )}
            />
            {selectedSupplier && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedSupplier.code && `${selectedSupplier.code} - `}
                {selectedSupplier.name}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Purchase Order */}
            <Field>
              <FieldLabel>{t("fields.purchaseOrder")}</FieldLabel>
              <Controller
                name="purchase_order_id"
                control={form.control}
                render={({ field }) => (
                  <AsyncSelect
                    fetcher={fetchPurchaseOrders}
                    renderOption={(po) => (
                      <div className="flex flex-col">
                        <span>{po.po_number}</span>
                        {po.po_date && (
                          <span className="text-xs text-muted-foreground">
                            {po.po_date}
                          </span>
                        )}
                      </div>
                    )}
                    getLabel={(po) => po.po_number}
                    getValue={(po) => po.id}
                    value={field.value}
                    onChange={(value, item) => {
                      field.onChange(value);
                      setSelectedPO(item || null);
                    }}
                    label={t("fields.purchaseOrder")}
                    placeholder={
                      t("placeholders.searchPO") || "Search purchase order..."
                    }
                    emptyMessage={
                      t("messages.noPOs") || "No purchase orders found"
                    }
                  />
                )}
              />
              {selectedPO && selectedPO.po_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  PO Date: {selectedPO.po_date}
                </p>
              )}
            </Field>

            {/* Invoice */}
            <Field>
              <FieldLabel>{t("fields.invoice")}</FieldLabel>
              <Controller
                name="supplier_invoice_id"
                control={form.control}
                render={({ field }) => (
                  <AsyncSelect
                    fetcher={fetchInvoices}
                    renderOption={(invoice) => (
                      <div className="flex flex-col">
                        <span>{invoice.invoice_number}</span>
                        {invoice.invoice_date && (
                          <span className="text-xs text-muted-foreground">
                            {invoice.invoice_date}
                          </span>
                        )}
                      </div>
                    )}
                    getLabel={(invoice) => invoice.invoice_number}
                    getValue={(invoice) => invoice.id}
                    value={field.value}
                    onChange={(value, item) => {
                      field.onChange(value);
                      setSelectedInvoice(item || null);
                    }}
                    label={t("fields.invoice")}
                    placeholder={
                      t("placeholders.searchInvoice") || "Search invoice..."
                    }
                    emptyMessage={
                      t("messages.noInvoices") || "No invoices found"
                    }
                  />
                )}
              />
              {selectedInvoice && selectedInvoice.invoice_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Invoice Date: {selectedInvoice.invoice_date}
                </p>
              )}
            </Field>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("sections.costBreakdown") || "Cost Breakdown"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Shipping Cost */}
          <Field>
            <FieldLabel>
              <Truck className="h-4 w-4 inline mr-1" />
              {t("fields.shippingCost")}
            </FieldLabel>
            <Controller
              name="shipping_cost"
              control={form.control}
              render={({ field }) => (
                <NumericInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  placeholder="0.00"
                  min={0}
                />
              )}
            />
          </Field>

          {/* Installation Cost */}
          <Field>
            <FieldLabel>
              <Wrench className="h-4 w-4 inline mr-1" />
              {t("fields.installationCost")}
            </FieldLabel>
            <Controller
              name="installation_cost"
              control={form.control}
              render={({ field }) => (
                <NumericInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  placeholder="0.00"
                  min={0}
                />
              )}
            />
          </Field>

          {/* Tax Amount */}
          <Field>
            <FieldLabel>
              <Receipt className="h-4 w-4 inline mr-1" />
              {t("fields.taxAmount")}
            </FieldLabel>
            <Controller
              name="tax_amount"
              control={form.control}
              render={({ field }) => (
                <NumericInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  placeholder="0.00"
                  min={0}
                />
              )}
            />
          </Field>

          {/* Other Costs */}
          <Field>
            <FieldLabel>
              <Package className="h-4 w-4 inline mr-1" />
              {t("fields.otherCosts")}
            </FieldLabel>
            <Controller
              name="other_costs"
              control={form.control}
              render={({ field }) => (
                <NumericInput
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  placeholder="0.00"
                  min={0}
                />
              )}
            />
          </Field>
        </div>
      </div>

      {/* Total Cost Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t("fields.totalCost")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("fields.calculatedTotal") || "Calculated Total"}
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalCost)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>
                {t("fields.basePrice") || "Base"}:{" "}
                {formatCurrency(form.watch("acquisition_cost") || 0)}
              </p>
              <p>
                {t("fields.additionalCosts") || "Additional"}:{" "}
                {formatCurrency(
                  (form.watch("shipping_cost") || 0) +
                    (form.watch("installation_cost") || 0) +
                    (form.watch("tax_amount") || 0) +
                    (form.watch("other_costs") || 0),
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          className="cursor-pointer"
        >
          {isSubmitting ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

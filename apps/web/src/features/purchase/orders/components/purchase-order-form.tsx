"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import type { FieldErrors, Resolver, SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Trash2, FileText, DollarSign, ShoppingCart, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";

import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ButtonLoading } from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePurchaseOrderAddData } from "../hooks/use-purchase-order-add-data";
import { useCreatePurchaseOrder, usePurchaseOrder, useUpdatePurchaseOrder } from "../hooks/use-purchase-orders";
import {
  purchaseOrderSchema,
  type PurchaseOrderFormData,
} from "../schemas/purchase-order.schema";
import { useLoadPurchaseRequisition } from "../hooks/use-load-purchase-requisition";
import { useApprovedPurchaseRequisitions } from "../hooks/use-approved-purchase-requisitions";
import { useApprovedSalesOrders } from "../hooks/use-approved-sales-orders";
import { useLoadSalesOrder } from "../hooks/use-load-sales-order";
import { SupplierDialog } from "@/features/master-data/supplier/components/supplier/supplier-dialog";
import { ProductDialog } from "@/features/master-data/product/components/product/product-dialog";
import { PaymentTermsDialog } from "@/features/master-data/payment-and-couriers/payment-terms/components/payment-terms-dialog";
import { BusinessUnitForm } from "@/features/master-data/organization/components/business-unit/business-unit-form";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { productService } from "@/features/master-data/product/services/product-service";

type ProductOption = { id: string; code?: string; name: string; cost_price?: number };

type QuickCreateType = "supplier" | "paymentTerm" | "businessUnit" | "product" | null;

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const NONE_VALUE = "__none__";

function collectErrorPaths(errs: FieldErrors, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(errs)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!value) continue;
    if (Array.isArray(value)) {
      value.forEach((child, idx) => {
        if (child) out.push(...collectErrorPaths(child as FieldErrors, `${path}[${idx}]`));
      });
      continue;
    }
    const maybeLeaf = value as { message?: unknown };
    if (typeof maybeLeaf.message === "string" && maybeLeaf.message.length > 0) {
      out.push(path);
      continue;
    }
    out.push(...collectErrorPaths(value as FieldErrors, path));
  }
  return Array.from(new Set(out));
}

interface PurchaseOrderFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly mode?: "create" | "edit";
  readonly purchaseOrderId?: string | null;
}

export function PurchaseOrderForm({
  open,
  onClose,
  mode = "create",
  purchaseOrderId,
}: PurchaseOrderFormProps) {
  const t = useTranslations("purchaseOrder");
  const isEdit = mode === "edit";

  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const loadPR = useLoadPurchaseRequisition();
  const loadSO = useLoadSalesOrder();
  const poQuery = usePurchaseOrder(purchaseOrderId ?? "", {
    enabled: open && isEdit && !!purchaseOrderId,
  });
  const po = poQuery.data?.data;

  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const [pendingProductItemIdx, setPendingProductItemIdx] = useState(-1);
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const [orderDateOpen, setOrderDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const { data: addData, isFetching: isFetchingAddData } = usePurchaseOrderAddData({ enabled: open });
  const { data: masterProductsData } = useProducts({ is_approved: true, per_page: 100 }, { enabled: open });
  const masterProducts = masterProductsData?.data ?? [];

  const suppliers = addData?.data?.suppliers ?? [];
  const paymentTerms = addData?.data?.payment_terms ?? [];
  const businessUnits = addData?.data?.business_units ?? [];

  const mergedSuppliers = useMemo(() => {
    const list = [...suppliers];
    const sel = po?.supplier as any;
    if (sel?.id && !list.some((x) => x.id === sel.id)) list.push(sel);
    return list;
  }, [suppliers, po?.supplier]);

  const mergedPaymentTerms = useMemo(() => {
    const list = [...paymentTerms];
    const sel = po?.payment_terms as any;
    if (sel?.id && !list.some((x) => x.id === sel.id)) list.push(sel);
    return list;
  }, [paymentTerms, po?.payment_terms]);

  const mergedBusinessUnits = useMemo(() => {
    const list = [...businessUnits];
    const sel = po?.business_unit as any;
    if (sel?.id && !list.some((x) => x.id === sel.id)) list.push(sel);
    return list;
  }, [businessUnits, po?.business_unit]);

  const resolver = zodResolver(purchaseOrderSchema) as Resolver<PurchaseOrderFormData>;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<PurchaseOrderFormData>({
    resolver,
    defaultValues: {
      source: "manual",
      supplier_id: null,
      payment_terms_id: null,
      business_unit_id: null,
      purchase_requisitions_id: null,
      sales_order_id: null,
      order_date: todayISO(),
      due_date: null,
      tax_rate: 0,
      delivery_cost: 0,
      other_cost: 0,
      notes: "",
      items: [{ product_id: "", quantity: 1, price: 0, discount: 0, notes: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const source = watch("source");

  const approvedPRsQuery = useApprovedPurchaseRequisitions({ enabled: open && !isEdit && source === "pr" });
  const approvedSOsQuery = useApprovedSalesOrders({ enabled: open && !isEdit && source === "so" });

  useEffect(() => {
    if (!open) return;
    if (isEdit) return;
    setActiveTab("basic");
    reset({
      source: "manual",
      supplier_id: null,
      payment_terms_id: null,
      business_unit_id: null,
      purchase_requisitions_id: null,
      sales_order_id: null,
      order_date: todayISO(),
      due_date: null,
      tax_rate: 0,
      delivery_cost: 0,
      other_cost: 0,
      notes: "",
      items: [{ product_id: "", quantity: 1, price: 0, discount: 0, notes: null }],
    });
  }, [open, isEdit, reset]);

  useEffect(() => {
    if (!open || !isEdit || !po) return;
    setActiveTab("basic");
    reset(
      {
        source: po.purchase_requisitions_id ? "pr" : po.sales_order_id ? "so" : "manual",
        supplier_id: po.supplier_id ?? null,
        payment_terms_id: po.payment_terms_id ?? null,
        business_unit_id: po.business_unit_id ?? null,
        purchase_requisitions_id: po.purchase_requisitions_id ?? null,
        sales_order_id: po.sales_order_id ?? null,
        order_date: po.order_date,
        due_date: po.due_date ?? null,
        tax_rate: po.tax_rate ?? 0,
        delivery_cost: po.delivery_cost ?? 0,
        other_cost: po.other_cost ?? 0,
        notes: po.notes ?? "",
        items:
          po.items?.length > 0
            ? po.items.map((it) => ({
              product_id: it.product_id,
              quantity: it.quantity,
              price: it.price,
              discount: it.discount ?? 0,
              notes: it.notes ?? null,
            }))
            : [{ product_id: "", quantity: 1, price: 0, discount: 0, notes: null }],
      },
      { keepDefaultValues: false },
    );
  }, [open, isEdit, po, reset]);

  const selectedSupplierId = watch("supplier_id");
  const watchedItems = watch("items");

  const [sourceProducts, setSourceProducts] = useState<ProductOption[]>([]);
  const allProducts = useMemo(() => suppliers.flatMap((s) => s.products ?? []), [suppliers]);
  const supplierProducts = useMemo(() => {
    if (!selectedSupplierId) return allProducts;
    const s = suppliers.find((x) => x.id === selectedSupplierId);
    return s?.products?.length ? s.products : allProducts;
  }, [allProducts, selectedSupplierId, suppliers]);

  const productOptions = useMemo((): ProductOption[] => {
    const map = new Map<string, ProductOption>();
    // Supplier-linked products with purchase price hint
    for (const p of supplierProducts) map.set(p.id, { id: p.id, code: p.code, name: p.name, cost_price: p.current_hpp });
    for (const p of sourceProducts) map.set(p.id, { ...p, cost_price: 0 });
    // Master data products are authoritative for cost_price
    for (const p of masterProducts) map.set(p.id, { id: p.id, code: p.code, name: p.name, cost_price: p.cost_price });
    for (const it of watchedItems ?? []) {
      const id = it?.product_id;
      if (!id || map.has(id)) continue;
      const poItem = po?.items?.find((x) => x.product_id === id);
      const pInfo = (poItem?.product as any);
      map.set(id, { id, code: pInfo?.code, name: pInfo?.name || id, cost_price: 0 });
    }
    return Array.from(map.values());
  }, [supplierProducts, sourceProducts, masterProducts, watchedItems, po?.items]);

  const isSubmitting = (isEdit ? updateMutation.isPending : createMutation.isPending) || (isEdit && poQuery.isFetching);
  const isSourceLoading = loadPR.isPending || loadSO.isPending;

  const handleSupplierCreated = useCallback((item: { id: string; name: string }) => {
    setValue("supplier_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [setValue, closeQuickCreate]);

  const handlePaymentTermCreated = useCallback((item: { id: string; name: string }) => {
    setValue("payment_terms_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [setValue, closeQuickCreate]);

  const handleBusinessUnitCreated = useCallback((item: { id: string; name: string }) => {
    setValue("business_unit_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [setValue, closeQuickCreate]);

  const handleProductCreated = useCallback(async (item: { id: string; name: string }) => {
    const targetIdx = pendingProductItemIdx;
    if (targetIdx !== -1) {
      setValue(`items.${targetIdx}.product_id`, item.id, { shouldValidate: true });
      try {
        const res = await productService.getById(item.id);
        setValue(`items.${targetIdx}.price`, res.data.cost_price ?? 0, { shouldValidate: true });
      } catch {
        // price stays at default 0
      }
    }
    closeQuickCreate();
    setPendingProductItemIdx(-1);
  }, [pendingProductItemIdx, setValue, closeQuickCreate]);

  const onSubmit = async (formData: PurchaseOrderFormData) => {
    const basePayload = {
      supplier_id: formData.supplier_id ?? null,
      payment_terms_id: formData.payment_terms_id ?? null,
      business_unit_id: formData.business_unit_id ?? null,
      order_date: formData.order_date,
      due_date: formData.due_date ?? null,
      tax_rate: formData.tax_rate ?? 0,
      delivery_cost: formData.delivery_cost ?? 0,
      other_cost: formData.other_cost ?? 0,
      notes: formData.notes ?? "",
      items: (formData.items ?? []).map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount ?? 0,
        notes: it.notes ?? null,
      })),
    };
    try {
      if (isEdit) {
        if (!purchaseOrderId) throw new Error("missing purchaseOrderId");
        await updateMutation.mutateAsync({ id: purchaseOrderId, data: basePayload });
        toast.success(t("toast.updated"));
      } else {
        await createMutation.mutateAsync({
          ...basePayload,
          purchase_requisitions_id: formData.source === "pr" ? (formData.purchase_requisitions_id ?? null) : null,
          sales_order_id: formData.source === "so" ? (formData.sales_order_id ?? null) : null,
        });
        toast.success(t("toast.created"));
      }
      onClose();
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const onInvalid: SubmitErrorHandler<PurchaseOrderFormData> = (errs) => {
    const paths = collectErrorPaths(errs);
    console.warn("PurchaseOrderForm invalid", { paths, errs });
    toast.error(paths.length ? `${t("form.invalid")}: ${paths.join(", ")}` : t("form.invalid"));
  };

  const subtotal = useMemo(() =>
    (watchedItems ?? []).reduce((sum, it) => {
      const qty = Number(it?.quantity ?? 0);
      const price = Number(it?.price ?? 0);
      const disc = Number(it?.discount ?? 0);
      return sum + qty * price * (1 - disc / 100);
    }, 0),
    [watchedItems],
  );
  const taxRate = watch("tax_rate") ?? 0;
  const deliveryCost = watch("delivery_cost") ?? 0;
  const otherCost = watch("other_cost") ?? 0;
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const totalAmount = subtotal + taxAmount + Number(deliveryCost) + Number(otherCost);
  const formatMoney = useCallback((v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v),
    []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "basic" | "items")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("tabs.basic") || "Basic Info"}</TabsTrigger>
            <TabsTrigger value="items">{t("tabs.items") || "Items"}</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 mt-4">
            <TabsContent value="basic" className="space-y-4 mt-0">

              {/* Order Info */}
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.orderInfo") || "Order Info"}</h3>
              </div>
              <div className="space-y-4">
                {!isEdit && (
                  <Field orientation="vertical">
                    <FieldLabel>{t("fields.source")}</FieldLabel>
                    <Controller
                      control={control}
                      name="source"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("placeholders.select")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual" className="cursor-pointer">{t("source.manual")}</SelectItem>
                            <SelectItem value="pr" className="cursor-pointer">{t("source.pr")}</SelectItem>
                            <SelectItem value="so" className="cursor-pointer">{t("source.so")}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                )}

                {!isEdit && source === "pr" && (
                  <Field orientation="vertical">
                    <FieldLabel>{t("fields.purchaseRequisitionId")}</FieldLabel>
                    <Controller
                      control={control}
                      name="purchase_requisitions_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? NONE_VALUE}
                          onValueChange={async (v) => {
                            const id = v === NONE_VALUE ? null : v;
                            field.onChange(id);
                            setValue("sales_order_id", null, { shouldValidate: true });
                            setSourceProducts([]);
                            if (!id) return;
                            try {
                              const res = await loadPR.mutateAsync(id);
                              const pr = res.data;
                              setSourceProducts((pr.items ?? []).map((it) => ({
                                id: it.product?.id ?? it.product_id,
                                code: it.product?.code,
                                name: it.product?.name ?? it.product_id,
                              })));
                              reset({
                                source: "pr",
                                supplier_id: pr.supplier_id ?? null,
                                payment_terms_id: pr.payment_terms_id ?? null,
                                business_unit_id: pr.business_unit_id ?? null,
                                purchase_requisitions_id: pr.id,
                                sales_order_id: null,
                                order_date: todayISO(),
                                due_date: null,
                                tax_rate: pr.tax_rate ?? 0,
                                delivery_cost: pr.delivery_cost ?? 0,
                                other_cost: pr.other_cost ?? 0,
                                notes: pr.notes ?? "",
                                items: pr.items?.length > 0
                                  ? pr.items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, price: it.purchase_price, discount: it.discount ?? 0, notes: it.notes ?? null }))
                                  : [{ product_id: "", quantity: 1, price: 0, discount: 0, notes: null }],
                              }, { keepDefaultValues: false });
                            } catch { toast.error(t("toast.failed")); }
                          }}
                          disabled={approvedPRsQuery.isFetching || isSourceLoading}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("placeholders.select")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE} className="cursor-pointer">{t("placeholders.none")}</SelectItem>
                            {(approvedPRsQuery.data?.data ?? []).map((pr) => (
                              <SelectItem key={pr.id} value={pr.id} className="cursor-pointer">{pr.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.purchase_requisitions_id && <FieldError>{t("validation.required")}</FieldError>}
                  </Field>
                )}

                {!isEdit && source === "so" && (
                  <Field orientation="vertical">
                    <FieldLabel>{t("fields.salesOrderId")}</FieldLabel>
                    <Controller
                      control={control}
                      name="sales_order_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? NONE_VALUE}
                          onValueChange={async (v) => {
                            const id = v === NONE_VALUE ? null : v;
                            field.onChange(id);
                            setValue("purchase_requisitions_id", null, { shouldValidate: true });
                            setSourceProducts([]);
                            if (!id) return;
                            try {
                              const res = await loadSO.mutateAsync(id);
                              const so = res.data;
                              setSourceProducts((so.items ?? []).map((it) => ({
                                id: it.product?.id ?? it.product_id,
                                code: it.product?.code,
                                name: it.product?.name ?? it.product_id,
                              })));
                              reset({
                                source: "so",
                                supplier_id: null,
                                payment_terms_id: so.payment_terms_id ?? null,
                                business_unit_id: so.business_unit_id ?? null,
                                purchase_requisitions_id: null,
                                sales_order_id: so.id,
                                order_date: todayISO(),
                                due_date: null,
                                tax_rate: so.tax_rate ?? 0,
                                delivery_cost: so.delivery_cost ?? 0,
                                other_cost: so.other_cost ?? 0,
                                notes: so.notes ?? "",
                                items: (so.items?.length ?? 0) > 0
                                  ? (so.items ?? []).map((it) => ({ product_id: it.product_id, quantity: it.quantity, price: 0, discount: 0, notes: null }))
                                  : [{ product_id: "", quantity: 1, price: 0, discount: 0, notes: null }],
                              }, { keepDefaultValues: false });
                            } catch { toast.error(t("toast.failed")); }
                          }}
                          disabled={approvedSOsQuery.isFetching || isSourceLoading}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("placeholders.select")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE} className="cursor-pointer">{t("placeholders.none")}</SelectItem>
                            {(approvedSOsQuery.data?.data ?? []).map((so) => (
                              <SelectItem key={so.id} value={so.id} className="cursor-pointer">{so.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.sales_order_id && <FieldError>{t("validation.required")}</FieldError>}
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.orderDate")}</FieldLabel>
                  <Controller
                    control={control}
                    name="order_date"
                    render={({ field }) => (
                      <Popover open={orderDateOpen} onOpenChange={setOrderDateOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-start text-left font-normal cursor-pointer">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? formatDate(field.value) : t("placeholders.pickDate") || "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date: Date | undefined) => {
                              field.onChange(date ? date.toISOString().slice(0, 10) : "");
                              setOrderDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.order_date && <FieldError>{t("validation.required")}</FieldError>}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.dueDate")}</FieldLabel>
                  <Controller
                    control={control}
                    name="due_date"
                    render={({ field }) => (
                      <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-start text-left font-normal cursor-pointer">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? formatDate(field.value) : t("placeholders.pickDate") || "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date: Date | undefined) => {
                              field.onChange(date ? date.toISOString().slice(0, 10) : "");
                              setDueDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </Field>
                </div>
              </div>

              {/* Procurement */}
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.procurement") || "Procurement"}</h3>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.supplier")}</FieldLabel>
                  <Controller
                    control={control}
                    name="supplier_id"
                    render={({ field }) => (
                      <CreatableCombobox
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || "")}
                        options={mergedSuppliers.map((s) => ({ value: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name }))}
                        createPermission="supplier.create"
                        onCreateClick={() => openQuickCreate("supplier")}
                        placeholder={t("placeholders.select")}
                        createLabel={t("actions.createNew") || "Create New Supplier"}
                      />
                    )}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.paymentTerms")}</FieldLabel>
                  <Controller
                    control={control}
                    name="payment_terms_id"
                    render={({ field }) => (
                      <CreatableCombobox
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || "")}
                        options={mergedPaymentTerms.map((pt) => ({ value: pt.id, label: pt.code ? `${pt.code} - ${pt.name}` : pt.name }))}
                        createPermission="payment_term.create"
                        onCreateClick={() => openQuickCreate("paymentTerm")}
                        placeholder={t("placeholders.select")}
                        createLabel={t("actions.createNew") || "Create New Payment Terms"}
                      />
                    )}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.businessUnit")}</FieldLabel>
                  <Controller
                    control={control}
                    name="business_unit_id"
                    render={({ field }) => (
                      <CreatableCombobox
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || "")}
                        options={mergedBusinessUnits.map((bu) => ({ value: bu.id, label: bu.name }))}
                        createPermission="business_unit.create"
                        onCreateClick={() => openQuickCreate("businessUnit")}
                        placeholder={t("placeholders.select")}
                        createLabel={t("actions.createNew") || "Create New Business Unit"}
                      />
                    )}
                  />
                </Field>
              </div>

              {/* Financial */}
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.financial") || "Financial"}</h3>
              </div>
              <div className="grid gap-4 grid-cols-3">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.taxRate")}</FieldLabel>
                  <Controller control={control} name="tax_rate"
                    render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
                  />
                  {errors.tax_rate && <FieldError>{t("validation.invalid")}</FieldError>}
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.deliveryCost")}</FieldLabel>
                  <Controller control={control} name="delivery_cost"
                    render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.otherCost")}</FieldLabel>
                  <Controller control={control} name="other_cost"
                    render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
                  />
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("fields.notes")}</FieldLabel>
                <Textarea rows={3} {...register("notes")} />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                  {t("actions.cancel")}
                </Button>
                <Button type="button" onClick={() => setActiveTab("items")} className="cursor-pointer">
                  {t("actions.next") || "Next"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-0">
              {/* Items and Summary Grid Layout */}
              <div className="grid grid-cols-3 gap-6">
                {/* Items Section - Left Column (2 cols) */}
                <div className="col-span-2 space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("items.title")} ({fields.length})</h3>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {fields.map((f, idx) => {
                      const item = watchedItems?.[idx];
                      const itemSubtotal = item
                        ? (item.price ?? 0) * (item.quantity ?? 1) * (1 - ((item.discount ?? 0) / 100))
                        : 0;
                      return (
                        <div
                          key={f.id}
                          className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">#{idx + 1}</span>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(idx)}
                                className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-6">
                            <Field orientation="vertical" className="col-span-2">
                              <FieldLabel>{t("items.fields.product")} *</FieldLabel>
                              <Controller
                                control={control}
                                name={`items.${idx}.product_id`}
                                render={({ field }) => (
                                  <CreatableCombobox
                                    value={field.value ?? ""}
                                    onValueChange={(v) => {
                                      field.onChange(v || "");
                                      if (v) {
                                        const found = productOptions.find((p) => p.id === v);
                                        if (found?.cost_price !== undefined) {
                                          setValue(`items.${idx}.price`, found.cost_price, { shouldValidate: true });
                                        }
                                      }
                                    }}
                                    options={productOptions.map((p) => ({ value: p.id, label: p.code ? `${p.code} - ${p.name}` : p.name }))}
                                    createPermission="product.create"
                                    onCreateClick={() => {
                                      setPendingProductItemIdx(idx);
                                      openQuickCreate("product");
                                    }}
                                    placeholder={t("placeholders.select")}
                                    createLabel={t("actions.createNew") || "Create New Product"}
                                  />
                                )}
                              />
                              {errors.items?.[idx]?.product_id && <FieldError>{t("validation.required")}</FieldError>}
                            </Field>

                            <Field orientation="vertical">
                              <FieldLabel>{t("items.fields.quantity")} *</FieldLabel>
                              <Controller control={control} name={`items.${idx}.quantity`}
                                render={({ field }) => <NumericInput value={field.value ?? 1} onChange={field.onChange} />}
                              />
                            </Field>

                            <Field orientation="vertical">
                              <FieldLabel>{t("items.fields.price")} *</FieldLabel>
                              <Controller control={control} name={`items.${idx}.price`}
                                render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
                              />
                            </Field>

                            <Field orientation="vertical">
                              <FieldLabel>{t("items.fields.discount")}</FieldLabel>
                              <Controller control={control} name={`items.${idx}.discount`}
                                render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
                              />
                            </Field>

                            <Field orientation="vertical">
                              <FieldLabel>{t("items.fields.notes")}</FieldLabel>
                              <Controller control={control} name={`items.${idx}.notes`}
                                render={({ field }) => (
                                  <Input value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                                )}
                              />
                            </Field>

                            <div className="col-span-2 pt-2 border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">{t("summary.subtotal")}:</span>
                                <span className="text-base font-bold text-primary">{formatMoney(itemSubtotal)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ product_id: "", quantity: 1, price: 0, discount: 0, notes: null })}
                      className="w-full cursor-pointer border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("items.add")}
                    </Button>
                  </div>
                </div>

                {/* Totals Summary - Right Column */}
                <div className="col-span-1">
                  <div className="sticky space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">{t("summary.subtotal") ? "Summary" : "Summary"}</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-end gap-1">
                        <span className="text-muted-foreground text-sm">{t("summary.subtotal")}:</span>
                        <span className="font-medium ml-auto">{formatMoney(subtotal)}</span>
                      </div>
                      <div className="flex flex-wrap items-end gap-1">
                        <span className="text-muted-foreground text-sm">{t("summary.taxAmount")} ({taxRate}%):</span>
                        <span className="font-medium ml-auto">{formatMoney(taxAmount)}</span>
                      </div>
                      <div className="flex flex-wrap items-end gap-1">
                        <span className="text-muted-foreground text-sm">{t("summary.deliveryCost")}:</span>
                        <span className="font-medium ml-auto">{formatMoney(Number(deliveryCost))}</span>
                      </div>
                      <div className="flex flex-wrap items-end gap-1">
                        <span className="text-muted-foreground text-sm">{t("summary.otherCost")}:</span>
                        <span className="font-medium ml-auto">{formatMoney(Number(otherCost))}</span>
                      </div>
                      <div className="flex flex-wrap items-end gap-1 border-t pt-3 mt-2">
                        <span className="text-lg font-bold">{t("summary.total")}:</span>
                        <span className="text-lg font-bold text-primary ml-auto">{formatMoney(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                  {t("actions.back") || "Back"}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                    {t("actions.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isFetchingAddData} className="cursor-pointer">
                    <ButtonLoading loading={isSubmitting || isFetchingAddData}>
                      {t("actions.save")}
                    </ButtonLoading>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </form>
        </Tabs>
      </DialogContent>
      <SupplierDialog
        open={quickCreate.type === "supplier"}
        onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
        editingItem={null}
        onCreated={handleSupplierCreated}
      />
      <PaymentTermsDialog
        open={quickCreate.type === "paymentTerm"}
        onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
        editingItem={null}
        onCreated={handlePaymentTermCreated}
      />
      <BusinessUnitForm
        open={quickCreate.type === "businessUnit"}
        onClose={closeQuickCreate}
        onCreated={handleBusinessUnitCreated}
      />
      <ProductDialog
        open={quickCreate.type === "product"}
        onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
        editingItem={null}
        onCreated={handleProductCreated}
      />
    </Dialog>
  );
}

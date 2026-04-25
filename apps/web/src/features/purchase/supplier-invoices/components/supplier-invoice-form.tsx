"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarIcon, CheckCircle2, DollarSign, FileText, Receipt, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ButtonLoading } from "@/components/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { PaymentTermsDialog } from "@/features/master-data/payment-and-couriers/payment-terms/components/payment-terms-dialog";

import {
  useCreateSupplierInvoice,
  useSupplierInvoice,
  useSupplierInvoiceAddData,
  useUpdateSupplierInvoice,
} from "../hooks/use-supplier-invoices";
import { supplierInvoicesService } from "../services/supplier-invoices-service";
import { usePurchaseOrder } from "@/features/purchase/orders/hooks/use-purchase-orders";
import {
  supplierInvoiceSchema,
  type SupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";
import type { SupplierInvoiceJournalPreview } from "../types";

// Local narrow types to avoid `any` casts
type PaymentTermOption = { id: string; name: string; code?: string };
type ProductRef = { id?: string; name?: string; code?: string };

// Purchase Order item shape (narrowed) used when mapping PO -> invoice items
type POItem = {
  product_id: string;
  product?: ProductRef | null;
  quantity: number;
  price: number;
  discount?: number | null;
};

type InvoiceItem = SupplierInvoiceFormData["items"][number];

type QuickCreateType = "paymentTerm" | null;

const NONE_VALUE = "__none__";
const LOADING_VALUE = "__loading__";
const EMPTY_VALUE = "__empty__";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SupplierInvoiceFormDialog({
  open,
  onOpenChange,
  invoiceId,
  defaultPurchaseOrderId,
  defaultGoodsReceiptId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  defaultPurchaseOrderId?: string | null;
  defaultGoodsReceiptId?: string | null;
  onSuccess?: (invoiceId: string) => void;
}) {
  const t = useTranslations("supplierInvoice");
  const isEdit = !!invoiceId;

  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const [shouldLoadSelectData, setShouldLoadSelectData] = useState(true);
  const [journalPreview, setJournalPreview] = useState<SupplierInvoiceJournalPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const addDataQuery = useSupplierInvoiceAddData({ enabled: open && shouldLoadSelectData });
  const detailQuery = useSupplierInvoice(invoiceId ?? "", { enabled: open && isEdit });
  const poQuery = usePurchaseOrder(defaultPurchaseOrderId ?? "", { enabled: open && !!defaultPurchaseOrderId && !isEdit });

  const createMutation = useCreateSupplierInvoice();
  const updateMutation = useUpdateSupplierInvoice();

  const form = useForm<SupplierInvoiceFormData>({
    resolver: zodResolver(supplierInvoiceSchema),
    defaultValues: {
      goods_receipt_id: "",
      payment_terms_id: "",
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      tax_rate: 0,
      delivery_cost: 0,
      other_cost: 0,
      notes: null,
      items: [],
    },
  });

  const addData = addDataQuery.data?.success ? addDataQuery.data.data : null;

  const paymentTerms = useMemo<PaymentTermOption[]>(() => addData?.payment_terms ?? [], [addData?.payment_terms]);
  const mergedPaymentTerms = useMemo(() => {
    const list: PaymentTermOption[] = [...paymentTerms];
    const sel = detailQuery.data?.data?.payment_terms as PaymentTermOption | undefined;
    if (sel?.id && !list.some((x) => x.id === sel.id)) list.push(sel);
    return list;
  }, [paymentTerms, detailQuery.data?.data?.payment_terms]);

  const selectedGRId = form.watch("goods_receipt_id");
  const setFormValue = form.setValue;

  useEffect(() => {
    if (!open) {
      setJournalPreview(null);
      return;
    }
    setShouldLoadSelectData(true);
  }, [open]);

  const filteredGRs = useMemo(() => {
    const all = addData?.goods_receipts ?? [];
    if (!defaultPurchaseOrderId) return all;
    return all.filter((gr) => gr.purchase_order?.id === defaultPurchaseOrderId);
  }, [addData?.goods_receipts, defaultPurchaseOrderId]);

  const selectedGR = useMemo(() => {
    if (!addData?.goods_receipts?.length || !selectedGRId) return null;
    return addData.goods_receipts.find((gr) => gr.id === selectedGRId) ?? null;
  }, [addData?.goods_receipts, selectedGRId]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("basic");

    if (!isEdit) {
      // Base initial values
      const initial: SupplierInvoiceFormData = {
        goods_receipt_id: defaultGoodsReceiptId ?? "",
        payment_terms_id: "",
        invoice_number: "",
        invoice_date: "",
        due_date: "",
        tax_rate: 0,
        delivery_cost: 0,
        other_cost: 0,
        notes: null,
        items: [] as InvoiceItem[],
      };

      // If opened from a PO, prefill PO-derived defaults even before/without GR selection.
      if (defaultPurchaseOrderId && !defaultGoodsReceiptId) {
        const po = poQuery.data?.success ? poQuery.data.data : null;
        if (po) {
          const paymentTermID = (po.payment_terms as PaymentTermOption | undefined)?.id ?? "";
          initial.payment_terms_id = paymentTermID;
          initial.tax_rate = po.tax_rate ?? 0;
          initial.delivery_cost = po.delivery_cost ?? 0;
          initial.other_cost = po.other_cost ?? 0;
          initial.invoice_date = todayISO();
          initial.due_date = po.due_date ?? initial.invoice_date;
          initial.items = (po.items ?? []).map((it) => {
            const prod = it.product as ProductRef | undefined;
            return {
              product_id: it.product_id,
              product_name: prod?.name ?? "",
              product_code: prod?.code ?? "",
              quantity: it.quantity,
              price: it.price,
              discount: it.discount ?? 0,
            };
          });
        }

        // If there's exactly one GR for that PO, select it so the GR-based autofill runs.
        if (filteredGRs.length === 1) {
          initial.goods_receipt_id = filteredGRs[0].id;
        }
      }

      form.reset(initial);
      return;
    }

    const detail = detailQuery.data?.success ? detailQuery.data.data : null;
    if (!detail) return;

    form.reset({
      goods_receipt_id: detail.goods_receipt?.id ?? "",
      payment_terms_id: detail.payment_terms?.id ?? "",
      invoice_number: detail.invoice_number,
      invoice_date: detail.invoice_date,
      due_date: detail.due_date,
      tax_rate: detail.tax_rate,
      delivery_cost: detail.delivery_cost,
      other_cost: detail.other_cost,
      notes: detail.notes ?? null,
      items: detail.items.map((it) => ({
        product_id: it.product_id,
        product_name: (it.product as ProductRef)?.name,
        product_code: (it.product as ProductRef)?.code,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount,
      })),
    });
  }, [open, isEdit, detailQuery.data, form, defaultGoodsReceiptId, defaultPurchaseOrderId, filteredGRs, poQuery.data]);

  useEffect(() => {
    if (!open || isEdit || !selectedGR) return;
    const linkedPO = poQuery.data?.success ? poQuery.data.data : null;

    setFormValue(
      "items",
      selectedGR.items.map((it) => ({
        product_id: it.product?.id ?? "",
        product_name: it.product?.name ?? "",
        product_code: it.product?.code ?? "",
        quantity: it.quantity_remaining,
        price: it.price,
        discount: 0,
      })).filter(it => it.quantity > 0),
      { shouldValidate: true },
    );
    // Auto-fill payment terms from the GR's linked PO when not already set
    const currentPT = form.getValues("payment_terms_id");
    if (!currentPT && selectedGR.default_payment_terms_id) {
      setFormValue("payment_terms_id", selectedGR.default_payment_terms_id, { shouldValidate: true });
    }

    // Keep PO-derived financial defaults in sync when creating SI from PO shortcuts.
    if (linkedPO) {
      const currentInvoiceDate = form.getValues("invoice_date");
      if (!currentInvoiceDate) {
        const nextInvoiceDate = todayISO();
        setFormValue("invoice_date", nextInvoiceDate, { shouldValidate: true });
      }

      const currentDueDate = form.getValues("due_date");
      if (!currentDueDate) {
        setFormValue("due_date", linkedPO.due_date ?? todayISO(), { shouldValidate: true });
      }

      const currentTaxRate = form.getValues("tax_rate") ?? 0;
      if (currentTaxRate === 0 && (linkedPO.tax_rate ?? 0) !== 0) {
        setFormValue("tax_rate", linkedPO.tax_rate ?? 0, { shouldValidate: true });
      }

      const currentDeliveryCost = form.getValues("delivery_cost") ?? 0;
      if (currentDeliveryCost === 0 && (linkedPO.delivery_cost ?? 0) !== 0) {
        setFormValue("delivery_cost", linkedPO.delivery_cost ?? 0, { shouldValidate: true });
      }

      const currentOtherCost = form.getValues("other_cost") ?? 0;
      if (currentOtherCost === 0 && (linkedPO.other_cost ?? 0) !== 0) {
        setFormValue("other_cost", linkedPO.other_cost ?? 0, { shouldValidate: true });
      }
    }
  }, [open, isEdit, selectedGR, setFormValue, form, poQuery.data]);

  const handlePaymentTermCreated = useCallback((item: { id: string; name: string }) => {
    form.setValue("payment_terms_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [form, closeQuickCreate]);

  const isBusy = detailQuery.isLoading || createMutation.isPending || updateMutation.isPending;

  const watchedItems = form.watch("items");
  const taxRate = form.watch("tax_rate") ?? 0;
  const deliveryCost = form.watch("delivery_cost") ?? 0;
  const otherCost = form.watch("other_cost") ?? 0;

  const subtotal = useMemo(() =>
    (watchedItems ?? []).reduce((sum, it) => {
      const qty = Number(it?.quantity ?? 0);
      const price = Number(it?.price ?? 0);
      const disc = Number(it?.discount ?? 0);
      return sum + qty * price * (1 - disc / 100);
    }, 0),
    [watchedItems],
  );
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const totalAmount = subtotal + taxAmount + Number(deliveryCost) + Number(otherCost);
  const detectedDownPayments = useMemo(() => {
    if (isEdit) return [];
    const dp = selectedGR?.invoice_dp;
    if (!dp) return [];

    const status = (dp.status ?? "").toLowerCase();
    if (status !== "approved" && status !== "partial" && status !== "paid") return [];

    return [dp];
  }, [isEdit, selectedGR]);
  const downPaymentAmount = useMemo(
    () => detectedDownPayments.reduce((sum, dp) => sum + (dp.amount ?? 0), 0),
    [detectedDownPayments],
  );
  const amountDue = useMemo(() => Math.max(0, totalAmount - downPaymentAmount), [totalAmount, downPaymentAmount]);
  const formatMoney = useCallback((v: number) => formatCurrency(v), []);

  const [invoiceDateOpen, setInvoiceDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const handleNext = async () => {
    const isValid = await form.trigger(["goods_receipt_id", "payment_terms_id", "invoice_number", "invoice_date", "due_date"]);
    if (isValid) {
      setActiveTab("items");
    }
  };

  async function onSubmit(values: SupplierInvoiceFormData) {
    const cleaned = { ...values, items: values.items.filter((it) => it.product_id.length > 0) };
    try {
      if (isEdit && invoiceId) {
        const response = await updateMutation.mutateAsync({ id: invoiceId, data: cleaned });
        if (!response.success) throw new Error(response.error ?? "update_failed");
        toast.success(t("toast.updated"));
        onOpenChange(false);
      } else {
        const response = await createMutation.mutateAsync(cleaned);
        if (!response.success) throw new Error(response.error ?? "create_failed");
        toast.success(t("toast.created"));
        onOpenChange(false);
        if (response.data?.id) {
          onSuccess?.(response.data.id);
        }
      }
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  const handlePreviewJournal = async () => {
    if (isEdit) {
      toast.error("Journal preview is available for new vendor bill only.");
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error(t("toast.failed"));
      return;
    }

    const values = form.getValues();
    const payload = { ...values, items: values.items.filter((it) => it.product_id.length > 0) };
    try {
      setIsPreviewing(true);
      const response = await supplierInvoicesService.preview(payload);
      if (!response.success) throw new Error(response.error ?? "preview_failed");
      setJournalPreview(response.data);
      toast.success("Journal preview generated.");
    } catch {
      toast.error(t("toast.failed"));
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "basic" | "items")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("common.basicInfo") || t("tabs.basic") || "Basic Information"}</TabsTrigger>
            <TabsTrigger value="items">{t("items.title") || "Items"} & {t("fields.summaryTitle") || "Summary"}</TabsTrigger>
          </TabsList>

          <form
            className="space-y-6 mt-4"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              // If there are validation errors, switch to the tab containing the first error
              if (!errors) return;
              // Basic tab fields
              const basicFields = ["goods_receipt_id", "payment_terms_id", "invoice_number", "invoice_date", "due_date"];
              const errorKeys = Object.keys(errors || {}) as string[];
              // If any basic field has error, focus basic tab
              if (errorKeys.some((k) => basicFields.includes(k))) {
                setActiveTab("basic");
                return;
              }
              // If items has errors, focus items tab
              if (errorKeys.includes("items")) {
                setActiveTab("items");
                return;
              }
              // Default to basic
              setActiveTab("basic");
            })}
          >
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.invoiceInfo") || "Invoice Info"}</h3>
              </div>

              {/* Goods Receipt — full width */}
              <Field orientation="vertical">
                <FieldLabel>{t("fields.goodsReceipt") || "Goods Receipt"}</FieldLabel>
                <Select
                  value={selectedGRId}
                  onValueChange={(value) => setFormValue("goods_receipt_id", value, { shouldValidate: true })}
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      setShouldLoadSelectData(true);
                    }
                  }}
                  disabled={isBusy || isEdit}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder={t("placeholders.select")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value={NONE_VALUE} className="cursor-pointer">{t("placeholders.none") || "None"}</SelectItem>
                    {addDataQuery.isFetching && filteredGRs.length === 0 ? (
                      <SelectItem value={LOADING_VALUE} disabled>
                        Loading...
                      </SelectItem>
                    ) : filteredGRs.length === 0 ? (
                      <SelectItem value={EMPTY_VALUE} disabled>
                        No data available
                      </SelectItem>
                    ) : filteredGRs.map((gr) => (
                      <SelectItem key={gr.id} value={gr.id} className="cursor-pointer">
                        {gr.code}{gr.purchase_order ? ` (PO: ${gr.purchase_order.code})` : ""}{gr.supplier ? ` - ${gr.supplier.name}` : ""}
                      </SelectItem>
                    ))}
                    {isEdit && detailQuery.data?.data?.goods_receipt && !filteredGRs.some((x) => x.id === detailQuery.data?.data?.goods_receipt?.id) && (
                      <SelectItem value={detailQuery.data.data.goods_receipt.id} className="cursor-pointer">
                        {detailQuery.data.data.goods_receipt.code}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.goods_receipt_id && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.goods_receipt_id.message}</p>
                )}
              </Field>

              {/* Invoice Date + Due Date — paired row with Calendar */}
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.invoiceDate")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="invoice_date"
                    render={({ field }) => (
                      <Popover open={invoiceDateOpen} onOpenChange={setInvoiceDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            className="w-full justify-start text-left font-normal cursor-pointer"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "dd MMM yyyy") : t("placeholders.pickDate") || "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date: Date | undefined) => {
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              setInvoiceDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.invoice_date && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.invoice_date.message}</p>
                  )}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.dueDate")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            className="w-full justify-start text-left font-normal cursor-pointer"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "dd MMM yyyy") : t("placeholders.pickDate") || "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date: Date | undefined) => {
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              setDueDateOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.due_date && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.due_date.message}</p>
                  )}
                </Field>
              </div>

              {/* Payment Terms + Invoice Number — paired row */}
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.paymentTerms")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="payment_terms_id"
                    render={({ field }) => (
                      <CreatableCombobox
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || "")}
                        onOpenChange={(isOpen) => {
                          if (isOpen) {
                            setShouldLoadSelectData(true);
                          }
                        }}
                        options={mergedPaymentTerms.map((pt) => ({ value: pt.id, label: pt.code ? `${pt.code} - ${pt.name}` : pt.name }))}
                        createPermission="payment_term.create"
                        onCreateClick={() => openQuickCreate("paymentTerm")}
                        placeholder={t("placeholders.select")}
                        createLabel={t("actions.createNew") || "Create New Payment Terms"}
                        isLoading={addDataQuery.isFetching}
                      />
                    )}
                  />
                  {form.formState.errors.payment_terms_id && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.payment_terms_id.message}</p>
                  )}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.invoiceNumber")}</FieldLabel>
                  <Input
                    value={form.watch("invoice_number")}
                    onChange={(e) => setFormValue("invoice_number", e.target.value, { shouldValidate: true })}
                    disabled={isBusy}
                  />
                  {form.formState.errors.invoice_number && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.invoice_number.message}</p>
                  )}
                </Field>
              </div>

              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.financial") || "Financial"}</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.taxRate")}</FieldLabel>
                  <NumericInput
                    value={form.watch("tax_rate")}
                    onChange={(v) => setFormValue("tax_rate", Number(v), { shouldValidate: true })}
                    disabled={isBusy}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.deliveryCost")}</FieldLabel>
                  <NumericInput
                    value={form.watch("delivery_cost")}
                    onChange={(v) => setFormValue("delivery_cost", Number(v), { shouldValidate: true })}
                    disabled={isBusy}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.otherCost")}</FieldLabel>
                  <NumericInput
                    value={form.watch("other_cost")}
                    onChange={(v) => setFormValue("other_cost", Number(v), { shouldValidate: true })}
                    disabled={isBusy}
                  />
                </Field>
              </div>

              <Field orientation="vertical">
                <FieldLabel>{t("fields.notes")}</FieldLabel>
                <Textarea
                  value={form.watch("notes") ?? ""}
                  onChange={(e) => setFormValue("notes", e.target.value, { shouldValidate: true })}
                  disabled={isBusy}
                />
              </Field>

              {!isEdit && detectedDownPayments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                    <Receipt className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("sections.detectedDownPayments") || "Detected Down Payments"}</h3>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                    {detectedDownPayments.map((dp) => (
                      <div key={dp.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-card border">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">{dp.code}</span>
                          <span className="text-xs text-muted-foreground">({dp.status})</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">{formatMoney(dp.amount ?? 0)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border bg-card p-4 space-y-2">
                    <h4 className="text-sm font-semibold">{t("sections.invoiceSummary") || "Invoice Summary"}</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("fields.total") || "Invoice Total"}</span>
                        <span className="font-medium">{formatMoney(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-success">
                        <span>{t("fields.downPaymentApplied") || "Down Payment Applied"}</span>
                        <span className="font-medium">-{formatMoney(downPaymentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5">
                        <span>{t("fields.amountDue") || "Amount Due"}</span>
                        <span className="text-primary">{formatMoney(amountDue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                  {t("actions.cancel")}
                </Button>
                <Button type="button" onClick={handleNext} className="cursor-pointer">
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
                            <h3 className="text-sm font-medium">{t("items.title")} ({watchedItems.length})</h3>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {watchedItems.map((row, idx) => {
                                const itemSubtotal = (row.quantity ?? 0) * (row.price ?? 0) * (1 - ((row.discount ?? 0) / 100));
                                return (
                                    <div
                                        key={`${row.product_id}-${idx}`}
                                        className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="absolute top-2 right-2">
                                            <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">#{idx + 1}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-6">
                                            <div className="col-span-2">
                                                <FieldLabel>{t("items.fields.product")}</FieldLabel>
                                                <div className="mt-1 p-2 rounded-md bg-muted/50 text-sm">
                                                    <p className="font-medium">{(row as { product_code?: string; product_name?: string }).product_name || (row as { product_code?: string }).product_code || row.product_id}</p>
                                                    <p className="text-xs text-muted-foreground">{(row as { product_code?: string }).product_code ?? ""}</p>
                                                </div>
                                            </div>

                                            <Field orientation="vertical">
                                                <FieldLabel>{t("items.fields.quantity")}</FieldLabel>
                                                <NumericInput
                                                    value={row.quantity ?? 0}
                                                    max={selectedGR?.items.find(x => x.product?.id === row.product_id)?.quantity_remaining}
                                                    onChange={(v) => {
                                                      const items = form.getValues("items");
                                                      items[idx] = { ...items[idx], quantity: v ?? 0 };
                                                      form.setValue("items", items, { shouldValidate: true });
                                                    }}
                                                    disabled={isBusy}
                                                />
                                            </Field>

                                            <Field orientation="vertical">
                                                <FieldLabel>{t("items.fields.price")}</FieldLabel>
                                                <NumericInput
                                                    value={row.price ?? 0}
                                                    onChange={(v) => {
                                                      const items = form.getValues("items");
                                                      items[idx] = { ...items[idx], price: v ?? 0 };
                                                      form.setValue("items", items, { shouldValidate: true });
                                                    }}
                                                    disabled={isBusy}
                                                />
                                            </Field>

                                            <Field orientation="vertical">
                                                <FieldLabel>{t("items.fields.discount")}</FieldLabel>
                                                <NumericInput
                                                    value={row.discount ?? 0}
                                                    onChange={(v) => {
                                                      const items = form.getValues("items");
                                                      items[idx] = { ...items[idx], discount: v };
                                                      form.setValue("items", items, { shouldValidate: true });
                                                    }}
                                                    disabled={isBusy}
                                                />
                                            </Field>

                                            <div className="col-span-2 pt-2 border-t border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-muted-foreground">{t("fields.subtotal")}:</span>
                                                    <span className="text-base font-bold text-primary">{formatMoney(itemSubtotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {journalPreview?.three_way_matching && journalPreview.three_way_matching.length > 0 && (
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <h4 className="text-sm font-semibold mb-2">3-Way Matching (PO vs GR vs Bill)</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b text-muted-foreground">
                                        <th className="py-1.5 text-left">Product</th>
                                        <th className="py-1.5 text-right">PO</th>
                                        <th className="py-1.5 text-right">GR</th>
                                        <th className="py-1.5 text-right">Billed</th>
                                        <th className="py-1.5 text-right">This Bill</th>
                                        <th className="py-1.5 text-right">Remaining</th>
                                        <th className="py-1.5 text-right">Valid</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {journalPreview.three_way_matching.map((line) => (
                                        <tr key={line.product_id} className="border-b last:border-0">
                                          <td className="py-1.5 text-left">
                                            <div className="font-medium">{line.product_name || line.product_id}</div>
                                            <div className="text-muted-foreground">{line.product_code || "-"}</div>
                                          </td>
                                          <td className="py-1.5 text-right">{line.quantity_po.toFixed(2)}</td>
                                          <td className="py-1.5 text-right">{line.quantity_gr.toFixed(2)}</td>
                                          <td className="py-1.5 text-right">{line.quantity_already_billed.toFixed(2)}</td>
                                          <td className="py-1.5 text-right">{line.quantity_bill.toFixed(2)}</td>
                                          <td className="py-1.5 text-right">{line.quantity_remaining.toFixed(2)}</td>
                                          <td className="py-1.5 text-right">
                                            <span className={line.is_valid ? "text-success font-medium" : "text-destructive font-medium"}>
                                              {line.is_valid ? "OK" : "Over"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                        </div>
                    </div>

                    {/* Totals Summary - Right Column */}
                    <div className="col-span-1">
                        <div className="sticky space-y-4">
                            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-medium">{t("fields.summaryTitle") || "Summary"}</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-end gap-1">
                                    <span className="text-muted-foreground text-sm">{t("fields.subtotal")}:</span>
                                    <span className="font-medium ml-auto">{formatMoney(subtotal)}</span>
                                </div>
                                <div className="flex flex-wrap items-end gap-1">
                                    <span className="text-muted-foreground text-sm">{t("fields.taxAmount")}:</span>
                                    <span className="font-medium ml-auto">{formatMoney(taxAmount)}</span>
                                </div>
                                <div className="flex flex-wrap items-end gap-1">
                                    <span className="text-muted-foreground text-sm">{t("fields.deliveryCost")}:</span>
                                    <span className="font-medium ml-auto">{formatMoney(Number(deliveryCost))}</span>
                                </div>
                                <div className="flex flex-wrap items-end gap-1">
                                    <span className="text-muted-foreground text-sm">{t("fields.otherCost")}:</span>
                                    <span className="font-medium ml-auto">{formatMoney(Number(otherCost))}</span>
                                </div>
                                <div className="flex flex-wrap items-end gap-1 border-t pt-3 mt-2">
                                    <span className="text-lg font-bold">{t("fields.total")}:</span>
                                    <span className="text-lg font-bold text-primary ml-auto">{formatMoney(totalAmount)}</span>
                                </div>
                                <div className="border-t pt-3 mt-4 space-y-2 bg-muted/30 p-3 rounded-lg">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t("fields.downPaymentApplied") || "Down Payment Applied"}</span>
                                    <span className="font-medium text-success">-{formatMoney(downPaymentAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                                    <span>{t("fields.amountDue") || "Amount Due"}</span>
                                    <span className="text-primary">{formatMoney(amountDue)}</span>
                                  </div>
                                </div>

                                {!isEdit && (
                                  <div className="border-t pt-3 mt-2 space-y-3 bg-card p-3 rounded-lg">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <h4 className="text-sm font-semibold">Journal Preview</h4>
                                        <p className="text-xs text-muted-foreground">Simulate GRNI, VAT In, AP, and DP offset before posting.</p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePreviewJournal}
                                        disabled={isPreviewing || isBusy}
                                        className="cursor-pointer"
                                      >
                                        <ButtonLoading loading={isPreviewing} loadingText="Previewing...">
                                          Preview
                                        </ButtonLoading>
                                      </Button>
                                    </div>

                                    {journalPreview ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs">
                                          <span className="text-muted-foreground">Balanced</span>
                                          <span className={journalPreview.is_balanced ? "font-semibold text-success" : "font-semibold text-destructive"}>
                                            {journalPreview.is_balanced ? "Yes" : "No"}
                                          </span>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                                          {journalPreview.lines.map((line, index) => (
                                            <div key={`${line.chart_of_account_id}-${index}`} className="rounded-md border bg-background p-2 text-xs">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                  <div className="font-medium truncate">
                                                    {line.chart_of_account_code ? `${line.chart_of_account_code} ` : ""}
                                                    {line.chart_of_account_name || line.memo}
                                                  </div>
                                                  <div className="text-muted-foreground truncate">{line.memo}</div>
                                                </div>
                                                <div className="shrink-0 text-right font-mono">
                                                  <div className={line.debit > 0 ? "text-success" : "text-muted-foreground"}>
                                                    DR {formatMoney(line.debit)}
                                                  </div>
                                                  <div className={line.credit > 0 ? "text-destructive" : "text-muted-foreground"}>
                                                    CR {formatMoney(line.credit)}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Generate a preview to see journal lines.</p>
                                    )}
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                        {t("actions.back") || "Back"}
                    </Button>
                    <div className="flex flex-col items-end gap-2">
                        {form.formState.errors.items && (
                          <p className="text-sm text-destructive">
                            {(form.formState.errors.items as { message?: string }).message ?? "At least one item is required"}
                          </p>
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy} className="cursor-pointer">
                                {t("actions.cancel")}
                            </Button>
                            <Button type="submit" disabled={isBusy} className="cursor-pointer">
                                <ButtonLoading loading={isBusy}>
                                    {t("actions.save")}
                                </ButtonLoading>
                            </Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
          </form>
        </Tabs>
      </DialogContent>
      <PaymentTermsDialog
        open={quickCreate.type === "paymentTerm"}
        onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
        editingItem={null}
        onCreated={handlePaymentTermCreated}
      />
    </Dialog>
  );
}

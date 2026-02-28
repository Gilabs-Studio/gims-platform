"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { DollarSign, FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ButtonLoading } from "@/components/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

import { PaymentTermsDialog } from "@/features/master-data/payment-and-couriers/payment-terms/components/payment-terms-dialog";

import {
  useCreateSupplierInvoice,
  useSupplierInvoice,
  useSupplierInvoiceAddData,
  useUpdateSupplierInvoice,
} from "../hooks/use-supplier-invoices";
import {
  supplierInvoiceSchema,
  type SupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";

type QuickCreateType = "paymentTerm" | null;

const NONE_VALUE = "__none__";

export function SupplierInvoiceFormDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
}) {
  const t = useTranslations("supplierInvoice");
  const isEdit = !!invoiceId;

  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const addDataQuery = useSupplierInvoiceAddData({ enabled: open });
  const detailQuery = useSupplierInvoice(invoiceId ?? "", { enabled: open && isEdit });

  const createMutation = useCreateSupplierInvoice();
  const updateMutation = useUpdateSupplierInvoice();

  const form = useForm<SupplierInvoiceFormData>({
    resolver: zodResolver(supplierInvoiceSchema),
    defaultValues: {
      purchase_order_id: "",
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

  const paymentTerms = useMemo(() => addData?.payment_terms ?? [], [addData?.payment_terms]);
  const mergedPaymentTerms = useMemo(() => {
    const list = [...paymentTerms];
    const sel = detailQuery.data?.data?.payment_terms;
    if (sel?.id && !list.some((x) => x.id === sel.id)) list.push(sel as any);
    return list;
  }, [paymentTerms, detailQuery.data?.data?.payment_terms]);

  const selectedPOId = form.watch("purchase_order_id");
  const setFormValue = form.setValue;

  const selectedPO = useMemo(() => {
    if (!addData?.purchase_orders?.length || !selectedPOId) return null;
    return addData.purchase_orders.find((po) => po.id === selectedPOId) ?? null;
  }, [addData?.purchase_orders, selectedPOId]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("basic");

    if (!isEdit) {
      form.reset({
        purchase_order_id: "",
        payment_terms_id: "",
        invoice_number: "",
        invoice_date: "",
        due_date: "",
        tax_rate: 0,
        delivery_cost: 0,
        other_cost: 0,
        notes: null,
        items: [],
      });
      return;
    }

    const detail = detailQuery.data?.success ? detailQuery.data.data : null;
    if (!detail) return;

    form.reset({
      purchase_order_id: detail.purchase_order?.id ?? "",
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
        product_name: (it.product as any)?.name,
        product_code: (it.product as any)?.code,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount,
      })),
    });
  }, [open, isEdit, detailQuery.data, form]);

  useEffect(() => {
    if (!open || isEdit || !selectedPO) return;
    setFormValue(
      "items",
      selectedPO.items.map((it) => ({
        product_id: it.product?.id ?? "",
        quantity: it.quantity,
        price: it.price,
        discount: 0,
      })),
      { shouldValidate: true },
    );
  }, [open, isEdit, selectedPO, setFormValue]);

  const handlePaymentTermCreated = useCallback((item: { id: string; name: string }) => {
    form.setValue("payment_terms_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [form, closeQuickCreate]);

  const isBusy = addDataQuery.isLoading || detailQuery.isLoading || createMutation.isPending || updateMutation.isPending;

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
  const formatMoney = useCallback((v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v),
    []);

  async function onSubmit(values: SupplierInvoiceFormData) {
    const cleaned = { ...values, items: values.items.filter((it) => it.product_id.length > 0) };
    try {
      if (isEdit && invoiceId) {
        const response = await updateMutation.mutateAsync({ id: invoiceId, data: cleaned });
        if (!response.success) throw new Error(response.error ?? "update_failed");
        toast.success(t("toast.updated"));
      } else {
        const response = await createMutation.mutateAsync(cleaned);
        if (!response.success) throw new Error(response.error ?? "create_failed");
        toast.success(t("toast.created"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        {addDataQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "basic" | "items")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("tabs.basic") || "Basic Info"}</TabsTrigger>
            <TabsTrigger value="items">{t("tabs.items") || "Items"}</TabsTrigger>
          </TabsList>

          <form className="space-y-6 mt-4" onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.invoiceInfo") || "Invoice Info"}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("fields.purchaseOrder")}</FieldLabel>
                  <Select
                    value={selectedPOId}
                    onValueChange={(value) => setFormValue("purchase_order_id", value, { shouldValidate: true })}
                    disabled={isBusy || isEdit}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("placeholders.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE} className="cursor-pointer">{t("placeholders.none") || "None"}</SelectItem>
                      {(addData?.purchase_orders ?? []).map((po) => (
                        <SelectItem key={po.id} value={po.id} className="cursor-pointer">{po.code}</SelectItem>
                      ))}
                      {isEdit && detailQuery.data?.data?.purchase_order && !(addData?.purchase_orders ?? []).some((x) => x.id === detailQuery.data?.data?.purchase_order?.id) && (
                        <SelectItem value={detailQuery.data.data.purchase_order.id} className="cursor-pointer">
                          {detailQuery.data.data.purchase_order.code}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.paymentTerms")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="payment_terms_id"
                    render={({ field }) => (
                      <CreatableCombobox
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || "")}
                        options={mergedPaymentTerms.map((pt) => ({ value: pt.id, label: (pt as any).code ? `${(pt as any).code} - ${pt.name}` : pt.name }))}
                        createPermission="payment_term.create"
                        onCreateClick={() => openQuickCreate("paymentTerm")}
                        placeholder={t("placeholders.select")}
                        createLabel={t("actions.createNew") || "Create New Payment Terms"}
                      />
                    )}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.invoiceNumber")}</FieldLabel>
                  <Input
                    value={form.watch("invoice_number")}
                    onChange={(e) => setFormValue("invoice_number", e.target.value, { shouldValidate: true })}
                    disabled={isBusy}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.invoiceDate")}</FieldLabel>
                  <Input
                    type="date"
                    value={form.watch("invoice_date")}
                    onChange={(e) => setFormValue("invoice_date", e.target.value, { shouldValidate: true })}
                    disabled={isBusy}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("fields.dueDate")}</FieldLabel>
                  <Input
                    type="date"
                    value={form.watch("due_date")}
                    onChange={(e) => setFormValue("due_date", e.target.value, { shouldValidate: true })}
                    disabled={isBusy}
                  />
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

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                  {t("actions.cancel")}
                </Button>
                <Button type="button" onClick={() => setActiveTab("items")} className="cursor-pointer">
                  {t("actions.next") || "Next"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("items.title")}</h3>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.fields.product")}</TableHead>
                      <TableHead className="text-right">{t("items.fields.quantity")}</TableHead>
                      <TableHead className="text-right">{t("items.fields.price")}</TableHead>
                      <TableHead className="text-right">{t("items.fields.discount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchedItems.map((row, idx) => (
                      <TableRow key={`${row.product_id}-${idx}`}>
                        <TableCell className="max-w-60 truncate">
                          <div className="flex flex-col">
                            <span className="font-medium">{(row as any).product_code || (row.product_id.length > 8 ? row.product_id.slice(0, 8) : row.product_id)}</span>
                            <span className="text-[10px] text-muted-foreground">{(row as any).product_name || ""}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 text-right"
                            value={row.quantity}
                            onChange={(e) => {
                              const items = form.getValues("items");
                              items[idx] = { ...items[idx], quantity: Number(e.target.value) };
                              form.setValue("items", items, { shouldValidate: true });
                            }}
                            disabled={isBusy}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 text-right"
                            value={row.price}
                            onChange={(e) => {
                              const items = form.getValues("items");
                              items[idx] = { ...items[idx], price: Number(e.target.value) };
                              form.setValue("items", items, { shouldValidate: true });
                            }}
                            disabled={isBusy}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 text-right"
                            value={row.discount ?? 0}
                            onChange={(e) => {
                              const items = form.getValues("items");
                              items[idx] = { ...items[idx], discount: Number(e.target.value) };
                              form.setValue("items", items, { shouldValidate: true });
                            }}
                            disabled={isBusy}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("fields.subtotal") || "Subtotal"}</span><span className="font-medium">{formatMoney(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("fields.taxAmount") || "Tax"}</span><span className="font-medium">{formatMoney(taxAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("fields.deliveryCost")}</span><span className="font-medium">{formatMoney(Number(deliveryCost))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("fields.otherCost")}</span><span className="font-medium">{formatMoney(Number(otherCost))}</span></div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-semibold"><span>{t("fields.total") || "Total"}</span><span>{formatMoney(totalAmount)}</span></div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                  {t("actions.back") || "Back"}
                </Button>
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

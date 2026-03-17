"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FileText, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { ButtonLoading } from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import type { PurchaseOrderDetail } from "@/features/purchase/orders/types";
import { purchaseOrdersService } from "@/features/purchase/orders/services/purchase-orders-service";

import {
  useCreateGoodsReceipt,
  useGoodsReceipt,
  useGoodsReceiptAddData,
  useUpdateGoodsReceipt,
} from "../hooks/use-goods-receipts";
import { goodsReceiptSchema, type GoodsReceiptFormData } from "../schemas/goods-receipt.schema";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getNameFromUnknown(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const maybe = value.name;
  return typeof maybe === "string" && maybe.trim() ? maybe : null;
}

function toSafeNumber(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

interface GoodsReceiptFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly goodsReceiptId?: string | null;
  /** Pre-select a PO when opening a blank create form from the PO list shortcut. */
  readonly defaultPurchaseOrderId?: string | null;
  /** Called with the new GR id after a successful create. */
  readonly onCreated?: (id: string) => void;
}

export function GoodsReceiptForm({ open, onClose, goodsReceiptId, defaultPurchaseOrderId, onCreated }: GoodsReceiptFormProps) {
  const t = useTranslations("goodsReceipt");
  const tCommon = useTranslations("common");

  const isEdit = !!goodsReceiptId;
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");

  const form = useForm<GoodsReceiptFormData>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: { purchase_order_id: "", notes: null, proof_image_url: null, items: [] },
    mode: "onSubmit",
  });

  const itemsArray = useFieldArray({ control: form.control, name: "items" });

  const addDataQuery = useGoodsReceiptAddData({ enabled: open && !isEdit });
  const detailQuery = useGoodsReceipt(goodsReceiptId ?? "", { enabled: open && isEdit });

  const createMutation = useCreateGoodsReceipt();
  const updateMutation = useUpdateGoodsReceipt();

  const [poDetail, setPoDetail] = useState<PurchaseOrderDetail | null>(null);
  const [poLoading, setPoLoading] = useState(false);

  const eligiblePOs = addDataQuery.data?.data?.eligible_purchase_orders ?? [];
  const grDetail = detailQuery.data?.data;
  const grDetailSnapshot = useMemo(() => grDetail ?? null, [grDetail]);

  const selectedPOId = form.watch("purchase_order_id");
  const resetForm = form.reset;
  const replaceItems = itemsArray.replace;
  const poItems = useMemo(() => poDetail?.items ?? [], [poDetail]);
  // Lookup map by PO item ID so the table renders correctly even when
  // fully-received items are filtered out from itemsArray.fields.
  const poItemsById = useMemo(
    () => Object.fromEntries(poItems.map((it) => [it.id, it])),
    [poItems],
  );

  useEffect(() => {
    if (!open) return;
    setActiveTab("basic");
    if (!isEdit) {
      resetForm({ purchase_order_id: defaultPurchaseOrderId ?? "", notes: null, proof_image_url: null, items: [] });
      replaceItems([]);
      // Do not clear poDetail here — the PO-watch effect will load it when defaultPurchaseOrderId is set.
      if (!defaultPurchaseOrderId) setPoDetail(null);
      return;
    }
    if (!grDetailSnapshot) return;
    resetForm({
      purchase_order_id: grDetailSnapshot.purchase_order?.id ?? "",
      notes: grDetailSnapshot.notes ?? null,
      proof_image_url: grDetailSnapshot.proof_image_url ?? null,
      items: grDetailSnapshot.items.map((it) => ({
        purchase_order_item_id: it.purchase_order_item_id,
        product_id: it.product?.id ?? "",
        quantity_received: it.quantity_received ?? 0,
        notes: it.notes ?? null,
      })),
    });
    replaceItems(
      grDetailSnapshot.items.map((it) => ({
        purchase_order_item_id: it.purchase_order_item_id,
        product_id: it.product?.id ?? "",
        quantity_received: it.quantity_received ?? 0,
        notes: it.notes ?? null,
      })),
    );
  }, [open, isEdit, grDetailSnapshot, resetForm, replaceItems, defaultPurchaseOrderId]);

  useEffect(() => {
    const loadPO = async (poId: string) => {
      if (!poId) return;
      setPoLoading(true);
      try {
        const res = await purchaseOrdersService.getById(poId);
        setPoDetail(res.data);
        replaceItems(
          (res.data.items ?? [])
            .filter((it) => (it.quantity_remaining ?? it.quantity) > 0.0001)
            .map((it) => ({
              purchase_order_item_id: it.id,
              product_id: it.product_id,
              quantity_received: 0,
              notes: null,
            })),
        );
      } catch {
        setPoDetail(null);
        replaceItems([]);
      } finally {
        setPoLoading(false);
      }
    };
    if (!open || isEdit) return;
    const poId = selectedPOId;
    if (!poId) { setPoDetail(null); replaceItems([]); return; }
    void loadPO(poId);
  }, [open, isEdit, selectedPOId, replaceItems]);

  const onSubmit = async (values: GoodsReceiptFormData) => {
    try {
      if (isEdit && goodsReceiptId) {
        await updateMutation.mutateAsync({
          id: goodsReceiptId,
          data: {
            notes: values.notes ?? null,
            proof_image_url: values.proof_image_url ?? null,
            items: values.items.map((it) => ({
              purchase_order_item_id: it.purchase_order_item_id,
              product_id: it.product_id,
              quantity_received: it.quantity_received,
              notes: it.notes ?? null,
            })),
          },
        });
        toast.success(t("toast.updated"));
      } else {
        const result = await createMutation.mutateAsync({
          purchase_order_id: values.purchase_order_id,
          notes: values.notes ?? null,
          proof_image_url: values.proof_image_url ?? null,
          items: values.items.map((it) => ({
            purchase_order_item_id: it.purchase_order_item_id,
            product_id: it.product_id,
            quantity_received: it.quantity_received,
            notes: it.notes ?? null,
          })),
        });
        toast.success(t("toast.created"));
        onClose();
        if (result?.data?.id) {
          onCreated?.(result.data.id);
        }
        return;
      }
      onClose();
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const watchedItems = form.watch("items");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("form.editTitle") : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "basic" | "items")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("tabs.basic") || "Basic Info"}</TabsTrigger>
            <TabsTrigger value="items">{t("tabs.items") || "Items"}</TabsTrigger>
          </TabsList>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("sections.receiptInfo") || "Receipt Info"}</h3>
              </div>

              {!isEdit ? (
                <Field data-invalid={!!form.formState.errors.purchase_order_id} orientation="vertical">
                  <FieldLabel>{t("fields.purchaseOrder")}</FieldLabel>
                  <Controller
                    name="purchase_order_id"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("placeholders.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {addDataQuery.isLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">{tCommon("loading")}</div>
                          ) : eligiblePOs.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">{tCommon("empty")}</div>
                          ) : (
                            eligiblePOs.map((po) => (
                              <SelectItem key={po.id} value={po.id} className="cursor-pointer">
                                {po.code} — {po.supplier?.name ?? "-"}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.purchase_order_id?.message ? (
                    <FieldError>{String(form.formState.errors.purchase_order_id.message)}</FieldError>
                  ) : null}
                </Field>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("fields.purchaseOrder")}</FieldLabel>
                    <Input value={grDetail?.purchase_order?.code ?? "-"} readOnly />
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>{t("fields.status")}</FieldLabel>
                    <Input value={grDetail?.status ?? "-"} readOnly />
                  </Field>
                </div>
              )}

              <Field data-invalid={!!form.formState.errors.notes} orientation="vertical">
                <FieldLabel>{t("fields.notes")}</FieldLabel>
                <Controller
                  name="notes"
                  control={form.control}
                  render={({ field }) => (
                    <Textarea
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={t("fields.notes")}
                    />
                  )}
                />
                {form.formState.errors.notes?.message ? (
                  <FieldError>{String(form.formState.errors.notes.message)}</FieldError>
                ) : null}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("fields.proofPhoto")}</FieldLabel>
                <Controller
                  name="proof_image_url"
                  control={form.control}
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value || null)}
                    />
                  )}
                />
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
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("items.title")} ({itemsArray.fields.length})</h3>
              </div>

              {poLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("items.fields.product")}</TableHead>
                        <TableHead className="text-right w-[100px]">{t("items.fields.orderedQty")}</TableHead>
                        <TableHead className="text-right w-[120px]">{t("items.fields.remainingQty") || "Belum Diterima"}</TableHead>
                        <TableHead className="text-right w-[140px]">{t("items.fields.receivedQty")}</TableHead>
                        <TableHead>{t("items.fields.notes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsArray.fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            {selectedPOId ? tCommon("empty") : t("placeholders.select")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemsArray.fields.map((field, idx) => {
                          const poItem = poItemsById[field.purchase_order_item_id];
                          const productName =
                            (!isEdit ? getNameFromUnknown(poItem?.product) : null) ??
                            grDetail?.items?.[idx]?.product?.name ??
                            "-";
                          const orderedQty = !isEdit ? toSafeNumber(poItem?.quantity) : 0;
                          // quantity_remaining is computed server-side from CONFIRMED/CLOSED GRs.
                          // Subtract what the user is currently entering for live feedback.
                          const quantityRemaining = !isEdit ? toSafeNumber(poItem?.quantity_remaining ?? poItem?.quantity) : 0;
                          const currentQtyReceived = toSafeNumber(watchedItems?.[idx]?.quantity_received);
                          const remaining = quantityRemaining - currentQtyReceived;
                          return (
                            <TableRow key={field.id}>
                              <TableCell className="max-w-60 truncate font-medium">{productName}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{orderedQty}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={cn(
                                    "inline-flex items-center justify-center min-w-12 rounded-md px-2 py-0.5 text-xs font-semibold",
                                    remaining > 0 && "bg-warning/10 text-warning",
                                    remaining === 0 && "bg-success/10 text-success",
                                    remaining < 0 && "bg-destructive/10 text-destructive",
                                  )}
                                >
                                  {remaining}
                                </span>
                              </TableCell>
                              <TableCell className="text-right w-[140px]">
                                <Controller
                                  name={`items.${idx}.quantity_received`}
                                  control={form.control}
                                  render={({ field: qtyField }) => (
                                    <NumericInput
                                      value={qtyField.value}
                                      onChange={(v) => qtyField.onChange(toSafeNumber(v))}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-60">
                                <Controller
                                  name={`items.${idx}.notes`}
                                  control={form.control}
                                  render={({ field: noteField }) => (
                                    <Input
                                      value={noteField.value ?? ""}
                                      onChange={(e) => noteField.onChange(e.target.value)}
                                      placeholder={t("items.fields.notes")}
                                    />
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {form.formState.errors.items ? (
                <div className="text-sm text-destructive">{t("form.invalid")}</div>
              ) : null}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                  {t("actions.back") || "Back"}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
                    {t("actions.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                    <ButtonLoading loading={isSubmitting}>
                      {t("actions.save")}
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


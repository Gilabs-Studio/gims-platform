"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
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
}

export function GoodsReceiptForm({ open, onClose, goodsReceiptId }: GoodsReceiptFormProps) {
  const t = useTranslations("goodsReceipt");
  const tCommon = useTranslations("common");

  const isEdit = !!goodsReceiptId;

  const form = useForm<GoodsReceiptFormData>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      purchase_order_id: "",
      notes: null,
      items: [],
    },
    mode: "onSubmit",
  });

  const itemsArray = useFieldArray({
    control: form.control,
    name: "items",
  });

  const addDataQuery = useGoodsReceiptAddData({ enabled: open && !isEdit });
  const detailQuery = useGoodsReceipt(goodsReceiptId ?? "", { enabled: open && isEdit });

  const createMutation = useCreateGoodsReceipt();
  const updateMutation = useUpdateGoodsReceipt();

  const [poDetail, setPoDetail] = useState<PurchaseOrderDetail | null>(null);
  const [poLoading, setPoLoading] = useState(false);

  const eligiblePOs = addDataQuery.data?.data?.eligible_purchase_orders ?? [];
  const grDetail = detailQuery.data?.data;
  const grDetailUpdatedAt = detailQuery.dataUpdatedAt;

  const grDetailSnapshot = useMemo(() => grDetail ?? null, [grDetailUpdatedAt]);

  const selectedPOId = form.watch("purchase_order_id");

  const resetForm = form.reset;
  const replaceItems = itemsArray.replace;

  const poItems = useMemo(() => {
    return poDetail?.items ?? [];
  }, [poDetail]);

  useEffect(() => {
    if (!open) return;

    if (!isEdit) {
      resetForm({ purchase_order_id: "", notes: null, items: [] });
      replaceItems([]);
      setPoDetail(null);
      return;
    }

    if (!grDetailSnapshot) return;

    resetForm({
      purchase_order_id: grDetailSnapshot.purchase_order?.id ?? "",
      notes: grDetailSnapshot.notes ?? null,
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
  }, [open, isEdit, grDetailSnapshot, resetForm, replaceItems]);

  useEffect(() => {
    const loadPO = async (poId: string) => {
      if (!poId) return;
      setPoLoading(true);
      try {
        const res = await purchaseOrdersService.getById(poId);
        setPoDetail(res.data);
        replaceItems(
          (res.data.items ?? []).map((it) => ({
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

    if (!open) return;
    if (isEdit) return;

    const poId = selectedPOId;
    if (!poId) {
      setPoDetail(null);
      replaceItems([]);
      return;
    }

    void loadPO(poId);
  }, [open, isEdit, selectedPOId, replaceItems]);

  const title = isEdit ? t("form.editTitle") : t("form.createTitle");

  const onSubmit = async (values: GoodsReceiptFormData) => {
    try {
      if (isEdit && goodsReceiptId) {
        await updateMutation.mutateAsync({
          id: goodsReceiptId,
          data: {
            notes: values.notes ?? null,
            items: values.items.map((it) => ({
              purchase_order_item_id: it.purchase_order_item_id,
              product_id: it.product_id,
              quantity_received: it.quantity_received,
              notes: it.notes ?? null,
            })),
          },
        });
        toast.success(t("toast.updated"));
        onClose();
        return;
      }

      await createMutation.mutateAsync({
        purchase_order_id: values.purchase_order_id,
        notes: values.notes ?? null,
        items: values.items.map((it) => ({
          purchase_order_item_id: it.purchase_order_item_id,
          product_id: it.product_id,
          quantity_received: it.quantity_received,
          notes: it.notes ?? null,
        })),
      });

      toast.success(t("toast.created"));
      onClose();
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const canSubmit = !createMutation.isPending && !updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="2xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!isEdit ? (
            <Field data-invalid={!!form.formState.errors.purchase_order_id}>
              <FieldLabel>{t("fields.purchaseOrder")}</FieldLabel>

              <Controller
                name="purchase_order_id"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("fields.purchaseOrder")}</div>
                <Input value={grDetail?.purchase_order?.code ?? "-"} readOnly />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">{t("fields.status")}</div>
                <Input value={grDetail?.status ?? "-"} readOnly />
              </div>
            </div>
          )}

          <Field data-invalid={!!form.formState.errors.notes}>
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

          <div className="space-y-2">
            <div className="text-sm font-medium">{t("items.title")}</div>

            {poLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.fields.product")}</TableHead>
                      <TableHead className="text-right">{t("items.fields.orderedQty")}</TableHead>
                      <TableHead className="text-right">{t("items.fields.receivedQty")}</TableHead>
                      <TableHead>{t("items.fields.notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsArray.fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          {selectedPOId ? tCommon("empty") : t("placeholders.select")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemsArray.fields.map((field, idx) => {
                        const productName =
                          (!isEdit ? getNameFromUnknown(poItems[idx]?.product) : null) ??
                          grDetail?.items?.[idx]?.product?.name ??
                          "-";

                        const orderedQty = !isEdit ? poItems[idx]?.quantity ?? 0 : 0;

                        return (
                          <TableRow key={field.id}>
                            <TableCell className="max-w-[240px] truncate">{productName}</TableCell>
                            <TableCell className="text-right">{orderedQty}</TableCell>
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
                            <TableCell className="w-[240px]">
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
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="cursor-pointer">
              {t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

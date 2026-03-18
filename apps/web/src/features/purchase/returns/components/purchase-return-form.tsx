"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePurchaseReturn, usePurchaseReturnFormData } from "../hooks/use-purchase-returns";
import { purchaseReturnSchema, type PurchaseReturnFormData } from "../schemas/purchase-return.schema";

interface PurchaseReturnFormProps {
  readonly defaultGoodsReceiptId?: string;
}

export function PurchaseReturnForm({ defaultGoodsReceiptId }: PurchaseReturnFormProps) {
  const { data: formDataResponse } = usePurchaseReturnFormData();
  const createMutation = useCreatePurchaseReturn();

  const warehouses = formDataResponse?.data?.warehouses ?? [];
  const reasons = formDataResponse?.data?.return_reasons ?? [];
  const actions = formDataResponse?.data?.actions ?? [];
  const conditions = formDataResponse?.data?.item_conditions ?? [];

  const defaultWarehouseId = useMemo(() => warehouses[0]?.id ?? "", [warehouses]);
  const defaultReason = useMemo(() => reasons[0]?.value ?? "OTHER", [reasons]);
  const defaultAction = useMemo(() => actions[0]?.value ?? "SUPPLIER_CREDIT", [actions]);
  const defaultCondition = useMemo(() => conditions[0]?.value ?? "GOOD", [conditions]);

  const form = useForm<PurchaseReturnFormData>({
    resolver: zodResolver(purchaseReturnSchema),
    values: {
      goods_receipt_id: defaultGoodsReceiptId ?? "",
      purchase_order_id: "",
      supplier_id: "",
      warehouse_id: defaultWarehouseId,
      reason: defaultReason,
      action: defaultAction,
      notes: "",
      items: [
        {
          goods_receipt_item_id: "",
          product_id: "",
          uom_id: "",
          condition: defaultCondition,
          qty: 1,
          unit_cost: 0,
        },
      ],
    },
  });

  const onSubmit = async (values: PurchaseReturnFormData) => {
    await createMutation.mutateAsync(values);
    form.reset({ ...values, notes: "" });
  };

  const {
    control,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Purchase Return</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field orientation="vertical">
              <FieldLabel>Goods Receipt ID</FieldLabel>
              <Controller
                name="goods_receipt_id"
                control={control}
                render={({ field }) => <Input {...field} className="cursor-text" />}
              />
              {errors.goods_receipt_id && <FieldError>{errors.goods_receipt_id.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Supplier ID</FieldLabel>
              <Controller
                name="supplier_id"
                control={control}
                render={({ field }) => <Input {...field} className="cursor-text" />}
              />
              {errors.supplier_id && <FieldError>{errors.supplier_id.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Warehouse</FieldLabel>
              <Controller
                name="warehouse_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id} className="cursor-pointer">
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouse_id && <FieldError>{errors.warehouse_id.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Reason</FieldLabel>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value} className="cursor-pointer">
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reason && <FieldError>{errors.reason.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Action</FieldLabel>
              <Controller
                name="action"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map((action) => (
                        <SelectItem key={action.value} value={action.value} className="cursor-pointer">
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.action && <FieldError>{errors.action.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Product ID</FieldLabel>
              <Controller
                name="items.0.product_id"
                control={control}
                render={({ field }) => <Input {...field} className="cursor-text" />}
              />
              {errors.items?.[0]?.product_id && <FieldError>{errors.items[0].product_id?.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Qty</FieldLabel>
              <Controller
                name="items.0.qty"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value || 0))}
                    className="cursor-text"
                  />
                )}
              />
              {errors.items?.[0]?.qty && <FieldError>{errors.items[0].qty?.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Unit Cost</FieldLabel>
              <Controller
                name="items.0.unit_cost"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value || 0))}
                    className="cursor-text"
                  />
                )}
              />
              {errors.items?.[0]?.unit_cost && <FieldError>{errors.items[0].unit_cost?.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Item Condition</FieldLabel>
              <Controller
                name="items.0.condition"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value} className="cursor-pointer">
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.items?.[0]?.condition && <FieldError>{errors.items[0].condition?.message}</FieldError>}
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="cursor-pointer" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Submit Return"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  createWorkOrderSchema,
  type CreateWorkOrderSchema,
} from "../schemas/work-order.schema";
import { useCreateWorkOrder } from "../hooks/use-work-orders";
import { toast } from "sonner";

interface WorkOrderFormDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_LINES = [
  { id: "LINE-1", name: "Line 1 - Granulation & Tableting" },
  { id: "LINE-2", name: "Line 2 - Capsule Encapsulation" },
  { id: "LINE-3", name: "Line 3 - Liquid Syrup Formulation" },
  { id: "LINE-4", name: "Line 4 - Blister Packaging & Secondary Boxing" },
];

export function WorkOrderFormDialog({ open, onClose }: WorkOrderFormDialogProps) {
  const t = useTranslations("manufacturingWorkOrders");
  const createMutation = useCreateWorkOrder();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkOrderSchema>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: {
      batchNumber: "",
      productName: "",
      productCode: "",
      lineId: "LINE-1",
      lineName: "Line 1 - Granulation & Tableting",
      targetQuantity: 10000,
      unit: "Tablets",
      operatorId: "emp-01",
      operatorName: "Ahmad Pratama",
      operatorRole: "Senior Production Pharmacist",
      startDate: new Date().toISOString().substring(0, 16),
      notes: "",
    },
  });

  const selectedLineId = watch("lineId");

  const onSubmit = async (data: CreateWorkOrderSchema) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(t("messages.created", { batch: data.batchNumber }));
      reset();
      onClose();
    } catch {
      toast.error(t("messages.failed"));
    }
  };

  const handleLineChange = (lineId: string) => {
    const found = AVAILABLE_LINES.find((l) => l.id === lineId);
    if (found) {
      setValue("lineId", found.id);
      setValue("lineName", found.name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("formDialog.createTitle")}</DialogTitle>
          <DialogDescription className="text-xs">{t("formDialog.createSubtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* Batch Number & Product Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="batchNumber" className="text-xs font-semibold">
                  {t("formDialog.batchNumber")} *
                </FieldLabel>
                <Input
                  id="batchNumber"
                  placeholder={t("formDialog.batchNumberPlaceholder")}
                  className="h-9 text-xs font-mono"
                  {...register("batchNumber")}
                />
                {errors.batchNumber && <FieldError>{errors.batchNumber.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="productCode" className="text-xs font-semibold">
                  {t("formDialog.productCode")} *
                </FieldLabel>
                <Input
                  id="productCode"
                  placeholder={t("formDialog.productCodePlaceholder")}
                  className="h-9 text-xs font-mono"
                  {...register("productCode")}
                />
                {errors.productCode && <FieldError>{errors.productCode.message}</FieldError>}
              </Field>
            </div>

            {/* Product Name */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="productName" className="text-xs font-semibold">
                {t("formDialog.productName")} *
              </FieldLabel>
              <Input
                id="productName"
                placeholder={t("formDialog.productNamePlaceholder")}
                className="h-9 text-xs"
                {...register("productName")}
              />
              {errors.productName && <FieldError>{errors.productName.message}</FieldError>}
            </Field>

            {/* Production Line */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="line" className="text-xs font-semibold">
                {t("formDialog.line")} *
              </FieldLabel>
              <Select value={selectedLineId} onValueChange={handleLineChange}>
                <SelectTrigger className="h-9 text-xs cursor-pointer">
                  <SelectValue placeholder={t("formDialog.selectLine")} />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LINES.map((line) => (
                    <SelectItem key={line.id} value={line.id} className="text-xs cursor-pointer">
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Target Quantity & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="targetQuantity" className="text-xs font-semibold">
                  {t("formDialog.targetQuantity")} *
                </FieldLabel>
                <Input
                  id="targetQuantity"
                  type="number"
                  min={1}
                  className="h-9 text-xs font-mono"
                  {...register("targetQuantity", { valueAsNumber: true })}
                />
                {errors.targetQuantity && <FieldError>{errors.targetQuantity.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="unit" className="text-xs font-semibold">
                  {t("formDialog.unit")} *
                </FieldLabel>
                <Input
                  id="unit"
                  placeholder={t("formDialog.unitPlaceholder")}
                  className="h-9 text-xs"
                  {...register("unit")}
                />
                {errors.unit && <FieldError>{errors.unit.message}</FieldError>}
              </Field>
            </div>

            {/* Operator Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="operatorName" className="text-xs font-semibold">
                  {t("formDialog.operatorName")} *
                </FieldLabel>
                <Input
                  id="operatorName"
                  placeholder={t("formDialog.operatorNamePlaceholder")}
                  className="h-9 text-xs"
                  {...register("operatorName")}
                />
                {errors.operatorName && <FieldError>{errors.operatorName.message}</FieldError>}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="operatorRole" className="text-xs font-semibold">
                  {t("formDialog.operatorRole")} *
                </FieldLabel>
                <Input
                  id="operatorRole"
                  placeholder={t("formDialog.operatorRolePlaceholder")}
                  className="h-9 text-xs"
                  {...register("operatorRole")}
                />
                {errors.operatorRole && <FieldError>{errors.operatorRole.message}</FieldError>}
              </Field>
            </div>

            {/* Scheduled Start Date */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="startDate" className="text-xs font-semibold">
                {t("formDialog.startDate")}
              </FieldLabel>
              <Input
                id="startDate"
                type="datetime-local"
                className="h-9 text-xs"
                {...register("startDate")}
              />
            </Field>

            {/* Notes */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="notes" className="text-xs font-semibold">
                {t("formDialog.notes")}
              </FieldLabel>
              <Input
                id="notes"
                placeholder={t("formDialog.notesPlaceholder")}
                className="h-9 text-xs"
                {...register("notes")}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs cursor-pointer"
            >
              {t("formDialog.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || createMutation.isPending}
              className="h-9 text-xs font-bold cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              {t("formDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

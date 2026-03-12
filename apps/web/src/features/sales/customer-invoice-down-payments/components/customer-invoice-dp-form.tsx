"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  useCreateCustomerInvoiceDP,
  useCustomerInvoiceDP,
  useCustomerInvoiceDPAddData,
  useUpdateCustomerInvoiceDP,
} from "../hooks/use-customer-invoice-dp";
import {
  customerInvoiceDPSchema,
  type CustomerInvoiceDPFormData,
} from "../schemas/customer-invoice-dp.schema";

export function CustomerInvoiceDPFormDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
}) {
  const t = useTranslations("customerInvoiceDP");

  const isEdit = !!invoiceId;

  const addDataQuery = useCustomerInvoiceDPAddData({ enabled: open });
  const detailQuery = useCustomerInvoiceDP(invoiceId ?? "", { enabled: open && isEdit });

  const createMutation = useCreateCustomerInvoiceDP();
  const updateMutation = useUpdateCustomerInvoiceDP();

  const form = useForm<CustomerInvoiceDPFormData>({
    resolver: zodResolver(customerInvoiceDPSchema),
    defaultValues: {
      sales_order_id: "",
      invoice_date: "",
      due_date: "",
      amount: 0,
      notes: null,
    },
  });

  useEffect(() => {
    if (!open) return;

    if (!isEdit) {
      form.reset({
        sales_order_id: "",
        invoice_date: "",
        due_date: "",
        amount: 0,
        notes: null,
      });
      return;
    }

    const detail = detailQuery.data?.success ? detailQuery.data.data : null;
    if (!detail) return;

    form.reset({
      sales_order_id: detail.sales_order?.id ?? "",
      invoice_date: detail.invoice_date,
      due_date: detail.due_date,
      amount: detail.amount,
      notes: detail.notes ?? null,
    });
  }, [open, isEdit, detailQuery.data, form]);

  const isBusy =
    addDataQuery.isLoading ||
    detailQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending;

  async function onSubmit(values: CustomerInvoiceDPFormData) {
    try {
      if (isEdit && invoiceId) {
        const response = await updateMutation.mutateAsync({ id: invoiceId, data: values });
        if (!response.success) throw new Error(response.error ?? "update_failed");
        toast.success(t("toast.updated"));
      } else {
        const response = await createMutation.mutateAsync(values);
        if (!response.success) throw new Error(response.error ?? "create_failed");
        toast.success(t("toast.created"));
      }

      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  }

  const addData = addDataQuery.data?.success ? addDataQuery.data.data : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
        </DialogHeader>

        {addDataQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>{t("fields.salesOrder")}</Label>
            <Select
              value={form.watch("sales_order_id")}
              onValueChange={(value) => form.setValue("sales_order_id", value, { shouldValidate: true })}
              disabled={isBusy || isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.select")} />
              </SelectTrigger>
              <SelectContent>
                {(addData?.sales_orders ?? []).map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("fields.invoiceDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !form.watch("invoice_date") && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("invoice_date")
                      ? format(new Date(form.watch("invoice_date")), "dd MMM yyyy")
                      : t("placeholders.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("invoice_date") ? new Date(form.watch("invoice_date")) : undefined}
                    onSelect={(date) =>
                      form.setValue("invoice_date", date ? format(date, "yyyy-MM-dd") : "", { shouldValidate: true })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t("fields.dueDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    className={cn(
                      "w-full justify-start text-left font-normal cursor-pointer",
                      !form.watch("due_date") && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("due_date")
                      ? format(new Date(form.watch("due_date")), "dd MMM yyyy")
                      : t("placeholders.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("due_date") ? new Date(form.watch("due_date")) : undefined}
                    onSelect={(date) =>
                      form.setValue("due_date", date ? format(date, "yyyy-MM-dd") : "", { shouldValidate: true })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("fields.amount")}</Label>
              <NumericInput
                value={form.watch("amount")}
                onChange={(value) => form.setValue("amount", value ?? 0, { shouldValidate: true })}
                disabled={isBusy}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("fields.notes")}</Label>
              <Textarea
                value={form.watch("notes") ?? ""}
                onChange={(e) => form.setValue("notes", e.target.value, { shouldValidate: true })}
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy} className="cursor-pointer">
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isBusy} className="cursor-pointer">
              {t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarIcon, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn, formatDate, sortOptions } from "@/lib/utils";
import { getConvertToQuotationSchema, type ConvertToQuotationFormData } from "../schemas/estimation.schema";
import { useConvertToQuotation } from "../hooks/use-estimations";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import type { SalesEstimation } from "../types";
import { ButtonLoading } from "@/components/loading";

interface ConvertToQuotationDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly estimation: SalesEstimation | null;
}

export function ConvertToQuotationDialog({
  open,
  onClose,
  estimation,
}: ConvertToQuotationDialogProps) {
  const t = useTranslations("estimation");
  const router = useRouter();
  const convertToQuotation = useConvertToQuotation();
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch payment terms
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 });

  const paymentTerms = useMemo(() => {
    const data = paymentTermsData?.data ?? [];
    return sortOptions(data, (a) => a.code ? `${a.code} - ${a.name}` : a.name);
  }, [paymentTermsData?.data]);

  const schema = getConvertToQuotationSchema(t);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConvertToQuotationFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      quotation_date: new Date().toISOString().split("T")[0],
      valid_until: undefined,
      payment_terms_id: "",
      inherit_items: true,
    },
  });

  const handleFormSubmit = async (data: ConvertToQuotationFormData) => {
    if (!estimation?.id) return;

    try {
      const result = await convertToQuotation.mutateAsync({
        id: estimation.id,
        data,
      });

      toast.success(t("conversion.success"));
      
      // Optional: Navigate to the new quotation
      if (result.data?.quotation_id) {
        // You can navigate to the quotation detail page if you want
        // router.push(`/sales/quotations/${result.data.quotation_id}`);
      }
      
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to convert estimation:", error);
      toast.error(t("conversion.error"));
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setShowConfirmation(false);
      onClose();
    }
  };

  if (!estimation) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("conversion.title")}
          </DialogTitle>
          <DialogDescription>
            {t("conversion.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Estimation Info */}
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{estimation.code}</p>
                <p className="text-sm text-muted-foreground">
                  {estimation.customer_name}
                </p>
                <p className="text-sm">
                  {t("probability")}: <span className="font-semibold">{estimation.probability}%</span>
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Quotation Date */}
          <Field orientation="vertical">
            <FieldLabel>{t("conversion.quotationDate")}</FieldLabel>
            <Controller
              name="quotation_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? formatDate(new Date(field.value)) : t("common.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date: Date | undefined) => {
                        field.onChange(date ? date.toISOString().split('T')[0] : "");
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.quotation_date && (
              <FieldError>{errors.quotation_date.message}</FieldError>
            )}
          </Field>

          {/* Valid Until */}
          <Field orientation="vertical">
            <FieldLabel>{t("conversion.validUntil")}</FieldLabel>
            <Controller
              name="valid_until"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? formatDate(new Date(field.value)) : t("common.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date: Date | undefined) => {
                        field.onChange(date ? date.toISOString().split('T')[0] : undefined);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.valid_until && (
              <FieldError>{errors.valid_until.message}</FieldError>
            )}
          </Field>

          {/* Payment Terms */}
          <Field orientation="vertical">
            <FieldLabel>{t("conversion.paymentTerms")} *</FieldLabel>
            <Controller
              name="payment_terms_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("conversion.paymentTerms")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTerms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.code ? `${term.code} - ${term.name}` : term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_terms_id && (
              <FieldError>{errors.payment_terms_id.message}</FieldError>
            )}
          </Field>

          {/* Inherit Items */}
          <Field orientation="horizontal">
            <Controller
              name="inherit_items"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inherit_items"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor="inherit_items"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t("conversion.inheritItems")}
                  </label>
                </div>
              )}
            />
          </Field>

          {/* Confirmation Alert */}
          {showConfirmation && (
            <Alert variant="default" className="border-primary">
              <AlertDescription>
                {t("conversion.confirmMessage")}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={convertToQuotation.isPending}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={convertToQuotation.isPending}
              className="cursor-pointer"
            >
              <ButtonLoading
                loading={convertToQuotation.isPending}
                loadingText={t("conversion.converting")}
              >
                {t("actions.convert")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

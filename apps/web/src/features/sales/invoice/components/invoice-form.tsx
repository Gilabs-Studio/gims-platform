"use client";

import { Controller } from "react-hook-form";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon, Receipt, CheckCircle2 } from "lucide-react";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatCurrency, parseLocalDate, toLocalDateString } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import type { CustomerInvoice } from "../types";
import { useInvoiceForm } from "../hooks/use-invoice-form";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { PaymentTermsDialog } from "@/features/master-data/payment-and-couriers/payment-terms/components/payment-terms-dialog";

interface InvoiceFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoice?: CustomerInvoice | null;
  readonly defaultSalesOrderId?: string;
  readonly defaultDeliveryOrderId?: string;
}

export function InvoiceForm({ open, onClose, invoice, defaultSalesOrderId, defaultDeliveryOrderId }: InvoiceFormProps) {
  const {
    form,
    t,
    isEdit,
    activeTab,
    setActiveTab,
    isValidating,
    isLoading,
    isFormLoading,
    fields,
    remove,
    products,
    paymentTerms,
    orders,
    calculations,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleProductChange,
    handleDialogChange,
    onInvalid,
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    enableReferenceOptionsFetch,
    enableProductOptionsFetch,
    handlePaymentTermCreated,
    detectedDownPayments,
    dpSummary,
  } = useInvoiceForm({ invoice, open, onClose, defaultSalesOrderId, defaultDeliveryOrderId });

  const { register, handleSubmit, control, formState: { errors } } = form;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("edit") : t("add")}
          </DialogTitle>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "basic" | "items")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">
              {t("common.basicInfo") || "Basic Information"}
            </TabsTrigger>
            <TabsTrigger value="items">
              {t("items")} & {t("summary")}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-6 mt-4">
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("common.invoice")}</h3>
                </div>
            <div className="grid gap-4 grid-cols-2">
              {/* Sales Order — select first so downstream fields can auto-fill */}
              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("salesOrder")}</FieldLabel>
                <Controller
                  name="sales_order_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("salesOrder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.code}
                            {(order.customer?.name ?? order.customer_name) ? ` | ${order.customer?.name ?? order.customer_name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("invoiceDate")} *</FieldLabel>
                <Controller
                  name="invoice_date"
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
                          {field.value ? formatDate(field.value) : t("common.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseLocalDate(field.value) : undefined}
                          onSelect={(date: Date | undefined) => {
                            field.onChange(date ? toLocalDateString(date) : "");
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.invoice_date && (
                  <FieldError>{errors.invoice_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("dueDate")}</FieldLabel>
                <Controller
                  name="due_date"
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
                          {field.value ? formatDate(field.value) : t("common.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseLocalDate(field.value) : undefined}
                          onSelect={(date: Date | undefined) => {
                            field.onChange(date ? toLocalDateString(date) : undefined);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.due_date && (
                  <FieldError>{errors.due_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("invoiceType")}</FieldLabel>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">{t("type.regular")}</SelectItem>
                        <SelectItem value="proforma">{t("type.proforma")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("paymentTerms")}</FieldLabel>
                <Controller
                  name="payment_terms_id"
                  control={control}
                  render={({ field }) => (
                    <CreatableCombobox
                      options={paymentTerms.map(term => ({ value: term.id, label: term.name }))}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                      }}
                      placeholder={t("paymentTerms")}
                      createPermission="payment_term.create"
                      onCreateClick={() => openQuickCreate("paymentTerm")}
                    />
                  )}
                />
                {errors.payment_terms_id && (
                  <FieldError>{errors.payment_terms_id.message}</FieldError>
                )}
              </Field>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("common.financial")}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("taxRate")}</FieldLabel>
                <Controller
                  name="tax_rate"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                      max={100}
                    />
                  )}
                />
                {errors.tax_rate && (
                  <FieldError>{errors.tax_rate.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("deliveryCost")}</FieldLabel>
                <Controller
                  name="delivery_cost"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
                {errors.delivery_cost && (
                  <FieldError>{errors.delivery_cost.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("otherCost")}</FieldLabel>
                <Controller
                  name="other_cost"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
                {errors.other_cost && (
                  <FieldError>{errors.other_cost.message}</FieldError>
                )}
              </Field>
            </div>

            <Field orientation="vertical" className="col-span-2">
              <FieldLabel>{t("notes")}</FieldLabel>
              <Textarea {...register("notes")} rows={3} />
              {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
            </Field>
          </div>

          {/* Detected Down Payments Section */}
          {!isEdit && detectedDownPayments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <Receipt className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Detected Down Payments</h3>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                {detectedDownPayments.map((dp) => (
                  <div key={dp.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-card border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm font-mono font-medium">{dp.code}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(dp.amount ?? 0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Invoice Summary */}
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <h4 className="text-sm font-semibold">Invoice Summary</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Total</span>
                    <span className="font-medium">{formatCurrency(dpSummary.orderTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>Down Payment Applied</span>
                    <span className="font-medium">-{formatCurrency(dpSummary.totalDP)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5">
                    <span>Amount Due</span>
                    <span className="text-primary">{formatCurrency(dpSummary.amountDue)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation Buttons for Basic Tab */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              className="cursor-pointer"
              disabled={isValidating}
            >
              <ButtonLoading loading={isValidating} loadingText={t("common.validating") || "Validating..."}>
                {t("common.next") || "Next"}
              </ButtonLoading>
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
                <h3 className="text-sm font-medium">{t("items")} ({fields.length})</h3>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {fields.map((field, index) => {
                  const item = watchedItems?.[index];
                  const itemSubtotal = item
                    ? (item.price ?? 0) * (item.quantity ?? 0) - (item.discount ?? 0)
                    : 0;

                  return (
                    <div
                      key={field.id}
                      className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">#{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <Field orientation="vertical" className="col-span-2">
                          <FieldLabel>{t("item.product")} *</FieldLabel>
                          <Controller
                            name={`items.${index}.product_id`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProductChange(index, value);
                                }}
                                onOpenChange={(isOpen) => {
                                  if (isOpen) {
                                    enableProductOptionsFetch();
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("item.selectProduct")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.code} - {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.items?.[index]?.product_id && (
                            <FieldError>
                              {errors.items[index]?.product_id?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.quantity")} *</FieldLabel>
                          <Controller
                            name={`items.${index}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0.001}
                              />
                            )}
                          />
                          {errors.items?.[index]?.quantity && (
                            <FieldError>
                              {errors.items[index]?.quantity?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.price")} *</FieldLabel>
                          <Controller
                            name={`items.${index}.price`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0.01}
                              />
                            )}
                          />
                          {errors.items?.[index]?.price && (
                            <FieldError>
                              {errors.items[index]?.price?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.discount")}</FieldLabel>
                          <Controller
                            name={`items.${index}.discount`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0}
                              />
                            )}
                          />
                          {errors.items?.[index]?.discount && (
                            <FieldError>
                              {errors.items[index]?.discount?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.hpp")}</FieldLabel>
                          <Controller
                            name={`items.${index}.hpp_amount`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0}
                              />
                            )}
                          />
                        </Field>

                        <div className="col-span-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">{t("item.subtotal")}:</span>
                            <span className="text-base font-bold text-primary">{formatCurrency(itemSubtotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {errors.items && typeof errors.items === "object" && "message" in errors.items && (
                  <FieldError>{errors.items.message}</FieldError>
                )}

                {/* Add Item Button - Positioned below last item */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="w-full cursor-pointer border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addItem")}
                </Button>
              </div>
            </div>

            {/* Totals Summary - Right Column */}
            <div className="col-span-1">
              <div className="sticky space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("summary")}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("subtotal")}:</span>
                    <span className="font-medium ml-auto">{formatCurrency(calculations.subtotal)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">
                      {t("taxAmount")} ({taxRate}%):
                    </span>
                    <span className="font-medium ml-auto">{formatCurrency(calculations.taxAmount)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("deliveryCost")}:</span>
                    <span className="font-medium ml-auto">{formatCurrency(deliveryCost)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("otherCost")}:</span>
                    <span className="font-medium ml-auto">{formatCurrency(otherCost)}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-end gap-1 border-t pt-3 mt-2">
                    <span className="text-lg font-bold">{t("totalAmount")}:</span>
                    <span className="text-lg font-bold text-primary ml-auto">{formatCurrency(calculations.total)}</span>
                  </div>

                  {/* HPP & Gross Profit breakdown at the bottom of summary */}
                  <div className="border-t pt-3 mt-4 space-y-2 bg-muted/30 p-3 rounded-lg">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">{t("hppAmount")}</span>
                      <span className="font-medium">{formatCurrency(calculations.totalHpp)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">{t("grossProfit")}</span>
                      <span className={cn("font-bold", calculations.grossProfit >= 0 ? "text-success" : "text-destructive")}>
                        {formatCurrency(calculations.grossProfit)}
                      </span>
                    </div>
                  </div>

                  {/* DP Applied Summary */}
                  {!isEdit && detectedDownPayments.length > 0 && (
                    <div className="border-t pt-3 mt-2 space-y-2 bg-primary/5 p-3 rounded-lg">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground uppercase tracking-wider">Down Payment</span>
                        <span className="font-medium text-success">-{formatCurrency(dpSummary.totalDP)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Amount Due</span>
                        <span className="text-primary">{formatCurrency(Math.max(0, calculations.total - dpSummary.totalDP))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation Buttons for Items Tab */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("basic")}
              className="cursor-pointer"
            >
              {t("common.back") || "Back"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                <ButtonLoading 
                  loading={isLoading} 
                  loadingText={t("common.saving")}
                >
                  {isEdit ? t("common.update") : t("common.create")}
                </ButtonLoading>
              </Button>
            </div>
          </div>
        </TabsContent>
          </form>
        </Tabs>
        )}
      </DialogContent>

      <PaymentTermsDialog
        open={quickCreate.type === "paymentTerm"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
        onCreated={handlePaymentTermCreated}
      />
    </Dialog>
  );
}

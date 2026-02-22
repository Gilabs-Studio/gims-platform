"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon, User } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";
import type { SalesOrder } from "../types";
import { formatCurrency } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import { StockWarningInline } from "@/features/sales/components/stock-warning";
import { AsyncSelect } from "@/components/ui/async-select";
import type { Employee } from "@/features/master-data/employee/types";
import type { Product } from "@/features/master-data/product/types";

import { useOrderForm } from "../hooks/use-order-form";

interface OrderFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly order?: SalesOrder | null;
}

export function OrderForm({ open, onClose, order }: OrderFormProps) {
  const {
    form: { register, handleSubmit, control, formState: { errors } },
    t,
    isEdit,
    activeTab,
    setActiveTab,
    isValidating,
    isLoading,
    isFormLoading,
    fields,
    remove,
    paymentTerms,
    businessUnits,
    businessTypes,
    areas,
    quotations,
    customers,
    selectedRep,
    setSelectedRep,
    fetchEmployees,
    fetchProducts,
    calculations,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleProductChange,
    handleCustomerChange,
    handleDialogChange,
    onInvalid,
    selectedProducts,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    discountAmount,
  } = useOrderForm({ order, open, onClose });

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
              {t("tabs.general")}
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
                  <h3 className="text-sm font-medium">{t("common.order")}</h3>
                </div>
            <div className="grid gap-4 grid-cols-2">
              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("salesQuotation")}</FieldLabel>
                <Controller
                  name="sales_quotation_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={isEdit} 
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("salesQuotation")} />
                      </SelectTrigger>
                      <SelectContent>
                        {quotations.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sales_quotation_id && (
                  <FieldError>{errors.sales_quotation_id.message}</FieldError>
                )}
              </Field>

              {/* Quotation Summary Card */}

              
              <Field orientation="vertical">
                <FieldLabel>{t("orderDate")} *</FieldLabel>
                <Controller
                  name="order_date"
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
                {errors.order_date && (
                  <FieldError>{errors.order_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("paymentTerms")} *</FieldLabel>
                <Controller
                  name="payment_terms_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("paymentTerms")} />
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

                <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("salesRep")} *</FieldLabel>
                <Controller
                  name="sales_rep_id"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect<Employee>
                      label={t("salesRep")}
                      fetcher={fetchEmployees}
                      renderOption={(emp) => (
                        <div className="flex flex-col">
                          <span className="font-medium">{emp.employee_code}</span>
                          <span className="text-xs text-muted-foreground">{emp.name}</span>
                        </div>
                      )}
                      getLabel={(emp) => `${emp.employee_code} - ${emp.name}`}
                      getValue={(emp) => emp.id}
                      value={field.value || ""}
                      onChange={(val, item) => {
                        field.onChange(val);
                        if (item) setSelectedRep(item);
                      }}
                      defaultOptions={selectedRep ? [selectedRep] : []}
                      preload
                      disabled={false} // Always strictly typed validation
                    />
                  )}
                />
                {errors.sales_rep_id && (
                  <FieldError>{errors.sales_rep_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("businessUnit")} *</FieldLabel>
                <Controller
                  name="business_unit_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("businessUnit")} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.business_unit_id && (
                  <FieldError>{errors.business_unit_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("businessType")}</FieldLabel>
                <Controller
                  name="business_type_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.business_type_id && (
                  <FieldError>{errors.business_type_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("deliveryArea")}</FieldLabel>
                <Controller
                  name="delivery_area_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("deliveryArea")} />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.filter(a => a.is_active).map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.delivery_area_id && (
                  <FieldError>{errors.delivery_area_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("common.customer") || "Customer"}</FieldLabel>
                <Controller
                  name="customer_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={handleCustomerChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("common.selectCustomer") || "Select customer"} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id} className="cursor-pointer">
                            {customer.code} - {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("customerName")}</FieldLabel>
                <Input {...register("customer_name")} placeholder={t("customerName")} />
                {errors.customer_name && (
                  <FieldError>{errors.customer_name.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("customerContact")}</FieldLabel>
                <Input {...register("customer_contact")} placeholder={t("customerContact")} />
                {errors.customer_contact && (
                  <FieldError>{errors.customer_contact.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("customerPhone")}</FieldLabel>
                <Input {...register("customer_phone")} placeholder={t("customerPhone")} />
                {errors.customer_phone && (
                  <FieldError>{errors.customer_phone.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("customerEmail")}</FieldLabel>
                <Input {...register("customer_email")} placeholder={t("customerEmail")} type="email" />
                {errors.customer_email && (
                  <FieldError>{errors.customer_email.message}</FieldError>
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
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("taxRate")}</FieldLabel>
                <Controller
                  control={control}
                  name="tax_rate"
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
                <FieldLabel>{t("discountAmount")}</FieldLabel>
                <Controller
                  control={control}
                  name="discount_amount"
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
                {errors.discount_amount && (
                  <FieldError>{errors.discount_amount.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("deliveryCost")}</FieldLabel>
                <Controller
                  control={control}
                  name="delivery_cost"
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
                  control={control}
                  name="other_cost"
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
                      const itemSubtotal = item?.product_id && item?.quantity && item?.price
                        ? (item.price * item.quantity) - (item.discount ?? 0)
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
                                  <AsyncSelect<Product>
                                    label={t("item.product")}
                                    fetcher={fetchProducts}
                                    renderOption={(prod) => (
                                      <div className="flex flex-col">
                                        <span className="font-medium">{prod.code}</span>
                                        <span className="text-xs text-muted-foreground">{prod.name}</span>
                                      </div>
                                    )}
                                    getLabel={(prod) => `${prod.code} - ${prod.name}`}
                                    getValue={(prod) => prod.id}
                                    value={field.value}
                                    onChange={(val, item) => {
                                      field.onChange(val);
                                      handleProductChange(index, val, item);
                                    }}
                                    defaultOptions={field.value && selectedProducts[field.value] ? [selectedProducts[field.value]] : []}
                                    preload
                                    width="w-full"
                                  />
                                )}
                              />
                              {errors.items?.[index]?.product_id && (
                                <FieldError>
                                  {errors.items[index]?.product_id?.message}
                                </FieldError>
                              )}
                            </Field>

                            {/* Stock availability warning */}
                            {item?.product_id && (
                              <div className="col-span-2">
                                <StockWarningInline
                                  productId={item.product_id}
                                  requiredQuantity={item.quantity ?? 0}
                                />
                              </div>
                            )}

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
                        <span className="text-muted-foreground text-sm">{t("discountAmount")}:</span>
                        <span className="font-medium text-destructive ml-auto">-{formatCurrency(discountAmount)}</span>
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
                  {t("common.previous")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading} className="cursor-pointer">
                  <ButtonLoading loading={isLoading} loadingText={t("common.saving")}>
                    {t("common.save")}
                  </ButtonLoading>
                </Button>
              </div>
            </TabsContent>
          </form>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

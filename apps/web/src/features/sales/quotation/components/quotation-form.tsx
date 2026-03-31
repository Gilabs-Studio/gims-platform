"use client";

import { Controller } from "react-hook-form";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon } from "lucide-react";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import { StockWarningInline } from "@/features/sales/components/stock-warning";
import { PaymentTermsDialog } from "@/features/master-data/payment-and-couriers/payment-terms/components/payment-terms-dialog";
import { BusinessUnitForm } from "@/features/master-data/organization/components/business-unit/business-unit-form";
import { BusinessTypeForm } from "@/features/master-data/organization/components/business-type/business-type-form";
import { CustomerSidePanel } from "@/features/master-data/customer/components/customer/customer-side-panel";
import { ProductDialog } from "@/features/master-data/product/components/product/product-dialog";
import { EmployeeForm } from "@/features/master-data/employee/components/employee-form";
import { ContactFormDialog } from "@/features/crm/contact/components/contact-form-dialog";
import type { SalesQuotation } from "../types";
import { useQuotationForm } from "../hooks/use-quotation-form";

interface QuotationFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quotation?: SalesQuotation | null;
}

export function QuotationForm({ open, onClose, quotation }: QuotationFormProps) {
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
    contacts,
    selectedContactId,
    calculations,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    discountAmount,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleProductChange,
    handleCustomerChange,
    handleContactChange,
    handleDialogChange,
    onInvalid,
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    enableReferenceOptionsFetch,
    enableProductOptionsFetch,
    handlePaymentTermCreated,
    handleBusinessUnitCreated,
    handleBusinessTypeCreated,
    handleCustomerCreated,
    handleContactCreated,
    handleProductCreated,
    handleEmployeeCreated,
    customerCombobox,
    paymentTermsCombobox,
    employeeCombobox,
    businessUnitCombobox,
    businessTypeCombobox,
    productCombobox,
  } = useQuotationForm({ quotation, open, onClose });

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
                  <h3 className="text-sm font-medium">{t("common.quotation")}</h3>
                </div>
            <div className="grid gap-4 grid-cols-2">
              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("common.customer") || "Customer"}</FieldLabel>
                <Controller
                  name="customer_id"
                  control={control}
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value ?? undefined}
                      onValueChange={handleCustomerChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                        customerCombobox.onOpenChange(isOpen);
                      }}
                      onSearchChange={customerCombobox.onSearchChange}
                      onLoadMore={customerCombobox.onLoadMore}
                      hasMore={customerCombobox.hasMore}
                      isLoadingMore={customerCombobox.isLoadingMore}
                      searchDebounceMs={300}
                      options={customerCombobox.options}
                      placeholder={t("common.selectCustomer") || "Select customer"}
                      createPermission="customer.create"
                      createLabel={`${t("common.create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("customer", q)}
                      isLoading={customerCombobox.isLoading || customerCombobox.isFetching}
                    />
                  )}
                />
                {errors.customer_id && <FieldError>{errors.customer_id.message}</FieldError>}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("quotationDate")} *</FieldLabel>
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

              <Field orientation="vertical">
                <FieldLabel>{t("validUntil")}</FieldLabel>
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

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("paymentTerms")} *</FieldLabel>
                <Controller
                  name="payment_terms_id"
                  control={control}
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                        paymentTermsCombobox.onOpenChange(isOpen);
                      }}
                      onSearchChange={paymentTermsCombobox.onSearchChange}
                      onLoadMore={paymentTermsCombobox.onLoadMore}
                      hasMore={paymentTermsCombobox.hasMore}
                      isLoadingMore={paymentTermsCombobox.isLoadingMore}
                      searchDebounceMs={300}
                      options={paymentTermsCombobox.options}
                      placeholder={t("paymentTerms")}
                      createPermission="payment_term.create"
                      createLabel={`${t("common.create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("paymentTerm", q)}
                      isLoading={paymentTermsCombobox.isLoading || paymentTermsCombobox.isFetching}
                    />
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
                    <CreatableCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                        employeeCombobox.onOpenChange(isOpen);
                      }}
                      onSearchChange={employeeCombobox.onSearchChange}
                      onLoadMore={employeeCombobox.onLoadMore}
                      hasMore={employeeCombobox.hasMore}
                      isLoadingMore={employeeCombobox.isLoadingMore}
                      searchDebounceMs={300}
                      options={employeeCombobox.options}
                      placeholder={t("salesRep")}
                      createPermission="employee.create"
                      createLabel={`${t("common.create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("employee", q)}
                      isLoading={employeeCombobox.isLoading || employeeCombobox.isFetching}
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
                    <CreatableCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                        businessUnitCombobox.onOpenChange(isOpen);
                      }}
                      onSearchChange={businessUnitCombobox.onSearchChange}
                      onLoadMore={businessUnitCombobox.onLoadMore}
                      hasMore={businessUnitCombobox.hasMore}
                      isLoadingMore={businessUnitCombobox.isLoadingMore}
                      searchDebounceMs={300}
                      options={businessUnitCombobox.options}
                      placeholder={t("businessUnit")}
                      createPermission="business_unit.create"
                      createLabel={`${t("common.create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("businessUnit", q)}
                      isLoading={businessUnitCombobox.isLoading || businessUnitCombobox.isFetching}
                    />
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
                    <CreatableCombobox
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen) {
                          enableReferenceOptionsFetch();
                        }
                        businessTypeCombobox.onOpenChange(isOpen);
                      }}
                      onSearchChange={businessTypeCombobox.onSearchChange}
                      onLoadMore={businessTypeCombobox.onLoadMore}
                      hasMore={businessTypeCombobox.hasMore}
                      isLoadingMore={businessTypeCombobox.isLoadingMore}
                      searchDebounceMs={300}
                      options={businessTypeCombobox.options}
                      placeholder={t("common.select")}
                      createPermission="business_type.create"
                      createLabel={`${t("common.create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("businessType", q)}
                      isLoading={businessTypeCombobox.isLoading || businessTypeCombobox.isFetching}
                    />
                  )}
                />
                {errors.business_type_id && (
                  <FieldError>{errors.business_type_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("customerContact")}</FieldLabel>
                <CreatableCombobox
                  options={contacts.map((contact) => ({
                    value: contact.id,
                    label: [contact.name, contact.phone || undefined, contact.email || undefined]
                      .filter(Boolean)
                      .join(" - "),
                  }))}
                  value={selectedContactId || ""}
                  onValueChange={handleContactChange}
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      enableReferenceOptionsFetch();
                    }
                  }}
                  placeholder={t("customerContact")}
                  emptyText={t("notFound")}
                  createPermission="customer.create"
                  createLabel={`${t("common.create") || "Create"} "{query}"`}
                  onCreateClick={(q) => openQuickCreate("contact", q)}
                  disabled={!form.watch("customer_id")}
                />
                {errors.customer_contact && (
                  <FieldError>{errors.customer_contact.message}</FieldError>
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
                <FieldLabel>{t("discountAmount")}</FieldLabel>
                <Controller
                  name="discount_amount"
                  control={control}
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
                              <CreatableCombobox
                                value={field.value?.toString() || undefined}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProductChange(index, value);
                                }}
                                onOpenChange={(isOpen) => {
                                  if (isOpen) {
                                    enableProductOptionsFetch();
                                  }
                                  productCombobox.onOpenChange(isOpen);
                                }}
                                onSearchChange={productCombobox.onSearchChange}
                                onLoadMore={productCombobox.onLoadMore}
                                hasMore={productCombobox.hasMore}
                                isLoadingMore={productCombobox.isLoadingMore}
                                searchDebounceMs={300}
                                options={products.map((product) => ({
                                  value: product.id,
                                  label: `${product.code} - ${product.name}`,
                                }))}
                                placeholder={t("item.selectProduct")}
                                createPermission="product.create"
                                createLabel={`${t("common.create")} "{query}"`}
                                onCreateClick={(q) => openQuickCreate("product", q, index)}
                                isLoading={productCombobox.isLoading || productCombobox.isFetching}
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

      {/* Full module forms — rendered outside DialogContent to avoid Dialog nesting */}
      {quickCreate.type === "paymentTerm" && (
        <PaymentTermsDialog
          open
          onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
          initialData={{ name: quickCreate.query }}
          onCreated={handlePaymentTermCreated}
        />
      )}
      {quickCreate.type === "businessUnit" && (
        <BusinessUnitForm
          open
          onClose={closeQuickCreate}
          initialData={{ name: quickCreate.query }}
          onCreated={handleBusinessUnitCreated}
        />
      )}
      {quickCreate.type === "businessType" && (
        <BusinessTypeForm
          open
          onClose={closeQuickCreate}
          initialData={{ name: quickCreate.query }}
          onCreated={handleBusinessTypeCreated}
        />
      )}
      {quickCreate.type === "customer" && (
        <CustomerSidePanel
          isOpen
          onClose={closeQuickCreate}
          mode="create"
          initialData={{ name: quickCreate.query }}
          onCreated={handleCustomerCreated}
        />
      )}
      {quickCreate.type === "product" && (
        <ProductDialog
          open
          onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
          editingItem={null}
          onCreated={handleProductCreated}
        />
      )}
      {quickCreate.type === "employee" && (
        <EmployeeForm
          open
          onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
          onCreated={handleEmployeeCreated}
        />
      )}
      {quickCreate.type === "contact" && (() => {
        const customerId = form.watch("customer_id");
        if (!customerId) return null;
        return (
          <ContactFormDialog
            open
            onClose={closeQuickCreate}
            customerId={customerId}
            initialName={quickCreate.query}
            onCreated={handleContactCreated}
          />
        );
      })()}
    </Dialog>
  );
}

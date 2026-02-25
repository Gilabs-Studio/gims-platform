"use client";

import { Controller } from "react-hook-form";
import { Loader2, Plus, Trash2, CalendarIcon, MapPin, User, Phone } from "lucide-react";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn, formatDate } from "@/lib/utils";
import { ButtonLoading } from "@/components/loading";
import type { VisitReport } from "../types";
import { useVisitReportForm } from "../hooks/use-visit-report-form";

interface VisitReportFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly visit?: VisitReport | null;
}

export function VisitReportFormDialog({ open, onClose, visit }: VisitReportFormDialogProps) {
  const {
    t,
    tCommon,
    isEdit,
    activeTab,
    setActiveTab,
    isLoading,
    isFormLoading,
    fields,
    append,
    remove,
    customers,
    filteredContacts,
    employees,
    deals,
    leads,
    products,
    questions,
    watchedDetails,
    calculateInterest,
    handleNext,
    handleFormSubmit,
    register,
    control,
    errors,
    setValue,
  } = useVisitReportForm({ visit, open, onClose });

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "basic" | "details")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t("sections.basicInfo")}</TabsTrigger>
              <TabsTrigger value="details">{t("sections.productInterest")}</TabsTrigger>
            </TabsList>

            <form onSubmit={handleFormSubmit} className="space-y-6 mt-4">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  {/* Visit Date */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.visitDate")} *</FieldLabel>
                    <Controller
                      name="visit_date"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal cursor-pointer", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? formatDate(new Date(field.value)) : t("form.visitDatePlaceholder")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date: Date | undefined) => field.onChange(date ? date.toISOString().split("T")[0] : "")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.visit_date && <FieldError>{errors.visit_date.message}</FieldError>}
                  </Field>

                  {/* Scheduled Time */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.scheduledTime")}</FieldLabel>
                    <Input {...register("scheduled_time")} type="time" />
                  </Field>

                  {/* Employee */}
                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("form.employee")} *</FieldLabel>
                    <Controller
                      name="employee_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("form.employeePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id} className="cursor-pointer">
                                {emp.employee_code} - {emp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
                  </Field>

                  {/* Customer */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.customer")}</FieldLabel>
                    <Controller
                      name="customer_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("form.customerPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  {/* Contact */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contact")}</FieldLabel>
                    <Controller
                      name="contact_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("form.contactPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredContacts.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  {/* Deal */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.deal")}</FieldLabel>
                    <Controller
                      name="deal_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("form.dealPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {deals.map((d) => (
                              <SelectItem key={d.id} value={d.id} className="cursor-pointer">
                                {d.code} - {d.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  {/* Lead */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.lead")}</FieldLabel>
                    <Controller
                      name="lead_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder={t("form.leadPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {leads.map((l) => (
                              <SelectItem key={l.id} value={l.id} className="cursor-pointer">
                                {l.code} - {l.first_name} {l.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  {/* Contact Person */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contactPerson")}</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...register("contact_person")} className="pl-9" placeholder={t("form.contactPersonPlaceholder")} />
                    </div>
                  </Field>

                  {/* Contact Phone */}
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contactPhone")}</FieldLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...register("contact_phone")} className="pl-9" placeholder={t("form.contactPhonePlaceholder")} />
                    </div>
                  </Field>

                  {/* Address */}
                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("form.address")}</FieldLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...register("address")} className="pl-9" placeholder={t("form.addressPlaceholder")} />
                    </div>
                  </Field>

                  {/* Purpose */}
                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("form.purpose")}</FieldLabel>
                    <Textarea {...register("purpose")} placeholder={t("form.purposePlaceholder")} />
                  </Field>

                  {/* Notes */}
                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("form.notes")}</FieldLabel>
                    <Textarea {...register("notes")} placeholder={t("form.notesPlaceholder")} />
                  </Field>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleNext} className="cursor-pointer">
                    {t("actions.next")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t("sections.productInterest")}</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => append({ product_id: "", interest_level: 0, notes: "", quantity: 0, price: 0, answers: [] })}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("form.addProduct")}
                  </Button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4 relative bg-card">
                      <div className="absolute top-2 right-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="cursor-pointer text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Product Select */}
                        <Field orientation="vertical" className="col-span-2">
                          <FieldLabel>{t("form.product")} *</FieldLabel>
                          <Controller
                            name={`details.${index}.product_id`}
                            control={control}
                            render={({ field: f }) => (
                              <Select value={f.value} onValueChange={f.onChange}>
                                <SelectTrigger className="cursor-pointer">
                                  <SelectValue placeholder={t("form.productPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                                      {p.code} - {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.details?.[index]?.product_id && (
                            <FieldError>{errors.details[index]?.product_id?.message}</FieldError>
                          )}
                        </Field>

                        {/* Interest Survey */}
                        {questions.length > 0 && (
                          <div className="col-span-2 space-y-4 border rounded-md p-4 bg-muted/50">
                            <h4 className="text-sm font-medium">{t("form.interestSurvey")}</h4>
                            <div className="grid gap-4">
                              {[...questions].sort((a, b) => a.sequence - b.sequence).map((q) => {
                                const currentAnswers = watchedDetails?.[index]?.answers ?? [];
                                const currentAnswer = currentAnswers.find((a) => a.question_id === q.id);

                                return (
                                  <div key={q.id} className="space-y-2">
                                    <FieldLabel className="text-xs">{q.question_text}</FieldLabel>
                                    <div className="flex gap-4">
                                      {q.options.map((opt) => (
                                        <div key={opt.id} className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            id={`q-${index}-${q.id}-${opt.id}`}
                                            checked={currentAnswer?.option_id === opt.id}
                                            onChange={() => {
                                              const otherAnswers = currentAnswers.filter((a) => a.question_id !== q.id);
                                              const newAnswers = [...otherAnswers, { question_id: q.id, option_id: opt.id }];
                                              setValue(`details.${index}.answers`, newAnswers, { shouldDirty: true });
                                              const newScore = calculateInterest(newAnswers);
                                              setValue(`details.${index}.interest_level`, newScore, { shouldDirty: true });
                                            }}
                                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary cursor-pointer"
                                          />
                                          <label htmlFor={`q-${index}-${q.id}-${opt.id}`} className="text-sm cursor-pointer">
                                            {opt.option_text}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {questions.length === 0 && (
                          <div className="col-span-2 text-xs text-muted-foreground p-2">
                            {t("form.noInterestSurvey")}
                          </div>
                        )}

                        {/* Interest Level */}
                        <Field orientation="vertical">
                          <FieldLabel>{t("form.interestLevel")} (0-5)</FieldLabel>
                          <Controller
                            name={`details.${index}.interest_level`}
                            control={control}
                            render={({ field: f }) => (
                              <Select
                                value={f.value?.toString()}
                                onValueChange={(v) => f.onChange(parseInt(v))}
                                disabled={questions.length > 0 && (watchedDetails?.[index]?.answers?.length ?? 0) > 0}
                              >
                                <SelectTrigger className="cursor-pointer">
                                  <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                                    <SelectItem key={lvl} value={lvl.toString()} className="cursor-pointer">
                                      {lvl}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {questions.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1">{t("form.calculatedFromSurvey")}</p>
                          )}
                        </Field>

                        {/* Notes */}
                        <Field orientation="vertical">
                          <FieldLabel>{t("form.notes")}</FieldLabel>
                          <Input {...register(`details.${index}.notes`)} placeholder={t("form.notesPlaceholder")} />
                        </Field>

                        {/* Quantity */}
                        <Field orientation="vertical">
                          <FieldLabel>{t("form.quantity")}</FieldLabel>
                          <Controller
                            name={`details.${index}.quantity`}
                            control={control}
                            render={({ field: f }) => (
                              <NumericInput value={f.value} onChange={f.onChange} min={0} />
                            )}
                          />
                        </Field>

                        {/* Price */}
                        <Field orientation="vertical">
                          <FieldLabel>{t("form.price")}</FieldLabel>
                          <Controller
                            name={`details.${index}.price`}
                            control={control}
                            render={({ field: f }) => (
                              <NumericInput value={f.value} onChange={f.onChange} min={0} />
                            )}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      {t("form.noProducts")}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
                    {t("actions.back")}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="cursor-pointer">
                    <ButtonLoading loading={isLoading}>
                      {isEdit ? tCommon("save") : tCommon("create")}
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

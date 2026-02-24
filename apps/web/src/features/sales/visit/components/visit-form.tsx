"use client";

import { useTranslations } from "next-intl";
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
import type { SalesVisit } from "../types";
import { useVisitForm } from "../hooks/use-visit-form";

interface VisitFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly visit?: SalesVisit | null;
}

export function VisitForm({ open, onClose, visit }: VisitFormProps) {
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
    append,
    remove,
    products,
    employees,
    companies,
    questions,
    watchedDetails,
    calculateInterest,
    handleNext,
    handleFormSubmit,
    handleCompanyChange,
    onInvalid,
  } = useVisitForm({ visit, open, onClose });

  const { register, handleSubmit, control, formState: { errors }, setValue } = form;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Visit" : "Create New Visit"}</DialogTitle>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="details">Products & Details</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <Field orientation="vertical">
                    <FieldLabel>Visit Date *</FieldLabel>
                    <Controller
                      name="visit_date"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? formatDate(new Date(field.value)) : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date: Date | undefined) => field.onChange(date ? date.toISOString().split('T')[0] : "")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.visit_date && <FieldError>{errors.visit_date.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Scheduled Time</FieldLabel>
                    <Input {...register("scheduled_time")} type="time" />
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>Sales Representative *</FieldLabel>
                    <Controller
                      name="employee_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sales rep" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.employee_code} - {emp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.employee_id && <FieldError>{errors.employee_id.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>Company</FieldLabel>
                    <Controller
                      name="company_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || ""} onValueChange={handleCompanyChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((comp) => (
                              <SelectItem key={comp.id} value={comp.id}>
                                {comp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Contact Person</FieldLabel>
                    <div className="relative">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input {...register("contact_person")} className="pl-9" placeholder="Name" />
                    </div>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Contact Phone</FieldLabel>
                     <div className="relative">
                       <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input {...register("contact_phone")} className="pl-9" placeholder="Phone" />
                    </div>
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>Address</FieldLabel>
                     <div className="relative">
                       <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input {...register("address")} className="pl-9" placeholder="Full Address" />
                    </div>
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>Purpose</FieldLabel>
                    <Textarea {...register("purpose")} placeholder="Purpose of visit" />
                  </Field>
                </div>

                <div className="flex justify-end pt-4">
                   <Button type="button" onClick={handleNext} className="cursor-pointer">Next</Button>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Products Discussed</h3>
                    <Button type="button" size="sm" onClick={() => append({ product_id: "", interest_level: 0, notes: "", quantity: 0, price: 0 })} className="cursor-pointer">
                      <Plus className="h-4 w-4 mr-2" /> Add Product
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
                            <Field orientation="vertical" className="col-span-2">
                               <FieldLabel>Product *</FieldLabel>
                               <Controller
                                  name={`details.${index}.product_id`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {products.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                               />
                               {errors.details?.[index]?.product_id && <FieldError>{errors.details[index]?.product_id?.message}</FieldError>}
                            </Field>

                             <div className="col-span-2 space-y-4 border rounded-md p-4 bg-muted/50">
                                <h4 className="text-sm font-medium">{t("form.interestSurvey")}</h4>
                                {questions.length === 0 ? (
                                  <div className="text-xs text-muted-foreground">{t("form.noInterestSurvey")}</div>
                                ) : (
                                  <div className="grid gap-4">
                                    {questions.sort((a: any,b: any) => a.sequence - b.sequence).map((q: any) => {
                                      const currentAnswers = watchedDetails?.[index]?.answers || [];
                                      const currentAnswer = currentAnswers.find(a => a.question_id === q.id);

                                      return (
                                        <div key={q.id} className="space-y-2">
                                          <FieldLabel className="text-xs">{q.question_text}</FieldLabel>
                                           <div className="flex gap-4">
                                             {q.options.map((opt: any) => (
                                                <div key={opt.id} className="flex items-center space-x-2">
                                                   <input 
                                                      type="radio" 
                                                      id={`q-${index}-${q.id}-${opt.id}`}
                                                      checked={currentAnswer?.option_id === opt.id}
                                                      onChange={() => {
                                                        const otherAnswers = currentAnswers.filter(a => a.question_id !== q.id);
                                                        const newAnswers = [...otherAnswers, { question_id: q.id, option_id: opt.id }];
                                                        setValue(`details.${index}.answers`, newAnswers, { shouldDirty: true });
                                                        
                                                        // Auto calculate score
                                                        const newScore = calculateInterest(newAnswers);
                                                        setValue(`details.${index}.interest_level`, newScore, { shouldDirty: true });
                                                      }}
                                                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary cursor-pointer"
                                                   />
                                                   <label htmlFor={`q-${index}-${q.id}-${opt.id}`} className="text-sm cursor-pointer">{opt.option_text}</label>
                                                </div>
                                             ))}
                                           </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                             </div>

                             <Field orientation="vertical">
                                <FieldLabel>{t("form.interestLevel")} (0-5)</FieldLabel>
                                <Controller
                                   name={`details.${index}.interest_level`}
                                   control={control}
                                   render={({ field }) => (
                                     <Select 
                                        value={field.value?.toString()} 
                                        onValueChange={(v) => field.onChange(parseInt(v))}
                                        disabled={questions.length > 0 && (watchedDetails?.[index]?.answers?.length ?? 0) > 0} 
                                     >
                                       <SelectTrigger>
                                         <SelectValue placeholder="Level" />
                                       </SelectTrigger>
                                       <SelectContent>
                                         {[0, 1, 2, 3, 4, 5].map((lvl) => (
                                           <SelectItem key={lvl} value={lvl.toString()}>{lvl}</SelectItem>
                                         ))}
                                       </SelectContent>
                                     </Select>
                                   )}
                                />
                                {questions.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">{t("form.calculatedFromSurvey")}</p>}
                             </Field>

                             <Field orientation="vertical">
                                <FieldLabel>{t("form.notes")}</FieldLabel>
                                <Input {...register(`details.${index}.notes`)} placeholder={t("form.notes")} />
                             </Field>
                             
                             <Field orientation="vertical">
                                 <FieldLabel>{t("form.quantity")}</FieldLabel>
                                 <Controller
                                   name={`details.${index}.quantity`}
                                   control={control}
                                   render={({ field }) => (
                                     <NumericInput value={field.value} onChange={field.onChange} min={0} />
                                   )}
                                 />
                             </Field>

                             <Field orientation="vertical">
                                 <FieldLabel>{t("form.price")}</FieldLabel>
                                 <Controller
                                   name={`details.${index}.price`}
                                   control={control}
                                   render={({ field }) => (
                                     <NumericInput value={field.value} onChange={field.onChange} min={0} />
                                   )}
                                 />
                             </Field>
                          </div>
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        No products added yet
                      </div>
                    )}
                 </div>

                 <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">Back</Button>
                    <Button type="submit" disabled={isLoading} className="cursor-pointer">
                      <ButtonLoading loading={isLoading}>
                        {isEdit ? "Update Visit" : "Create Visit"}
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

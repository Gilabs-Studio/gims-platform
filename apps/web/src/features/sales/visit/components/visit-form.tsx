"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, ShoppingCart, CalendarIcon, FileText, MapPin, User, Building2, Phone } from "lucide-react";
import {
  getVisitSchema,
  getUpdateVisitSchema,
  type CreateVisitFormData,
  type UpdateVisitFormData,
} from "../schemas/visit.schema";
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
import { cn, formatDate, sortOptions } from "@/lib/utils";
import { useCreateVisit, useUpdateVisit, useVisit, useInterestQuestions } from "../hooks/use-visits";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import type { SalesVisit, CreateSalesVisitData, UpdateSalesVisitData } from "../types";
import { toast } from "sonner";
import { ButtonLoading } from "@/components/loading";

const STORAGE_KEY = "visit_form_cache";

interface VisitFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly visit?: SalesVisit | null;
}

export function VisitForm({ open, onClose, visit }: VisitFormProps) {
  const isEdit = !!visit;
  const t = useTranslations("visit"); 
  const createVisit = useCreateVisit();
  const updateVisit = useUpdateVisit();
  const [activeTab, setActiveTab] = useState<"basic" | "details">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full visit data with items when editing
  const { data: fullVisitData, isLoading: isLoadingVisit, isFetching: isFetchingVisit } = useVisit(
    visit?.id ?? "",
    { 
      enabled: open && isEdit && !!visit?.id,
    }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100 }, { enabled: open });
  const { data: employeesData } = useEmployees({ per_page: 100 }, { enabled: open });
  const { data: companiesData } = useCompanies({ per_page: 100 });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

  const employees = useMemo(() => {
    const data = employeesData?.data ?? [];
    return sortOptions(data, (a) => `${a.employee_code} - ${a.name}`);
  }, [employeesData?.data]);

  const companies = useMemo(() => {
    const data = companiesData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [companiesData?.data]);

  const schema = isEdit ? getUpdateVisitSchema() : getVisitSchema();
  const formResolver = zodResolver(schema) as Resolver<CreateVisitFormData | UpdateVisitFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateVisitFormData | UpdateVisitFormData>({
    resolver: formResolver,
    defaultValues: visit
      ? {
          visit_date: visit.visit_date,
          scheduled_time: visit.scheduled_time ?? "",
          employee_id: visit.employee_id,
          company_id: visit.company_id ?? "",
          contact_person: visit.contact_person ?? "",
          contact_phone: visit.contact_phone ?? "",
          address: visit.address ?? "",
          purpose: visit.purpose ?? "",
          notes: visit.notes ?? "",
          details: visit.details?.map((d) => ({
            product_id: d.product_id,
            interest_level: d.interest_level,
            notes: d.notes ?? "",
            quantity: d.quantity ?? 0,
            price: d.price ?? 0,
          })) ?? [],
        }
      : {
          visit_date: new Date().toISOString().split("T")[0],
          scheduled_time: "09:00",
          employee_id: "",
          company_id: "",
          details: [],
        },
  });

  const { data: questionsData } = useInterestQuestions();
  const questions = questionsData?.data ?? [];

  // Helper to calculate interest based on answers
  const calculateInterest = (answers: { question_id: string; option_id: string }[]) => {
    let score = 0;
    if (!answers || answers.length === 0) return 0;
    
    // Create map for fast lookup
    const questionMap = new Map(questions.map(q => [q.id, q]));
    
    answers.forEach(ans => {
      const question = questionMap.get(ans.question_id);
      if (question) {
        const option = question.options.find(o => o.id === ans.option_id);
        if (option) {
          score += option.score;
        }
      }
    });

    return Math.min(score, 5); // Cap at 5
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  const watchedDetails = useWatch({ control, name: "details" });

  // Reset form when visit data changes (for edit mode)
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullVisitData?.data) {
        const visitData = fullVisitData.data;
        setTimeout(() => {
          reset({
            visit_date: visitData.visit_date,
            scheduled_time: visitData.scheduled_time ?? "",
            employee_id: visitData.employee_id,
            company_id: visitData.company_id ?? "",
            contact_person: visitData.contact_person ?? "",
            contact_phone: visitData.contact_phone ?? "",
            address: visitData.address ?? "",
            purpose: visitData.purpose ?? "",
            notes: visitData.notes ?? "",
            details: visitData.details?.map((d) => ({
              product_id: d.product_id,
              interest_level: d.interest_level,
              notes: d.notes ?? "",
              quantity: d.quantity ?? 0,
              price: d.price ?? 0,
              answers: d.answers?.map(a => ({
                question_id: a.question_id,
                option_id: a.option_id
              })) || []
            })) ?? [],
          });
        }, 10);
      }
      return;
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset(parsedData);
      } catch {
        // Fallback defaults
        reset({
          visit_date: new Date().toISOString().split("T")[0],
          scheduled_time: "09:00",
          employee_id: "",
          company_id: "",
          details: [],
        });
      }
    } else {
      reset({
        visit_date: new Date().toISOString().split("T")[0],
        scheduled_time: "09:00",
        employee_id: "",
        company_id: "",
        details: [],
      });
    }
  }, [open, isEdit, fullVisitData, reset]);

  const saveToLocalStorage = (data: CreateVisitFormData | UpdateVisitFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "visit_date",
        "employee_id",
        "company_id",
      ];
      
      const isValid = await Promise.all(
        basicFields.map((field) =>
          trigger(field as keyof (CreateVisitFormData | UpdateVisitFormData))
        )
      ).then((results) => results.every((result) => result));

      if (isValid) {
        saveToLocalStorage(getValues());
        setActiveTab("details");
      } else {
        toast.error("Please fill all required fields");
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFormSubmit = async (data: CreateVisitFormData | UpdateVisitFormData) => {
    try {
      // Logic to sanitize data for API (handling undefined/null mismatches)
      // We cast explicitly to compatible types for the mutation payload
      const commonData = {
        ...data,
        company_id: data.company_id || undefined,
        village_id: undefined, // ensure village_id is undefined if not present to avoid null issues
      };

      if (isEdit && visit) {
        await updateVisit.mutateAsync({
          id: visit.id,
          data: commonData as UpdateSalesVisitData,
        });
        toast.success("Visit updated successfully");
      } else {
        await createVisit.mutateAsync(commonData as unknown as CreateSalesVisitData);
        toast.success("Visit created successfully");
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save visit");
    }
  };

  const isFormLoading = isEdit && (isLoadingVisit || isFetchingVisit) && !fullVisitData?.data;

  // Auto-fill company address/phone when company selected
  const handleCompanyChange = (companyId: string) => {
    setValue("company_id", companyId, { shouldValidate: true });
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setValue("address", company.address ?? "");
      setValue("contact_phone", company.phone ?? "");
    }
  };

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
                                    {questions.sort((a,b) => a.sequence - b.sequence).map((q) => {
                                      const currentAnswers = watchedDetails?.[index]?.answers || [];
                                      const currentAnswer = currentAnswers.find(a => a.question_id === q.id);

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
                    <Button type="submit" disabled={createVisit.isPending || updateVisit.isPending} className="cursor-pointer">
                      <ButtonLoading loading={createVisit.isPending || updateVisit.isPending}>
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

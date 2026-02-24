import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getVisitSchema,
  getUpdateVisitSchema,
  type CreateVisitFormData,
  type UpdateVisitFormData,
} from "../schemas/visit.schema";
import { useCreateVisit, useUpdateVisit, useVisit, useInterestQuestions } from "../hooks/use-visits";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import type { SalesVisit, CreateSalesVisitData, UpdateSalesVisitData } from "../types";
import { sortOptions } from "@/lib/utils";

const STORAGE_KEY = "visit_form_cache";

export interface UseVisitFormProps {
  visit?: SalesVisit | null;
  open: boolean;
  onClose: () => void;
}

export function useVisitForm({ visit, open, onClose }: UseVisitFormProps) {
  const isEdit = !!visit;
  const t = useTranslations("visit"); 
  const createVisit = useCreateVisit();
  const updateVisit = useUpdateVisit();
  const [activeTab, setActiveTab] = useState<"basic" | "details">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full visit data with items when editing
  const { data: fullVisitData, isLoading: isLoadingVisit, isFetching: isFetchingVisit } = useVisit(
    visit?.id ?? "",
    { enabled: open && isEdit && !!visit?.id }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true }, { enabled: open });
  const { data: employeesData } = useEmployees({ per_page: 100 }, { enabled: open });
  const { data: companiesData } = useCompanies({ per_page: 100 }, { enabled: open });
  const { data: questionsData } = useInterestQuestions({ enabled: open });

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

  const questions = questionsData?.data ?? [];

  const schema = isEdit ? getUpdateVisitSchema() : getVisitSchema();
  const formResolver = zodResolver(schema) as Resolver<CreateVisitFormData | UpdateVisitFormData>;

  const form = useForm<CreateVisitFormData | UpdateVisitFormData>({
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

  const {
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  const watchedDetails = useWatch({ control, name: "details" });

  // Helper to calculate interest based on answers
  const calculateInterest = (answers: { question_id: string; option_id: string }[]) => {
    let score = 0;
    if (!answers || answers.length === 0) return 0;
    
    // Create map for fast lookup
    const questionMap = new Map<string, any>(questions.map((q: any) => [q.id, q]));
    
    answers.forEach(ans => {
      const question = questionMap.get(ans.question_id);
      if (question) {
        const option = question.options.find((o: any) => o.id === ans.option_id);
        if (option) {
          score += option.score;
        }
      }
    });

    return Math.min(score, 5); // Cap at 5
  };

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
          trigger(field as Extract<keyof CreateVisitFormData, string>)
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

  const isLoading = createVisit.isPending || updateVisit.isPending;
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

  const onInvalid = (errors: FieldErrors<CreateVisitFormData | UpdateVisitFormData>) => {
    const basicFields = [
      "visit_date",
      "employee_id",
      "company_id",
    ];

    const basicError = basicFields.some((field) => 
      (errors as any)[field]
    );

    if (basicError) {
      setActiveTab("basic");
      setTimeout(() => {
        toast.error("Please fill all required fields in the Basic Information tab");
      }, 100);
    }
  };

  return {
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
  };
}

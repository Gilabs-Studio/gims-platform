"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getVisitReportSchema, type CreateVisitReportFormData, type UpdateVisitReportFormData } from "../schemas/visit-report.schema";
import { useCreateVisitReport, useUpdateVisitReport, useVisitReportById, useVisitReportFormData } from "./use-visit-reports";
import type { VisitReport, VisitInterestQuestion } from "../types";

const STORAGE_KEY = "crm_visit_report_form_cache";

export interface UseVisitReportFormProps {
  open: boolean;
  onClose: () => void;
  visit?: VisitReport | null;
}

export function useVisitReportForm({ open, onClose, visit }: UseVisitReportFormProps) {
  const isEdit = !!visit;
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");

  const createMutation = useCreateVisitReport();
  const updateMutation = useUpdateVisitReport();
  const [activeTab, setActiveTab] = useState<"basic" | "details">("basic");

  // Fetch full visit data when editing
  const { data: fullVisitData, isLoading: isLoadingVisit, isFetching: isFetchingVisit } = useVisitReportById(
    visit?.id ?? ""
  );

  // Fetch form data for dropdowns
  const { data: formDataRes } = useVisitReportFormData({ enabled: open });
  const formData = formDataRes?.data;
  const customers = formData?.customers ?? [];
  const contacts = useMemo(() => formData?.contacts ?? [], [formData?.contacts]);
  const employees = formData?.employees ?? [];
  const deals = formData?.deals ?? [];
  const leads = formData?.leads ?? [];
  const products = formData?.products ?? [];
  const questions: VisitInterestQuestion[] = formData?.interest_questions ?? [];

  const schema = getVisitReportSchema();

  const form = useForm<CreateVisitReportFormData>({
    resolver: zodResolver(schema) as Resolver<CreateVisitReportFormData>,
    defaultValues: {
      visit_date: new Date().toISOString().split("T")[0],
      scheduled_time: "",
      employee_id: "",
      customer_id: "",
      contact_id: "",
      deal_id: "",
      lead_id: "",
      contact_person: "",
      contact_phone: "",
      address: "",
      purpose: "",
      notes: "",
      details: [],
    },
  });

  const { control, reset, trigger, getValues, setValue, handleSubmit, register, formState: { errors } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  const watchedDetails = useWatch({ control, name: "details" });

  // Calculate interest score from survey answers
  const calculateInterest = (answers: { question_id: string; option_id: string }[]) => {
    if (!answers || answers.length === 0) return 0;
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let score = 0;
    answers.forEach((ans) => {
      const question = questionMap.get(ans.question_id);
      if (question) {
        const option = question.options.find((o) => o.id === ans.option_id);
        if (option) score += option.score;
      }
    });
    return Math.min(score, 5);
  };

  // Reset form when opened or visit data loads
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullVisitData?.data) {
        const v = fullVisitData.data;
        setTimeout(() => {
          reset({
            visit_date: v.visit_date,
            scheduled_time: v.scheduled_time ?? "",
            employee_id: v.employee_id,
            customer_id: v.customer_id ?? "",
            contact_id: v.contact_id ?? "",
            deal_id: v.deal_id ?? "",
            lead_id: v.lead_id ?? "",
            contact_person: v.contact_person ?? "",
            contact_phone: v.contact_phone ?? "",
            address: v.address ?? "",
            purpose: v.purpose ?? "",
            notes: v.notes ?? "",
            details: v.details?.map((d) => ({
              product_id: d.product_id,
              interest_level: d.interest_level,
              notes: d.notes ?? "",
              quantity: d.quantity ?? 0,
              price: d.price ?? 0,
              answers: d.answers?.map((a) => ({ question_id: a.question_id, option_id: a.option_id })) ?? [],
            })) ?? [],
          });
        }, 10);
      }
      return;
    }

    // Create mode: restore from cache
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        reset(JSON.parse(cached));
      } catch {
        resetToDefaults();
      }
    } else {
      resetToDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, fullVisitData]);

  const resetToDefaults = () => {
    reset({
      visit_date: new Date().toISOString().split("T")[0],
      scheduled_time: "",
      employee_id: "",
      customer_id: "",
      contact_id: "",
      deal_id: "",
      lead_id: "",
      contact_person: "",
      contact_phone: "",
      address: "",
      purpose: "",
      notes: "",
      details: [],
    });
  };

  const saveToLocalStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getValues()));
  };

  // Filter contacts by selected customer
  const watchedCustomerId = useWatch({ control, name: "customer_id" });
  const filteredContacts = useMemo(() => {
    if (!watchedCustomerId) return contacts;
    return contacts.filter((c) => c.customer_id === watchedCustomerId);
  }, [contacts, watchedCustomerId]);

  const handleNext = async () => {
    const basicFields = ["visit_date", "employee_id"] as const;
    const isValid = await Promise.all(
      basicFields.map((field) => trigger(field as keyof CreateVisitReportFormData))
    ).then((results) => results.every(Boolean));

    if (isValid) {
      saveToLocalStorage();
      setActiveTab("details");
    } else {
      toast.error(t("validation.fillRequired"));
    }
  };

  const onSubmit: SubmitHandler<CreateVisitReportFormData> = async (data) => {
    try {
      const payload = {
        ...data,
        customer_id: data.customer_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
        lead_id: data.lead_id || null,
        village_id: null,
      };

      if (isEdit && visit) {
        await updateMutation.mutateAsync({ id: visit.id, data: payload as unknown as UpdateVisitReportFormData });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(payload as CreateVisitReportFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isFormLoading = isEdit && (isLoadingVisit || isFetchingVisit) && !fullVisitData?.data;

  return {
    form,
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
    handleFormSubmit: handleSubmit(onSubmit),
    register,
    control,
    errors,
    setValue,
  };
}

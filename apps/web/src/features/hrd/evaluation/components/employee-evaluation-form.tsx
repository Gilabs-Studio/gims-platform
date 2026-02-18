"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, CalendarIcon } from "lucide-react";
import {
  getEmployeeEvaluationSchema,
  type CreateEmployeeEvaluationFormData,
} from "../schemas/evaluation.schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, sortOptions } from "@/lib/utils";
import {
  useCreateEmployeeEvaluation,
  useUpdateEmployeeEvaluation,
  useEmployeeEvaluationFormData,
  useEvaluationCriteriaByGroup,
} from "../hooks/use-evaluations";
import type { EmployeeEvaluation, UpdateEmployeeEvaluationData } from "../types";
import { toast } from "sonner";

interface EmployeeEvaluationFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly evaluation?: EmployeeEvaluation | null;
}

export function EmployeeEvaluationForm({ open, onClose, evaluation }: EmployeeEvaluationFormProps) {
  const isEdit = !!evaluation;
  const t = useTranslations("evaluation");
  const createEvaluation = useCreateEmployeeEvaluation();
  const updateEvaluation = useUpdateEmployeeEvaluation();

  const { data: formDataRes } = useEmployeeEvaluationFormData({ enabled: open });
  const formData = formDataRes?.data;

  const employees = useMemo(() => {
    const data = formData?.employees ?? [];
    return sortOptions(data, (a) => `${a.employee_code} - ${a.name}`);
  }, [formData?.employees]);

  const evaluationGroups = useMemo(() => {
    return formData?.evaluation_groups ?? [];
  }, [formData?.evaluation_groups]);

  const schema = getEmployeeEvaluationSchema(t);

  const {
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeEvaluationFormData>({
    resolver: zodResolver(schema),
    defaultValues: evaluation
      ? {
          employee_id: evaluation.employee_id,
          evaluation_group_id: evaluation.evaluation_group_id,
          evaluator_id: evaluation.evaluator_id,
          evaluation_type: evaluation.evaluation_type,
          period_start: evaluation.period_start,
          period_end: evaluation.period_end,
          notes: evaluation.notes ?? "",
          criteria_scores: evaluation.criteria_scores?.map((cs) => ({
            evaluation_criteria_id: cs.evaluation_criteria_id,
            score: cs.score,
            notes: cs.notes ?? "",
          })) ?? [],
        }
      : {
          employee_id: "",
          evaluation_group_id: "",
          evaluator_id: "",
          evaluation_type: "SELF" as const,
          period_start: new Date().toISOString().split("T")[0],
          period_end: new Date().toISOString().split("T")[0],
          notes: "",
          criteria_scores: [],
        },
  });

  const selectedGroupId = watch("evaluation_group_id");

  // Fetch criteria for selected group (for scoring)
  const { data: criteriaData } = useEvaluationCriteriaByGroup(
    selectedGroupId ?? "",
    { per_page: 100 },
    { enabled: open && !!selectedGroupId },
  );

  const criteria = useMemo(() => criteriaData?.data ?? [], [criteriaData?.data]);

  const { fields, replace } = useFieldArray({
    control,
    name: "criteria_scores",
  });

  // Auto-populate criteria scores when criteria load
  useEffect(() => {
    if (criteria.length > 0 && !isEdit) {
      const scores = criteria.map((c) => ({
        evaluation_criteria_id: c.id,
        score: 0,
        notes: "",
      }));
      replace(scores);
    }
  }, [criteria, isEdit, replace]);

  useEffect(() => {
    if (open) {
      if (evaluation) {
        reset({
          employee_id: evaluation.employee_id,
          evaluation_group_id: evaluation.evaluation_group_id,
          evaluator_id: evaluation.evaluator_id,
          evaluation_type: evaluation.evaluation_type,
          period_start: evaluation.period_start,
          period_end: evaluation.period_end,
          notes: evaluation.notes ?? "",
          criteria_scores: evaluation.criteria_scores?.map((cs) => ({
            evaluation_criteria_id: cs.evaluation_criteria_id,
            score: cs.score,
            notes: cs.notes ?? "",
          })) ?? [],
        });
      } else {
        reset({
          employee_id: "",
          evaluation_group_id: "",
          evaluator_id: "",
          evaluation_type: "SELF" as const,
          period_start: new Date().toISOString().split("T")[0],
          period_end: new Date().toISOString().split("T")[0],
          notes: "",
          criteria_scores: [],
        });
      }
    }
  }, [open, evaluation, reset]);

  const onSubmit = async (data: CreateEmployeeEvaluationFormData) => {
    try {
      if (isEdit && evaluation) {
        const updateData: UpdateEmployeeEvaluationData = {
          evaluator_id: data.evaluator_id,
          evaluation_type: data.evaluation_type,
          period_start: data.period_start,
          period_end: data.period_end,
          notes: data.notes,
          criteria_scores: data.criteria_scores,
        };
        await updateEvaluation.mutateAsync({
          id: evaluation.id,
          data: updateData,
        });
        toast.success(t("evaluation.updated"));
      } else {
        await createEvaluation.mutateAsync(data);
        toast.success(t("evaluation.created"));
      }
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const isPending = createEvaluation.isPending || updateEvaluation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("evaluation.edit") : t("evaluation.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee + Evaluation Group row */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("evaluation.employee")}</FieldLabel>
              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isEdit}>
                    <SelectTrigger className={cn(!isEdit && "cursor-pointer")}>
                      <SelectValue placeholder={t("common.select")} />
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
              {errors.employee_id && (
                <FieldError>{errors.employee_id.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel>{t("evaluation.evaluationGroup")}</FieldLabel>
              <Controller
                name="evaluation_group_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isEdit}>
                    <SelectTrigger className={cn(!isEdit && "cursor-pointer")}>
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {evaluationGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="cursor-pointer">
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.evaluation_group_id && (
                <FieldError>{errors.evaluation_group_id.message}</FieldError>
              )}
            </Field>
          </div>

          {/* Evaluator + Type row */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("evaluation.evaluator")}</FieldLabel>
              <Controller
                name="evaluator_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("common.select")} />
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
              {errors.evaluator_id && (
                <FieldError>{errors.evaluator_id.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel>{t("evaluation.type")}</FieldLabel>
              <Controller
                name="evaluation_type"
                control={control}
                render={({ field }) => (
                  <Select value={(field.value as string) ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELF" className="cursor-pointer">
                        {t("evaluationType.self")}
                      </SelectItem>
                      <SelectItem value="MANAGER" className="cursor-pointer">
                        {t("evaluationType.manager")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.evaluation_type && (
                <FieldError>{errors.evaluation_type.message}</FieldError>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("evaluation.periodStart")}</FieldLabel>
              <Controller
                name="period_start"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDate(field.value as string) : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value as string) : undefined}
                        onSelect={(date: Date | undefined) =>
                          field.onChange(date?.toISOString().split("T")[0] ?? "")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.period_start && <FieldError>{errors.period_start.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("evaluation.periodEnd")}</FieldLabel>
              <Controller
                name="period_end"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? formatDate(field.value as string) : t("common.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value as string) : undefined}
                        onSelect={(date: Date | undefined) =>
                          field.onChange(date?.toISOString().split("T")[0] ?? "")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.period_end && <FieldError>{errors.period_end.message}</FieldError>}
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("evaluation.notes")}</FieldLabel>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  value={(field.value as string) ?? ""}
                  onChange={field.onChange}
                  placeholder={t("evaluation.notesPlaceholder")}
                  rows={2}
                />
              )}
            />
            {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
          </Field>

          {/* Criteria Scores */}
          {fields.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">{t("evaluation.criteriaScores")}</h4>
                {fields.map((field, index) => {
                  const matchedCriteria = criteria.find(
                    (c) => c.id === field.evaluation_criteria_id,
                  );
                  const maxScore = matchedCriteria?.max_score ?? 100;
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_100px_1fr] gap-3 items-start p-3 rounded-md border"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {matchedCriteria?.name ?? t("criteria.unknown")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("criteria.weight")}: {matchedCriteria?.weight ?? 0}% |{" "}
                          {t("criteria.maxScore")}: {maxScore}
                        </p>
                      </div>
                      <Controller
                        name={`criteria_scores.${index}.score`}
                        control={control}
                        render={({ field: scoreField }) => (
                          <NumericInput
                            value={scoreField.value}
                            onChange={(val) => {
                              scoreField.onChange(
                                val !== undefined && val > maxScore ? maxScore : val,
                              );
                            }}
                            min={0}
                            max={maxScore}
                          />
                        )}
                      />
                      <Controller
                        name={`criteria_scores.${index}.notes`}
                        control={control}
                        render={({ field: notesField }) => (
                          <Textarea
                            value={(notesField.value as string) ?? ""}
                            onChange={notesField.onChange}
                            placeholder={t("evaluation.scoreNotes")}
                            rows={1}
                            className="text-sm"
                          />
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

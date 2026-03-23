"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Info } from "lucide-react";
import {
  getEvaluationCriteriaSchema,
  getUpdateEvaluationCriteriaSchema,
  type CreateEvaluationCriteriaFormData,
} from "../schemas/evaluation.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumericInput } from "@/components/ui/numeric-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEvaluationCriteria, useUpdateEvaluationCriteria, useEvaluationGroups, useEvaluationGroup } from "../hooks/use-evaluations";
import type { EvaluationCriteria } from "../types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";


interface EvaluationCriteriaFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly criteria?: EvaluationCriteria | null;
  readonly defaultGroupId?: string;
}

export function EvaluationCriteriaForm({ open, onClose, criteria, defaultGroupId }: EvaluationCriteriaFormProps) {
  const isEdit = !!criteria;
  const t = useTranslations("evaluation");
  const createCriteria = useCreateEvaluationCriteria();
  const updateCriteria = useUpdateEvaluationCriteria();

  const { data: groupsData } = useEvaluationGroups({ per_page: 20, is_active: true });
  const groups = groupsData?.data ?? [];

  const schema = isEdit
    ? getUpdateEvaluationCriteriaSchema(t)
    : getEvaluationCriteriaSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateEvaluationCriteriaFormData>({
    resolver: zodResolver(schema) as Resolver<CreateEvaluationCriteriaFormData>,
    defaultValues: {
      evaluation_group_id: criteria ? (criteria.evaluation_group_id ?? "") : (defaultGroupId ?? ""),
      name: criteria?.name ?? "",
      description: criteria?.description ?? "",
      weight: criteria?.weight ?? 0,
      max_score: criteria?.max_score ?? 100,
      sort_order: criteria?.sort_order ?? 0,
    },
  });

  // Watch selected group to compute remaining weight
  const watchedGroupId = useWatch({ control, name: "evaluation_group_id" }) as string | undefined;
  const selectedGroupId = isEdit ? criteria?.evaluation_group_id : watchedGroupId;

  // Fetch full group detail (with total_weight) for the selected group
  const { data: selectedGroupData } = useEvaluationGroup(selectedGroupId ?? "", {
    enabled: !!selectedGroupId,
  });
  const selectedGroup = selectedGroupData?.data;

  // Calculate remaining weight: 100 - current total weight (+ current criteria weight if editing)
  const remainingWeight = useMemo(() => {
    if (!selectedGroup) return 100;
    const currentTotal = selectedGroup.total_weight ?? 0;
    const ownWeight = isEdit && criteria ? criteria.weight : 0;
    return Math.max(0, 100 - currentTotal + ownWeight);
  }, [selectedGroup, isEdit, criteria]);

  useEffect(() => {
    if (open) {
      if (criteria) {
        reset({
          evaluation_group_id: criteria.evaluation_group_id ?? "",
          name: criteria.name,
          description: criteria.description ?? "",
          weight: criteria.weight,
          max_score: criteria.max_score,
          sort_order: criteria.sort_order,
        });
      } else {
        reset({
          evaluation_group_id: defaultGroupId ?? "",
          name: "",
          description: "",
          weight: 0,
          max_score: 100,
          sort_order: 0,
        });
      }
    }
  }, [open, criteria, defaultGroupId, reset]);

  const onSubmit = async (data: CreateEvaluationCriteriaFormData) => {
    try {
      if (isEdit && criteria) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { evaluation_group_id: _groupId, ...updateData } = data;
        await updateCriteria.mutateAsync({
          id: criteria.id,
          data: updateData,
        });
        toast.success(t("criteria.updated"));
      } else {
        await createCriteria.mutateAsync(data);
        toast.success(t("criteria.created"));
      }
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  const isPending = createCriteria.isPending || updateCriteria.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("criteria.edit") : t("criteria.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <Field>
              <FieldLabel>{t("criteria.evaluationGroup")}</FieldLabel>
              <Controller
                name="evaluation_group_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="cursor-pointer">
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {"evaluation_group_id" in errors && errors.evaluation_group_id && (
                <FieldError>{errors.evaluation_group_id.message}</FieldError>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel>{t("criteria.name")}</FieldLabel>
            <Input {...register("name")} placeholder={t("criteria.namePlaceholder")} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("criteria.description")}</FieldLabel>
            <Textarea
              {...register("description")}
              placeholder={t("criteria.descriptionPlaceholder")}
              rows={2}
            />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          {/* Weight info */}
          {selectedGroup && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                {t("criteria.currentTotalWeight")}:{" "}
                <Badge variant={selectedGroup.total_weight === 100 ? "success" : "outline"} className="mx-1">
                  {selectedGroup.total_weight}%
                </Badge>
                {" · "}
                {t("criteria.remainingWeight")}:{" "}
                <Badge variant={remainingWeight === 0 ? "destructive" : "secondary"} className="mx-1">
                  {remainingWeight}%
                </Badge>
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel>{t("criteria.weight")}</FieldLabel>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <NumericInput
                    value={field.value as number}
                    onChange={(val) => {
                      // Cap the value at remainingWeight
                      const capped = Math.min(val ?? 0, remainingWeight);
                      field.onChange(capped);
                    }}
                  />
                )}
              />
              {errors.weight && <FieldError>{errors.weight.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("criteria.maxScore")}</FieldLabel>
              <Controller
                name="max_score"
                control={control}
                render={({ field }) => (
                  <NumericInput
                    value={field.value as number}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.max_score && <FieldError>{errors.max_score.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>{t("criteria.sortOrder")}</FieldLabel>
              <Controller
                name="sort_order"
                control={control}
                render={({ field }) => (
                  <NumericInput
                    value={field.value as number}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.sort_order && <FieldError>{errors.sort_order.message}</FieldError>}
            </Field>
          </div>

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

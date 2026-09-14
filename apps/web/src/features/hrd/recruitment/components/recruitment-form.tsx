"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RupiahInput } from "./rupiah-input";
import {
  getRecruitmentRequestSchema,
  type CreateRecruitmentFormData,
} from "../schemas/recruitment.schema";
import {
  useCreateRecruitmentRequest,
  useUpdateRecruitmentRequest,
  useRecruitmentFormData,
} from "../hooks/use-recruitment";
import type { RecruitmentRequest } from "../types";

interface RecruitmentFormProps {
  open: boolean;
  onClose: () => void;
  recruitmentRequest?: RecruitmentRequest | null;
}

export function RecruitmentForm({
  open,
  onClose,
  recruitmentRequest,
}: RecruitmentFormProps) {
  const t = useTranslations("recruitment");
  const isEditing = !!recruitmentRequest;
  const schema = getRecruitmentRequestSchema(t);

  const { data: formDataResponse } = useRecruitmentFormData({
    enabled: open,
  });
  const formData = formDataResponse?.data;

  const createMutation = useCreateRecruitmentRequest();
  const updateMutation = useUpdateRecruitmentRequest();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateRecruitmentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      division_id: "",
      position_id: "",
      required_count: 1,
      employment_type: "",
      expected_start_date: "",
      salary_range_min: undefined,
      salary_range_max: undefined,
      job_description: "",
      qualifications: "",
      priority: "MEDIUM",
      notes: "",
    },
  });

  useEffect(() => {
    if (recruitmentRequest && open) {
      reset({
        division_id: recruitmentRequest.division_id,
        position_id: recruitmentRequest.position_id,
        required_count: recruitmentRequest.required_count,
        employment_type: recruitmentRequest.employment_type,
        expected_start_date: recruitmentRequest.expected_start_date,
        salary_range_min: recruitmentRequest.salary_range_min ?? undefined,
        salary_range_max: recruitmentRequest.salary_range_max ?? undefined,
        job_description: recruitmentRequest.job_description,
        qualifications: recruitmentRequest.qualifications,
        priority: recruitmentRequest.priority,
        notes: recruitmentRequest.notes ?? "",
      });
    } else if (!recruitmentRequest && open) {
      reset({
        division_id: "",
        position_id: "",
        required_count: 1,
        employment_type: "",
        expected_start_date: "",
        salary_range_min: undefined,
        salary_range_max: undefined,
        job_description: "",
        qualifications: "",
        priority: "MEDIUM",
        notes: "",
      });
    }
  }, [recruitmentRequest, open, reset]);

  const onSubmit = async (data: CreateRecruitmentFormData) => {
    try {
      if (isEditing && recruitmentRequest) {
        await updateMutation.mutateAsync({
          id: recruitmentRequest.id,
          data,
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t("created"));
      }
      onClose();
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="cursor-pointer">
                {t("common.basicInfo")}
              </TabsTrigger>
              <TabsTrigger value="requirements" className="cursor-pointer">
                {t("common.requirements")}
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Division */}
              <div className="space-y-2">
                <Label htmlFor="division_id">{t("division")} *</Label>
                <Controller
                  name="division_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        className={cn(
                          errors.division_id && "border-destructive"
                        )}
                      >
                        <SelectValue
                          placeholder={`${t("common.select")} ${t("division")}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {formData?.divisions?.map((division) => (
                          <SelectItem key={division.id} value={division.id}>
                            {division.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.division_id && (
                  <p className="text-sm text-destructive">
                    {errors.division_id.message}
                  </p>
                )}
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position_id">{t("position")} *</Label>
                <Controller
                  name="position_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        className={cn(
                          errors.position_id && "border-destructive"
                        )}
                      >
                        <SelectValue
                          placeholder={`${t("common.select")} ${t("position")}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {formData?.job_positions?.map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.position_id && (
                  <p className="text-sm text-destructive">
                    {errors.position_id.message}
                  </p>
                )}
              </div>

              {/* Required Count + Employment Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="required_count">
                    {t("requiredCount")} *
                  </Label>
                  <Input
                    id="required_count"
                    type="number"
                    min={1}
                    {...register("required_count", { valueAsNumber: true })}
                    className={cn(
                      errors.required_count && "border-destructive"
                    )}
                  />
                  {errors.required_count && (
                    <p className="text-sm text-destructive">
                      {errors.required_count.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employment_type">
                    {t("employmentType.label")} *
                  </Label>
                  <Controller
                    name="employment_type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className={cn(
                            errors.employment_type && "border-destructive"
                          )}
                        >
                          <SelectValue
                            placeholder={`${t("common.select")} ${t("employmentType.label")}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {formData?.employment_types?.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.employment_type && (
                    <p className="text-sm text-destructive">
                      {errors.employment_type.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Expected Start Date + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("expectedStartDate")} *</Label>
                  <Controller
                    name="expected_start_date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal cursor-pointer",
                              !field.value && "text-muted-foreground",
                              errors.expected_start_date && "border-destructive"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(parseISO(field.value), "PPP")
                              : t("common.selectDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              field.value
                                ? parseISO(field.value)
                                : undefined
                            }
                            onSelect={(date: Date | undefined) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : ""
                              )
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.expected_start_date && (
                    <p className="text-sm text-destructive">
                      {errors.expected_start_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("priority.label")}</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "MEDIUM"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={`${t("common.select")} ${t("priority.label")}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {formData?.priorities?.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Salary Range - auto-format as rupiah (e.g. 20000 → 20.000) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary_range_min">
                    {t("salaryRangeMin")}
                  </Label>
                  <Controller
                    name="salary_range_min"
                    control={control}
                    render={({ field }) => (
                      <RupiahInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                        min={0}
                        className={cn(
                          errors.salary_range_min && "border-destructive"
                        )}
                      />
                    )}
                  />
                  {errors.salary_range_min && (
                    <p className="text-sm text-destructive">
                      {errors.salary_range_min.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_range_max">
                    {t("salaryRangeMax")}
                  </Label>
                  <Controller
                    name="salary_range_max"
                    control={control}
                    render={({ field }) => (
                      <RupiahInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                        min={0}
                        className={cn(
                          errors.salary_range_max && "border-destructive"
                        )}
                      />
                    )}
                  />
                  {errors.salary_range_max && (
                    <p className="text-sm text-destructive">
                      {errors.salary_range_max.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t("notes")}</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  {...register("notes")}
                  className={cn(errors.notes && "border-destructive")}
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">
                    {errors.notes.message}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="space-y-4 mt-4">
              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="job_description">
                  {t("jobDescription")} *
                </Label>
                <Textarea
                  id="job_description"
                  rows={8}
                  placeholder={t("jobDescription")}
                  {...register("job_description")}
                  className={cn(
                    errors.job_description && "border-destructive"
                  )}
                />
                {errors.job_description && (
                  <p className="text-sm text-destructive">
                    {errors.job_description.message}
                  </p>
                )}
              </div>

              {/* Qualifications */}
              <div className="space-y-2">
                <Label htmlFor="qualifications">
                  {t("qualifications")} *
                </Label>
                <Textarea
                  id="qualifications"
                  rows={8}
                  placeholder={t("qualifications")}
                  {...register("qualifications")}
                  className={cn(
                    errors.qualifications && "border-destructive"
                  )}
                />
                {errors.qualifications && (
                  <p className="text-sm text-destructive">
                    {errors.qualifications.message}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting
                ? t("common.saving")
                : isEditing
                  ? t("common.update")
                  : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

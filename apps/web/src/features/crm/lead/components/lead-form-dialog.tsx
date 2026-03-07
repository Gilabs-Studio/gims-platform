import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { LocationSelector } from "@/features/master-data/geographic/components/location-selector";
import { LeadSourceDialog } from "../../lead-source/components/lead-source-dialog";
import { LeadStatusDialog } from "../../lead-status/components/lead-status-dialog";
import { useLeadForm, type UseLeadFormProps } from "../hooks/use-lead-form";
import { useLeadFormData, leadKeys } from "../hooks/use-leads";
import type { Lead } from "../types";

interface LeadFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly lead?: Lead | null;
  readonly onSuccess?: () => void;
}

export function LeadFormDialog({
  open,
  onClose,
  lead,
  onSuccess,
}: LeadFormDialogProps) {
  const t = useTranslations("crmLead");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const isEditing = !!lead;

  const [quickCreate, setQuickCreate] = useState<{
    type: "source" | "status" | null;
    query: string;
  }>({ type: null, query: "" });

  const openQuickCreate = (type: "source" | "status", query: string) => {
    setQuickCreate({ type, query });
  };

  const closeQuickCreate = () => {
    setQuickCreate({ type: null, query: "" });
  };

  const handleSourceCreated = (item: { id: string; name: string }) => {
    queryClient.invalidateQueries({ queryKey: leadKeys.formData() });
    form.setValue("lead_source_id", item.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    closeQuickCreate();
  };

  const handleStatusCreated = (item: { id: string; name: string }) => {
    queryClient.invalidateQueries({ queryKey: leadKeys.formData() });
    form.setValue("lead_status_id", item.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    closeQuickCreate();
  };

  const formProps: UseLeadFormProps = {
    open,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        onSuccess?.();
        onClose();
      }
    },
    editingItem: lead,
    onSuccess,
  };

  const { form, onSubmit, isSubmitting } = useLeadForm(formProps);
  const { data: formDataRes } = useLeadFormData({ enabled: open });

  const formData = formDataRes?.data;
  const leadSources = formData?.lead_sources ?? [];
  const leadStatuses = formData?.lead_statuses ?? [];
  const employees = formData?.employees ?? [];

  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.basicInfo")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.firstName")} *</FieldLabel>
                <Input
                  placeholder={t("form.firstNamePlaceholder")}
                  {...register("first_name")}
                />
                {errors.first_name && (
                  <FieldError>{errors.first_name.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.lastName")}</FieldLabel>
                <Input
                  placeholder={t("form.lastNamePlaceholder")}
                  {...register("last_name")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.companyName")}</FieldLabel>
                <Input
                  placeholder={t("form.companyNamePlaceholder")}
                  {...register("company_name")}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.jobTitle")}</FieldLabel>
                <Input
                  placeholder={t("form.jobTitlePlaceholder")}
                  {...register("job_title")}
                />
              </Field>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.contactInfo")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.email")}</FieldLabel>
                <Input
                  type="email"
                  placeholder={t("form.emailPlaceholder")}
                  {...register("email")}
                />
                {errors.email && (
                  <FieldError>{errors.email.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.phone")}</FieldLabel>
                <Input
                  placeholder={t("form.phonePlaceholder")}
                  {...register("phone")}
                />
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("form.address")}</FieldLabel>
              <Textarea
                placeholder={t("form.addressPlaceholder")}
                rows={2}
                {...register("address")}
              />
            </Field>

            <LocationSelector
              control={control}
              setValue={setValue}
              fieldNames={{
                province_id: "province_id",
                city_id: "city_id",
                district_id: "district_id",
                village_name: "village_name",
              }}
              labels={{
                province: t("form.province"),
                city: t("form.city"),
                district: t("form.district") || "District",
                village: t("form.village") || "Village / Kelurahan",
                selectProvince: t("form.provincePlaceholder"),
                selectCity: t("form.cityPlaceholder"),
              }}
            />
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.classification")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.leadSource")}</FieldLabel>
                <Controller
                  control={control}
                  name="lead_source_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      options={leadSources.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
                      placeholder={t("form.leadSourcePlaceholder")}
                      createPermission="crm_lead_source.create"
                      createLabel={`${tCommon("create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("source", q)}
                    />
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.leadStatus")}</FieldLabel>
                <Controller
                  control={control}
                  name="lead_status_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      options={leadStatuses
                        .filter((s) => !s.is_converted)
                        .map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                      placeholder={t("form.leadStatusPlaceholder")}
                      createPermission="crm_lead_status.create"
                      createLabel={`${tCommon("create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("status", q)}
                    />
                  )}
                />
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("form.assignedTo")}</FieldLabel>
              <Controller
                control={control}
                name="assigned_to"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("form.assignedToPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="cursor-pointer">
                          {emp.name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("form.website")}</FieldLabel>
              <Input
                placeholder="https:// instagram.com/username, linkedin.com/in/name, etc."
                {...register("website")}
              />
            </Field>
          </div>

          {/* Scoring & Value */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.scoring")}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("form.estimatedValue")}</FieldLabel>
                <Controller
                  control={control}
                  name="estimated_value"
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={(val) => field.onChange(val ?? 0)}
                      placeholder={t("form.estimatedValuePlaceholder")}
                    />
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("form.probability")}</FieldLabel>
                <Controller
                  control={control}
                  name="probability"
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={(val) => field.onChange(val ?? 0)}
                      placeholder={t("form.probabilityPlaceholder")}
                    />
                  )}
                />
              </Field>
            </div>
          </div>

          {/* BANT Qualification */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.bant")}
            </h4>

            {/* Budget */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.budgetConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("budget_confirmed")}
                  onCheckedChange={(val) => setValue("budget_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("budget_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.budgetAmount")}</FieldLabel>
                  <Controller
                    control={control}
                    name="budget_amount"
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={(val) => field.onChange(val ?? 0)}
                        placeholder={t("form.budgetAmountPlaceholder")}
                      />
                    )}
                  />
                </Field>
              )}
            </div>

            {/* Authority */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.authConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("auth_confirmed")}
                  onCheckedChange={(val) => setValue("auth_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("auth_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.authPerson")}</FieldLabel>
                  <Input
                    placeholder={t("form.authPersonPlaceholder")}
                    {...register("auth_person")}
                  />
                </Field>
              )}
            </div>

            {/* Need */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.needConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("need_confirmed")}
                  onCheckedChange={(val) => setValue("need_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("need_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.needDescription")}</FieldLabel>
                  <Textarea
                    placeholder={t("form.needDescriptionPlaceholder")}
                    rows={2}
                    {...register("need_description")}
                  />
                </Field>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-lg border p-3 space-y-3">
              <Field
                orientation="horizontal"
                className="flex items-center justify-between"
              >
                <FieldLabel>{t("form.timeConfirmed")}</FieldLabel>
                <Switch
                  checked={watch("time_confirmed")}
                  onCheckedChange={(val) => setValue("time_confirmed", val)}
                  className="cursor-pointer"
                />
              </Field>
              {watch("time_confirmed") && (
                <Field orientation="vertical">
                  <FieldLabel>{t("form.timeExpected")}</FieldLabel>
                  <Controller
                    control={control}
                    name="time_expected"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal cursor-pointer",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>{t("form.pickDate") || "Pick a date"}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date: Date | undefined) =>
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium border-b pb-2">
              {t("sections.notes")}
            </h4>

            <Field orientation="vertical">
              <FieldLabel>{t("form.notes")}</FieldLabel>
              <Textarea
                placeholder={t("form.notesPlaceholder")}
                rows={3}
                {...register("notes")}
              />
            </Field>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? tCommon("save") : tCommon("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    <LeadSourceDialog
      open={quickCreate.type === "source"}
      onOpenChange={(o) => !o && closeQuickCreate()}
      editingItem={null}
      onCreated={handleSourceCreated}
      initialData={{
        name: quickCreate.query,
        order: Math.max(0, ...leadSources.map((s) => s.order ?? 0)) + 1,
      }}
    />

    <LeadStatusDialog
      open={quickCreate.type === "status"}
      onOpenChange={(o) => !o && closeQuickCreate()}
      editingItem={null}
      onCreated={handleStatusCreated}
      initialData={{
        name: quickCreate.query,
        order: Math.max(0, ...leadStatuses.map((s) => s.order ?? 0)) + 1,
      }}
    />
    </>
  );
}

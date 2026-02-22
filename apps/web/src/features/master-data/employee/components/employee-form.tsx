"use client";

import { Controller } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Employee, ContractStatus, Gender, PTKPStatus } from "../types";
import { ButtonLoading } from "@/components/loading";
import { useEmployeeForm, CONTRACT_STATUS_OPTIONS, GENDER_OPTIONS, PTKP_OPTIONS } from "../hooks/use-employee-form";

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeForm({ open, onOpenChange, employee }: EmployeeFormProps) {
  const {
    form,
    t,
    isEditing,
    isPending,
    areaAssignments,
    selectedAreaId,
    setSelectedAreaId,
    divisions,
    positions,
    companies,
    availableUsers,
    unassignedAreas,
    handleAddArea,
    handleRemoveArea,
    handleToggleSupervisor,
    getAreaName,
    onSubmit,
  } = useEmployeeForm({ open, onClose: () => onOpenChange(false), employee });

  const { register, watch, control, formState: { errors } } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="cursor-pointer">{t("tabs.basic")}</TabsTrigger>
              <TabsTrigger value="employment" className="cursor-pointer">{t("tabs.employment")}</TabsTrigger>
              <TabsTrigger value="contract" className="cursor-pointer">{t("tabs.contract")}</TabsTrigger>
              <TabsTrigger value="areas" className="cursor-pointer">{t("tabs.areas")}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.employeeCode")} *</FieldLabel>
                  <Input placeholder={t("form.employeeCodePlaceholder")} {...register("employee_code")} />
                  {errors.employee_code && <FieldError>{errors.employee_code.message}</FieldError>}
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.name")} *</FieldLabel>
                  <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.email")}</FieldLabel>
                  <Input type="email" placeholder={t("form.emailPlaceholder")} {...register("email")} />
                  {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.phone")}</FieldLabel>
                  <Input placeholder={t("form.phonePlaceholder")} {...register("phone")} />
                </Field>
              </div>

              {/* User account link */}
              <Field orientation="vertical">
                <FieldLabel>{t("form.user")}</FieldLabel>
                <Controller
                  control={control}
                  name="user_id"
                  render={({ field }) => {
                    
                    return (
                      <Select
                        value={field.value || ""}
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.userPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("form.noUser")}</SelectItem>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("form.userHint")}</p>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.gender")}</FieldLabel>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={(v) => field.onChange(v as Gender)}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.genderPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {t(`form.gender${g.charAt(0).toUpperCase() + g.slice(1)}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.dateOfBirth")}</FieldLabel>
                  <Controller
                    control={control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value instanceof Date ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t("form.selectDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            month={field.value instanceof Date ? field.value : undefined}
                            selected={field.value instanceof Date ? field.value : undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("form.address")}</FieldLabel>
                <Textarea placeholder={t("form.addressPlaceholder")} {...register("address")} />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.nik")}</FieldLabel>
                  <Input placeholder={t("form.nikPlaceholder")} {...register("nik")} />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.npwp")}</FieldLabel>
                  <Input placeholder={t("form.npwpPlaceholder")} {...register("npwp")} />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.bpjs")}</FieldLabel>
                  <Input placeholder={t("form.bpjsPlaceholder")} {...register("bpjs")} />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.division")}</FieldLabel>
                  <Controller
                    control={control}
                    name="division_id"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.divisionPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.jobPosition")}</FieldLabel>
                  <Controller
                    control={control}
                    name="job_position_id"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.jobPositionPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
              </div>
              <Field orientation="vertical">
                <FieldLabel>{t("form.company")}</FieldLabel>
                <Controller
                  control={control}
                  name="company_id"
                  render={({ field }) => {
                    
                    return (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.companyPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    );
                  }}
                />
              </Field>
              <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                <FieldLabel>{t("form.isActive")}</FieldLabel>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
              </Field>
            </TabsContent>

            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.contractStatus")}</FieldLabel>
                  <Controller
                    control={control}
                    name="contract_status"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={(v) => field.onChange(v as ContractStatus)}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.contractStatusPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{t(`contractStatus.${s}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>{t("form.totalLeaveQuota")}</FieldLabel>
                  <Input type="number" min={0} {...register("total_leave_quota")} />
                </Field>
              </div>
              {/* Contract dates only shown for non-permanent contracts */}
              {watch("contract_status") && watch("contract_status") !== "permanent" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contractStartDate")}</FieldLabel>
                    <Controller
                      control={control}
                      name="contract_start_date"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value instanceof Date ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("form.selectDate")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              month={field.value instanceof Date ? field.value : undefined}
                              selected={field.value instanceof Date ? field.value : undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contractEndDate")}</FieldLabel>
                    <Controller
                      control={control}
                      name="contract_end_date"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value instanceof Date ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("form.selectDate")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              month={field.value instanceof Date ? field.value : undefined}
                              selected={field.value instanceof Date ? field.value : undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field orientation="vertical">
                  <FieldLabel>{t("form.ptkpStatus")}</FieldLabel>
                  <Controller
                    control={control}
                    name="ptkp_status"
                    render={({ field }) => {
                      
                      return (
                        <Select
                          value={field.value || ""}
                          onValueChange={(v) => field.onChange(v as PTKPStatus)}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.ptkpStatusPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {PTKP_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      );
                    }}
                  />
                </Field>
                <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
                  <FieldLabel>{t("form.isDisability")}</FieldLabel>
                  <Controller
                    control={control}
                    name="is_disability"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="cursor-pointer"
                      />
                    )}
                  />
                </Field>
              </div>
            </TabsContent>

            {/* Areas tab */}
            <TabsContent value="areas" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">{t("form.areasDescription")}</p>

              {/* Add area row */}
              <div className="flex gap-2">
                <Select
                  value={selectedAreaId}
                  onValueChange={setSelectedAreaId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("form.selectArea")} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddArea}
                  disabled={!selectedAreaId}
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Assigned areas list */}
              {areaAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t("form.noAreasAssigned")}
                </div>
              ) : (
                <div className="space-y-2">
                  {areaAssignments.map((assignment) => (
                    <div
                      key={assignment.area_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {assignment.is_supervisor ? (
                          <Shield className="h-4 w-4 text-amber-500" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {getAreaName(assignment.area_id)}
                        </span>
                        <Badge variant={assignment.is_supervisor ? "warning" : "secondary"}>
                          {assignment.is_supervisor ? t("form.supervisor") : t("form.member")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSupervisor(assignment.area_id)}
                          className="cursor-pointer text-xs"
                        >
                          {assignment.is_supervisor ? t("form.setMember") : t("form.setSupervisor")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveArea(assignment.area_id)}
                          className="cursor-pointer text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              <ButtonLoading loading={isPending} loadingText={t("actions.saving") || "Saving..."}>
                {t("actions.save")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

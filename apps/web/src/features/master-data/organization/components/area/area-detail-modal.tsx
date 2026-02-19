"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  Mail,
  Building2,
  Briefcase,
  UserMinus,
  UserPlus,
  Users,
  Shield,
  Info,
  Hash,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Separator } from "@/components/ui/separator";

import { useAreaDetail, useRemoveAreaEmployee } from "../../hooks/use-areas";
import type { EmployeeInAreaResponse } from "../../types";

interface AreaDetailModalProps {
  areaId: string;
  areaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignSupervisor: () => void;
  onAssignMembers: () => void;
}

export function AreaDetailModal({
  areaId,
  areaName,
  open,
  onOpenChange,
  onAssignSupervisor,
  onAssignMembers,
}: AreaDetailModalProps) {
  const t = useTranslations("organization.area");
  const { data, isLoading } = useAreaDetail(areaId);
  const removeEmployee = useRemoveAreaEmployee();

  const [removeTarget, setRemoveTarget] = useState<{
    employee: EmployeeInAreaResponse;
    isSupervisor: boolean;
  } | null>(null);

  const area = data?.data;

  const handleRemoveEmployee = useCallback(() => {
    if (!removeTarget) return;

    removeEmployee.mutate(
      { areaId, employeeId: removeTarget.employee.id },
      {
        onSuccess: () => {
          toast.success(t("remove.success"));
          setRemoveTarget(null);
        },
      }
    );
  }, [removeTarget, removeEmployee, areaId, t]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {areaName}
              {area && (
                <Badge variant={area.is_active ? "active" : "inactive"}>
                  {area.is_active ? t("form.isActive") : t("form.isActive")}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <DetailSkeleton />
          ) : area ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info" className="gap-1.5">
                  <Info className="size-3.5" />
                  {t("detail.info")}
                </TabsTrigger>
                <TabsTrigger value="supervisors" className="gap-1.5">
                  <Shield className="size-3.5" />
                  {t("detail.supervisors")} ({area.supervisor_count})
                </TabsTrigger>
                <TabsTrigger value="members" className="gap-1.5">
                  <Users className="size-3.5" />
                  {t("detail.members")} ({area.member_count})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <InfoTab area={area} t={t} />
              </TabsContent>

              <TabsContent value="supervisors" className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {t("detail.supervisorCount", {
                      count: area.supervisor_count,
                    })}
                  </p>
                  <Button
                    size="sm"
                    onClick={onAssignSupervisor}
                    className="cursor-pointer"
                  >
                    <UserPlus className="size-4 mr-1.5" />
                    {t("assign.supervisor")}
                  </Button>
                </div>

                {area.supervisors.length === 0 ? (
                  <EmptyState
                    icon={<AlertTriangle className="size-10 text-amber-500" />}
                    message={t("detail.noSupervisorWarning")}
                  />
                ) : (
                  <EmployeeList
                    employees={area.supervisors}
                    isSupervisor
                    t={t}
                    onRemove={(emp) =>
                      setRemoveTarget({ employee: emp, isSupervisor: true })
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="members" className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {t("detail.memberCount", { count: area.member_count })}
                  </p>
                  <Button
                    size="sm"
                    onClick={onAssignMembers}
                    className="cursor-pointer"
                  >
                    <UserPlus className="size-4 mr-1.5" />
                    {t("assign.members")}
                  </Button>
                </div>

                {area.members.length === 0 ? (
                  <EmptyState
                    icon={<AlertTriangle className="size-10 text-amber-500" />}
                    message={t("detail.noMembersWarning")}
                  />
                ) : (
                  <EmployeeList
                    employees={area.members}
                    isSupervisor={false}
                    t={t}
                    onRemove={(emp) =>
                      setRemoveTarget({ employee: emp, isSupervisor: false })
                    }
                  />
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={t("remove.confirmTitle")}
        description={
          removeTarget?.isSupervisor
            ? t("remove.confirmSupervisor", {
                name: removeTarget.employee.name,
              })
            : t("remove.confirmMember", {
                name: removeTarget?.employee.name ?? "",
              })
        }
        onConfirm={handleRemoveEmployee}
        isLoading={removeEmployee.isPending}
      />
    </>
  );
}

// -- Sub-components --

function InfoTab({
  area,
  t,
}: {
  area: {
    name: string;
    description?: string;
    is_active: boolean;
    supervisor_count: number;
    member_count: number;
    created_at: string;
    updated_at: string;
  };
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-3">
      <InfoRow label={t("form.name")} value={area.name} />
      <InfoRow
        label={t("form.description")}
        value={area.description || "-"}
      />
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Shield className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">
              {t("detail.supervisors")}
            </p>
            <p className="text-lg font-semibold">{area.supervisor_count}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Users className="size-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">
              {t("detail.members")}
            </p>
            <p className="text-lg font-semibold">{area.member_count}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

function EmployeeList({
  employees,
  isSupervisor,
  t,
  onRemove,
}: {
  employees: EmployeeInAreaResponse[];
  isSupervisor: boolean;
  t: ReturnType<typeof useTranslations>;
  onRemove: (emp: EmployeeInAreaResponse) => void;
}) {
  return (
    <ScrollArea className="max-h-[350px]">
      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {emp.name}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  <Hash className="size-3 mr-0.5" />
                  {emp.employee_code}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {emp.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="size-3 shrink-0" />
                    {emp.email}
                  </span>
                )}
                {emp.division_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3 shrink-0" />
                    {emp.division_name}
                  </span>
                )}
                {emp.job_position && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="size-3 shrink-0" />
                    {emp.job_position}
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => onRemove(emp)}
            >
              <UserMinus className="size-4 mr-1" />
              {isSupervisor ? t("remove.supervisor") : t("remove.member")}
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {icon}
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

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
  Hash,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

import { useAreaDetail, useRemoveAreaEmployee } from "../../hooks/use-areas";
import { useUserPermission } from "@/hooks/use-user-permission";
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
  const canCreate = useUserPermission("area.create");
  const canAssignSupervisor = useUserPermission("area.assign_supervisor");
  const canAssignMember = useUserPermission("area.assign_member");
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
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{areaName}</DialogTitle>
                <div className="flex items-center gap-3">
                  {area && (
                    <Badge variant={area.is_active ? "default" : "inactive"} className="text-xs font-medium">
                      {area.is_active ? t("form.isActive") : t("form.isActive")}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4 shrink-0" />
                    {area?.supervisor_count ?? 0} {t("detail.supervisors")}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    {area?.member_count ?? 0} {t("detail.members")}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : area ? (
            <div className="space-y-6 py-4">
              {/* General Info Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-48">{t("form.name")}</TableCell>
                      <TableCell>{area.name}</TableCell>
                      <TableCell className="font-medium bg-muted/50 w-48">Created At</TableCell>
                      <TableCell>
                        {area.created_at ? formatDate(area.created_at) : "-"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("form.description")}</TableCell>
                      <TableCell colSpan={3}>{area.description || "-"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Supervisors */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{t("detail.supervisors")} ({area.supervisor_count})</h3>
                  {canCreate && canAssignSupervisor && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onAssignSupervisor}
                      className="cursor-pointer"
                    >
                      <UserPlus className="size-4 mr-2" />
                      {t("assign.supervisor")}
                    </Button>
                  )}
                </div>
                {area.supervisors.length === 0 ? (
                  <div className="border rounded-lg py-8 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="size-8 text-warning mb-2" />
                    <p className="text-sm text-muted-foreground">{t("detail.noSupervisorWarning")}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {area.supervisors.map(emp => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {emp.email ? (
                                <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-primary text-sm hover:underline cursor-pointer">
                                  <Mail className="size-3" />
                                  {emp.email}
                                </a>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              <div className="flex flex-col gap-1">
                                {emp.job_position ? (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="size-3" />
                                    {emp.job_position}
                                  </span>
                                ) : null}
                                {emp.division_name ? (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="size-3" />
                                    {emp.division_name}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => setRemoveTarget({ employee: emp, isSupervisor: true })}
                                title={t("remove.supervisor")}
                              >
                                <UserMinus className="size-4 mr-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{t("detail.members")} ({area.member_count})</h3>
                  {canCreate && canAssignMember && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onAssignMembers}
                      className="cursor-pointer"
                    >
                      <UserPlus className="size-4 mr-2" />
                      {t("assign.members")}
                    </Button>
                  )}
                </div>
                {area.members.length === 0 ? (
                  <div className="border rounded-lg py-8 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="size-8 text-warning mb-2" />
                    <p className="text-sm text-muted-foreground">{t("detail.noMembersWarning")}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {area.members.map(emp => (
                          <TableRow key={emp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {emp.email ? (
                                <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-primary text-sm hover:underline cursor-pointer">
                                  <Mail className="size-3" />
                                  {emp.email}
                                </a>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              <div className="flex flex-col gap-1">
                                {emp.job_position ? (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="size-3" />
                                    {emp.job_position}
                                  </span>
                                ) : null}
                                {emp.division_name ? (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="size-3" />
                                    {emp.division_name}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => setRemoveTarget({ employee: emp, isSupervisor: false })}
                                title={t("remove.member")}
                              >
                                <UserMinus className="size-4 mr-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
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

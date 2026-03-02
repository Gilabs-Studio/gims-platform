"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Search, Check, Hash, Building2, Briefcase } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

import { employeeService } from "@/features/master-data/employee/services/employee-service";
import type { Employee } from "@/features/master-data/employee/types";
import type { EmployeeInAreaResponse } from "../../types";

type AssignRole = "supervisor" | "member";

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaName: string;
  role: AssignRole;
  /** Employees already assigned to this area (to disable re-selection) */
  existingEmployees: EmployeeInAreaResponse[];
  onAssign: (employeeIds: string[]) => void;
  isAssigning: boolean;
}

export function AssignEmployeeDialog({
  open,
  onOpenChange,
  areaName,
  role,
  existingEmployees,
  onAssign,
  isAssigning,
}: AssignEmployeeDialogProps) {
  const t = useTranslations("organization.area");

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);

  const existingIdSet = useMemo(
    () => new Set(existingEmployees.map((e) => e.id)),
    [existingEmployees]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["employees", "assign-area", debouncedSearch],
    queryFn: () =>
      employeeService.list({
        search: debouncedSearch || undefined,
        per_page: 50,
        is_active: true,
      }),
    enabled: open,
  });

  const employees = data?.data ?? [];

  const toggleEmployee = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAssign = useCallback(() => {
    onAssign(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSearch("");
  }, [selectedIds, onAssign]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        setSelectedIds(new Set());
        setSearch("");
      }
      onOpenChange(value);
    },
    [onOpenChange]
  );

  const dialogTitle =
    role === "supervisor"
      ? t("assign.supervisorTitle", { area: areaName })
      : t("assign.membersTitle", { area: areaName });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("assign.searchEmployees")}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[350px] -mx-1 px-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              {t("assign.noEmployees")}
            </div>
          ) : (
            <div className="space-y-1">
              {employees.map((emp) => {
                const isExisting = existingIdSet.has(emp.id);
                const isSelected = selectedIds.has(emp.id);

                return (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    isExisting={isExisting}
                    isSelected={isSelected}
                    onToggle={toggleEmployee}
                    alreadyAssignedLabel={t("assign.alreadyAssigned")}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {t("assign.selectedCount", { count: selectedIds.size })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="cursor-pointer"
            >
              {t("assign.searchEmployees").includes("Cari")
                ? "Batal"
                : "Cancel"}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedIds.size === 0 || isAssigning}
              className="cursor-pointer"
            >
              {isAssigning
                ? "..."
                : t("assign.assignButton", { count: selectedIds.size })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Sub-component --

function EmployeeRow({
  employee,
  isExisting,
  isSelected,
  onToggle,
  alreadyAssignedLabel,
}: {
  employee: Employee;
  isExisting: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
  alreadyAssignedLabel: string;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
        isExisting
          ? "opacity-50 cursor-not-allowed bg-muted/30"
          : isSelected
            ? "border-primary bg-primary/5"
            : "hover:bg-muted/50"
      }`}
    >
      <Checkbox
        checked={isExisting || isSelected}
        onCheckedChange={() => !isExisting && onToggle(employee.id)}
        disabled={isExisting}
        className="cursor-pointer"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{employee.name}</span>
          <Badge variant="outline" className="shrink-0 text-xs">
            <Hash className="size-3 mr-0.5" />
            {employee.employee_code}
          </Badge>
          {isExisting && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              <Check className="size-3 mr-0.5" />
              {alreadyAssignedLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {employee.division?.name && (
            <span className="flex items-center gap-1">
              <Building2 className="size-3" />
              {employee.division.name}
            </span>
          )}
          {employee.job_position?.name && (
            <span className="flex items-center gap-1">
              <Briefcase className="size-3" />
              {employee.job_position.name}
            </span>
          )}
        </div>
      </div>
    </label>
  );
}

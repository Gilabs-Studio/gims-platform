"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { useTranslations } from "next-intl";
import type { Role } from "../types";

interface UserListMobileFiltersProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly status: string;
  readonly roleId: string;
  readonly roles: Role[];
  readonly onStatusChange: (value: string) => void;
  readonly onRoleChange: (value: string) => void;
  readonly onReset: () => void;
}

export function UserListMobileFilters({
  open,
  onOpenChange,
  status,
  roleId,
  roles,
  onStatusChange,
  onRoleChange,
  onReset,
}: UserListMobileFiltersProps) {
  const t = useTranslations("userManagement.list");

  const hasActiveFilters = status !== "" || roleId !== "";

  const handleStatusChange = (value: string) => {
    onStatusChange(value === "all" ? "" : value);
  };

  const handleRoleChange = (value: string) => {
    onRoleChange(value === "all" ? "" : value);
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      title={t("filterTitle")}
      description={t("filterDescription")}
      resizable={false}
    >
      <div className="space-y-6">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label>{t("status")}</Label>
          <Select value={status || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatus")}</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Role Filter */}
        <div className="space-y-2">
          <Label>{t("role")}</Label>
          <Select value={roleId || "all"} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("allRoles")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allRoles")}</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Badge */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {t("activeFilters")}
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {status && (
                <Badge variant="secondary" className="gap-1">
                  {t("status")}: {status === "active" ? "Active" : "Inactive"}
                  <button
                    onClick={() => onStatusChange("")}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
                    aria-label="Remove status filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {roleId && (
                <Badge variant="secondary" className="gap-1">
                  {t("role")}: {roles.find((r) => r.id === roleId)?.name ?? "N/A"}
                  <button
                    onClick={() => onRoleChange("")}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
                    aria-label="Remove role filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            {t("resetFilters")}
          </Button>
          <Button onClick={handleApply} className="flex-1">
            {t("applyFilters")}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}


"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCsvValidationStore } from "../stores/use-csv-validation-store";

export function SystemValidationFilters() {
  const t = useTranslations("manufacturingCsvValidation");

  const {
    searchQuery,
    setSearchQuery,
    selectedModule,
    setSelectedModule,
    selectedDataType,
    setSelectedDataType,
    selectedAction,
    setSelectedAction,
    selectedUser,
    setSelectedUser,
    resetFilters,
  } = useCsvValidationStore();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Modules Select */}
      <Select value={selectedModule} onValueChange={setSelectedModule}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={t("allModules")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allModules")}</SelectItem>
          <SelectItem value="work_order">{t("modules.work_order")}</SelectItem>
          <SelectItem value="quality_andon">{t("modules.quality_andon")}</SelectItem>
          <SelectItem value="quality_check">{t("modules.quality_check")}</SelectItem>
          <SelectItem value="maintenance">{t("modules.maintenance")}</SelectItem>
          <SelectItem value="user_access">{t("modules.user_access")}</SelectItem>
          <SelectItem value="machine_telemetry">{t("modules.machine_telemetry")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Data Types Select */}
      <Select value={selectedDataType} onValueChange={setSelectedDataType}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={t("allDataTypes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allDataTypes")}</SelectItem>
          <SelectItem value="status">{t("dataTypes.status")}</SelectItem>
          <SelectItem value="alarm_status">{t("dataTypes.alarm_status")}</SelectItem>
          <SelectItem value="assigned_to">{t("dataTypes.assigned_to")}</SelectItem>
          <SelectItem value="inspection_result">{t("dataTypes.inspection_result")}</SelectItem>
          <SelectItem value="work_request_status">{t("dataTypes.work_request_status")}</SelectItem>
          <SelectItem value="login">{t("dataTypes.login")}</SelectItem>
          <SelectItem value="parameter">{t("dataTypes.parameter")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Actions Select */}
      <Select value={selectedAction} onValueChange={setSelectedAction}>
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <SelectValue placeholder={t("allActions")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allActions")}</SelectItem>
          <SelectItem value="update">{t("actions.update")}</SelectItem>
          <SelectItem value="login">{t("actions.login")}</SelectItem>
          <SelectItem value="create">{t("actions.create")}</SelectItem>
          <SelectItem value="delete">{t("actions.delete")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Users Select */}
      <Select value={selectedUser} onValueChange={setSelectedUser}>
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <SelectValue placeholder={t("allUsers")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allUsers")}</SelectItem>
          <SelectItem value="Rian Hidayat">Rian Hidayat</SelectItem>
          <SelectItem value="Aris Munandar">Aris Munandar</SelectItem>
          <SelectItem value="Bambang Kurnia">Bambang Kurnia</SelectItem>
          <SelectItem value="Dewi Lestari">Dewi Lestari</SelectItem>
          <SelectItem value="Suryadi">Suryadi</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={resetFilters}
        className="h-9 px-3 text-xs cursor-pointer"
      >
        {t("reset")}
      </Button>
    </div>
  );
}

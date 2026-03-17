"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Wrench, Package, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

import { MaintenanceDashboard } from "./maintenance-dashboard";
import { MaintenanceScheduleList } from "./maintenance-schedule-list";
import { WorkOrderList } from "./work-order-list";
import { SparePartList } from "./spare-part-list";
import { ScheduleForm } from "./schedule-form";
import { WorkOrderForm } from "./work-order-form";
import { SparePartForm } from "./spare-part-form";
import type { MaintenanceSchedule, WorkOrder, SparePart } from "../types";

type TabValue = "dashboard" | "schedules" | "workOrders" | "spareParts";

interface TabItem {
  value: TabValue;
  label: string;
  icon: React.ElementType;
}

export function AssetMaintenancePage() {
  const t = useTranslations("assetMaintenance");
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");

  // Schedule Form State
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleFormMode, setScheduleFormMode] = useState<"create" | "edit">("create");
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);

  // Work Order Form State
  const [workOrderFormOpen, setWorkOrderFormOpen] = useState(false);
  const [workOrderFormMode, setWorkOrderFormMode] = useState<"create" | "edit">("create");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Spare Part Form State
  const [sparePartFormOpen, setSparePartFormOpen] = useState(false);
  const [sparePartFormMode, setSparePartFormMode] = useState<"create" | "edit">("create");
  const [selectedSparePart, setSelectedSparePart] = useState<SparePart | null>(null);

  const tabs: TabItem[] = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "schedules", label: t("schedules.title"), icon: Calendar },
    { value: "workOrders", label: t("workOrders.title"), icon: Wrench },
    { value: "spareParts", label: t("spareParts.title"), icon: Package },
  ];

  // Schedule Handlers
  const handleCreateSchedule = () => {
    setScheduleFormMode("create");
    setSelectedSchedule(null);
    setScheduleFormOpen(true);
  };

  const handleEditSchedule = (schedule: MaintenanceSchedule) => {
    setScheduleFormMode("edit");
    setSelectedSchedule(schedule);
    setScheduleFormOpen(true);
  };

  // Work Order Handlers
  const handleCreateWorkOrder = () => {
    setWorkOrderFormMode("create");
    setSelectedWorkOrder(null);
    setWorkOrderFormOpen(true);
  };

  const handleEditWorkOrder = (workOrder: WorkOrder) => {
    setWorkOrderFormMode("edit");
    setSelectedWorkOrder(workOrder);
    setWorkOrderFormOpen(true);
  };

  // Spare Part Handlers
  const handleCreateSparePart = () => {
    setSparePartFormMode("create");
    setSelectedSparePart(null);
    setSparePartFormOpen(true);
  };

  const handleEditSparePart = (sparePart: SparePart) => {
    setSparePartFormMode("edit");
    setSelectedSparePart(sparePart);
    setSparePartFormOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Custom Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-hide" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px]",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/25"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "dashboard" && <MaintenanceDashboard />}
        {activeTab === "schedules" && (
          <MaintenanceScheduleList
            onCreate={handleCreateSchedule}
            onEdit={handleEditSchedule}
          />
        )}
        {activeTab === "workOrders" && (
          <WorkOrderList
            onCreate={handleCreateWorkOrder}
            onEdit={handleEditWorkOrder}
          />
        )}
        {activeTab === "spareParts" && (
          <SparePartList
            onCreate={handleCreateSparePart}
            onEdit={handleEditSparePart}
          />
        )}
      </div>

      {/* Forms */}
      <ScheduleForm
        open={scheduleFormOpen}
        onOpenChange={setScheduleFormOpen}
        mode={scheduleFormMode}
        schedule={selectedSchedule}
      />

      <WorkOrderForm
        open={workOrderFormOpen}
        onOpenChange={setWorkOrderFormOpen}
        mode={workOrderFormMode}
        workOrder={selectedWorkOrder}
      />

      <SparePartForm
        open={sparePartFormOpen}
        onOpenChange={setSparePartFormOpen}
        mode={sparePartFormMode}
        sparePart={selectedSparePart}
      />
    </div>
  );
}

export default AssetMaintenancePage;

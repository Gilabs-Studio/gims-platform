"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Download, LayoutDashboard, RotateCcw, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageMotion } from "@/components/motion/page-motion";
import type { DateRange } from "react-day-picker";
import { useDashboard, useDashboardLayout, useSaveLayout } from "../hooks/use-dashboard";
import { useDashboardStore } from "../stores/useDashboardStore";
import { SortableWidget } from "./sortable-widget";
import { WidgetRenderer } from "./widget-renderer";
import { WidgetPicker } from "./widget-picker";
import { WIDGET_REGISTRY } from "../config/widget-registry";
import type { WidgetType } from "../types";

export function DashboardGrid() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboard();
  const { data: layoutData } = useDashboardLayout();
  const { mutate: saveLayout, isPending: isSaving } = useSaveLayout();

  const {
    widgets,
    isEditMode,
    dateFilter,
    setWidgets,
    reorderWidgets,
    removeWidget,
    resizeWidget,
    addWidget,
    resetLayout,
    toggleEditMode,
    setDateFilter,
  } = useDashboardStore();

  // Sync layout from DB into store once loaded
  useEffect(() => {
    if (layoutData && layoutData.length > 0) {
      setWidgets(layoutData);
    }
  }, [layoutData, setWidgets]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorderWidgets(String(active.id), String(over.id));
      }
    },
    [reorderWidgets],
  );

  const handleDateChange = useCallback(
    (range: DateRange | undefined) => {
      setDateFilter({
        from: range?.from?.toISOString()?.slice(0, 10) ?? null,
        to: range?.to?.toISOString()?.slice(0, 10) ?? null,
      });
    },
    [setDateFilter],
  );

  const handleSaveAndExit = useCallback(() => {
    saveLayout(widgets);
    toggleEditMode();
  }, [saveLayout, widgets, toggleEditMode]);

  const handleReset = useCallback(() => {
    resetLayout();
    saveLayout([]);
  }, [resetLayout, saveLayout]);

  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const registry = WIDGET_REGISTRY[type];
      if (!registry) return;
      addWidget({
        id: `w-${Date.now()}`,
        type,
        title: "",
        size: registry.defaultSize,
        order: widgets.length,
        visible: true,
      });
    },
    [addWidget, widgets.length],
  );

  const dateRange: DateRange | undefined =
    dateFilter.from || dateFilter.to
      ? {
          from: dateFilter.from ? new Date(dateFilter.from) : undefined,
          to: dateFilter.to ? new Date(dateFilter.to) : undefined,
        }
      : undefined;

  const visibleWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <PageMotion>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t("title")}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {!isEditMode && (
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={handleDateChange}
              />
            )}
            {isEditMode ? (
              <>
                <WidgetPicker
                  existingWidgets={widgets}
                  onAddWidget={handleAddWidget}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("resetLayout")}
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={handleSaveAndExit}
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4" />
                  {isSaving ? t("loading") : t("doneEditing")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1.5"
                  onClick={toggleEditMode}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t("customize")}
                </Button>
                <Button size="sm" className="cursor-pointer gap-1.5">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden lg:inline">{t("download")}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Widget Grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleWidgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleWidgets.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditMode={isEditMode}
                  onRemove={removeWidget}
                  onResize={resizeWidget}
                >
                  <WidgetRenderer
                    widget={widget}
                    data={data}
                    isLoading={isLoading}
                  />
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {visibleWidgets.length === 0 && (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">{t("emptyDashboard")}</p>
          </div>
        )}
      </div>
    </PageMotion>
  );
}

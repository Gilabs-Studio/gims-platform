"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, LayoutIcon, SearchIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useFloorLayouts, useFloorLayoutFormData, useDeleteFloorLayout } from "../hooks/use-floor-layouts";
import { CreateFloorPlanDialog } from "./create-floor-plan-dialog";
import type { FloorPlan, LayoutObject } from "../types";

interface FloorLayoutListProps {
  readonly onOpenEditor: (id: string) => void;
}

export function FloorLayoutList({ onOpenEditor }: FloorLayoutListProps) {
  const t = useTranslations("floorLayout");
  const [search, setSearch] = useState("");
  const [outletFilter, setOutletFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FloorPlan | null>(null);

  const { data: formData } = useFloorLayoutFormData();
  const outlets = formData?.data?.outlets ?? [];

  const params = {
    search: search || undefined,
    outlet_id: outletFilter !== "all" ? outletFilter : undefined,
    per_page: 50,
  };
  const { data, isPending, isError } = useFloorLayouts(params);
  const floorPlans = data?.data ?? [];

  const deleteMutation = useDeleteFloorLayout();

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("messages.deleteSuccess"));
      setDeleteTarget(null);
    } catch {
      toast.error(t("messages.deleteError"));
    }
  }, [deleteTarget, deleteMutation, t]);

  const handleCreateSuccess = useCallback(
    (id: string) => {
      onOpenEditor(id);
    },
    [onOpenEditor],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
          <PlusIcon className="h-4 w-4 mr-1.5" />
          {t("create")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {outlets.length > 1 && (
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-52 cursor-pointer">
              <SelectValue placeholder={t("selectOutlet")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allOutlets")}</SelectItem>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading */}
      {isPending && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Failed to load floor plans. Please try again.
        </div>
      )}

      {/* Empty */}
      {!isPending && !isError && floorPlans.length === 0 && (
        <div className="text-center py-16">
          <LayoutIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      )}

      {/* Floor plan cards */}
      {!isPending && !isError && floorPlans.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {floorPlans.map((fp) => (
            <FloorPlanCard
              key={fp.id}
              floorPlan={fp}
              onOpen={() => onOpenEditor(fp.id)}
              onDelete={() => setDeleteTarget(fp)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateFloorPlanDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted card component for each floor plan
function FloorPlanCard({
  floorPlan,
  onOpen,
  onDelete,
  t,
}: {
  readonly floorPlan: FloorPlan;
  readonly onOpen: () => void;
  readonly onDelete: () => void;
  readonly t: ReturnType<typeof useTranslations>;
}) {
  const objects = useMemo<LayoutObject[]>(() => {
    if (!floorPlan.layout_data) return [];
    try {
      const parsed = JSON.parse(floorPlan.layout_data);
      return Array.isArray(parsed) ? (parsed as LayoutObject[]) : [];
    } catch {
      return [];
    }
  }, [floorPlan.layout_data]);

  const objectCount = objects.length;
  const previewBounds = useMemo(() => {
    if (objects.length === 0) {
      const width = Math.max(1, floorPlan.width || 1200);
      const height = Math.max(1, floorPlan.height || 800);
      return { x: 0, y: 0, width, height };
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const obj of objects) {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width);
      maxY = Math.max(maxY, obj.y + obj.height);
    }

    const padding = 24;
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: Math.max(1, maxX - minX + padding * 2),
      height: Math.max(1, maxY - minY + padding * 2),
    };
  }, [floorPlan.height, floorPlan.width, objects]);

  return (
    <Card className="group h-full hover:border-primary/30 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-0">
        {/* Preview area */}
        <button
          type="button"
          aria-label={t("openEditor")}
          onClick={onOpen}
          className="w-full bg-muted/30 rounded-t-xl cursor-pointer overflow-hidden"
        >
          <div
            className="relative w-full"
            style={{ aspectRatio: `${previewBounds.width} / ${previewBounds.height}` }}
          >
            {objectCount > 0 ? (
              <FloorPlanThumbnail
                floorPlan={floorPlan}
                objects={objects}
                bounds={previewBounds}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <LayoutIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <span className="text-xs text-muted-foreground/50 block">
                  {t("previewEmpty")}
                </span>
              </div>
            )}
            {objectCount > 0 && (
              <div className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                {t("previewObjects", { count: objectCount })}
              </div>
            )}
          </div>
        </button>

        {/* Info */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{floorPlan.name}</h3>
              <p className="text-xs text-muted-foreground">
                {floorPlan.outlet_name ?? floorPlan.company_name ?? "-"}
              </p>
            </div>
            <Badge
              variant={floorPlan.status === "published" ? "success" : "secondary"}
              className="text-[10px] shrink-0"
            >
              {floorPlan.status === "published"
                ? t("statusPublished")
                : t("statusDraft")}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-7 text-xs cursor-pointer"
              onClick={onOpen}
            >
              <PencilIcon className="h-3 w-3 mr-1" />
              {t("openEditor")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FloorPlanThumbnail({
  floorPlan,
  objects,
  bounds,
}: {
  readonly floorPlan: FloorPlan;
  readonly objects: LayoutObject[];
  readonly bounds: { x: number; y: number; width: number; height: number };
}) {
  const tableFillClass = "text-primary/70";
  const chairFillClass = "text-foreground/55";
  const wallFillClass = "text-foreground/75";
  const doorFillClass = "text-primary/55";
  const zoneFillClass = "text-primary/20";
  const cashierFillClass = "text-foreground/65";
  const decorationFillClass = "text-muted-foreground/60";

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={floorPlan.name}
    >
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        className="fill-background"
      />
      {objects.map((obj) => {
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const transform = `rotate(${obj.rotation || 0} ${centerX} ${centerY})`;

        if (obj.type === "table" && obj.tableShape === "circle") {
          return (
            <g key={obj.id} className={tableFillClass} transform={transform}>
              <circle cx={centerX} cy={centerY} r={Math.max(4, Math.min(obj.width, obj.height) / 2)} fill="currentColor" />
            </g>
          );
        }

        const fillClass =
          obj.type === "table"
            ? tableFillClass
            : obj.type === "chair"
              ? chairFillClass
              : obj.type === "wall"
                ? wallFillClass
                : obj.type === "door"
                  ? doorFillClass
                  : obj.type === "zone"
                    ? zoneFillClass
                    : obj.type === "cashier"
                      ? cashierFillClass
                      : decorationFillClass;

        return (
          <g key={obj.id} className={fillClass} transform={transform}>
            <rect
              x={obj.x}
              y={obj.y}
              width={Math.max(2, obj.width)}
              height={Math.max(2, obj.height)}
              rx={obj.type === "chair" ? 3 : 2}
              fill="currentColor"
            />
          </g>
        );
      })}
    </svg>
  );
}

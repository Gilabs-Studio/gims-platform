"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  MapPin, Plus, Search, X, Users, Edit, Trash2, Eye, Shield,
  Menu, AlertTriangle, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { NotificationBadge } from "@/features/notifications/components/notification-badge";
import { useAreas, useDeleteArea } from "../../hooks/use-areas";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Area } from "../../types";
import { AreaForm } from "./area-form";
import { AreaDetailModal } from "./area-detail-modal";
import { AreaMapView } from "./area-map-view";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

export function AreaList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);
  const [detailAreaId, setDetailAreaId] = useState<string | null>(null);

  const t = useTranslations("organization");
  const isMobile = useIsMobile();
  const canCreate = useHasPermission("area.create");
  const canUpdate = useHasPermission("area.update");
  const canDelete = useHasPermission("area.delete");

  const { data: areasData, isLoading } = useAreas({ per_page: 20 });
  const deleteArea = useDeleteArea();
  const areas = areasData?.data ?? [];

  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? a.is_active : !a.is_active);
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.code ?? "").toLowerCase().includes(q) ||
        (a.province ?? "").toLowerCase().includes(q) ||
        (a.manager?.name ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [areas, search, statusFilter]);

  const handleEdit = useCallback((area: Area) => { setEditingArea(area); }, []);
  const handleView = useCallback((area: Area) => { setDetailAreaId(area.id); }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingAreaId) return;
    try {
      await deleteArea.mutateAsync(deletingAreaId);
      setDeletingAreaId(null);
      if (selectedAreaId === deletingAreaId) setSelectedAreaId(null);
      toast.success(t("area.deleteSuccess"));
    } catch {
      // Error handled by api-client
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-background border-r transition-all duration-300 shrink-0",
          isMobile
            ? isSidebarOpen
              ? "absolute inset-y-0 left-0 z-30 w-80 shadow-xl"
              : "absolute inset-y-0 -left-80 z-30 w-80"
            : "w-80"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Link href="/master-data" className="text-muted-foreground hover:text-foreground transition-colors mr-1">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <h1 className="font-semibold text-lg">{t("area.title")}</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBadge />
              <ThemeToggleButton />
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="cursor-pointer">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="px-4 pb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
              {canCreate && (
                <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto cursor-pointer">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("common.create")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Area List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 border-b space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">{t("area.empty")}</p>
              {canCreate && (
                <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("common.create")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="p-4 pb-2 flex items-center justify-between border-b bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {filteredAreas.length}{" "}{filteredAreas.length === 1 ? t("area.singular") : t("area.plural").toLowerCase()}
                </span>
                {statusFilter !== "all" && (
                  <Badge variant="secondary">
                    {statusFilter === "active" ? t("common.active") : t("common.inactive")}
                  </Badge>
                )}
              </div>
              {filteredAreas.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  isSelected={selectedAreaId === area.id}
                  t={t}
                  onClick={() => setSelectedAreaId(area.id)}
                  onView={() => handleView(area)}
                  onEdit={() => handleEdit(area)}
                  onDelete={() => setDeletingAreaId(area.id)}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {isMobile && !isSidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 bg-background shadow-lg cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <AreaMapView
          areas={areas}
          selectedAreaId={selectedAreaId}
          onAreaClick={(area) => setSelectedAreaId(area.id)}
          isLoading={isLoading}
        />
      </div>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Create */}
      <AreaForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {/* Edit */}
      {editingArea && (
        <AreaForm open={!!editingArea} onClose={() => setEditingArea(null)} area={editingArea} />
      )}

      {/* Detail */}
      {detailAreaId && (
        <AreaDetailModal
          areaId={detailAreaId}
          areaName={areas.find((a) => a.id === detailAreaId)?.name ?? ""}
          open={!!detailAreaId}
          onOpenChange={(open) => !open && setDetailAreaId(null)}
          onAssignSupervisor={() => {}}
          onAssignMembers={() => {}}
        />
      )}

      {/* Delete */}
      <DeleteDialog
        open={!!deletingAreaId}
        onOpenChange={(open) => !open && setDeletingAreaId(null)}
        onConfirm={handleDeleteConfirm}
        title={t("area.deleteTitle")}
        description={t("area.deleteConfirm")}
        isLoading={deleteArea.isPending}
      />
    </div>
  );
}

// ── Area Card ──

interface AreaCardProps {
  readonly area: Area;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: ReturnType<typeof useTranslations>;
  readonly onView?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

function AreaCard({ area, isSelected, onClick, t, onView, onEdit, onDelete, canUpdate, canDelete }: AreaCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors pr-24",
        isSelected && "bg-accent border-l-4 border-l-primary",
        !area.is_active && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="rounded-full p-2 shrink-0"
          style={{ backgroundColor: `${area.color ?? "var(--color-primary)"}20` }}
        >
          <MapPin className="h-4 w-4" style={{ color: area.color ?? "var(--color-primary)" }} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm truncate">{area.name}</h4>
            {area.code && (
              <span className="text-xs text-muted-foreground font-mono shrink-0">{area.code}</span>
            )}
          </div>
          {area.province && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {area.province}
            </p>
          )}
          {area.manager && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Shield className="h-3 w-3 shrink-0" />
              {area.manager.name}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={area.is_active ? "default" : "secondary"} className="text-xs">
              {area.is_active ? t("common.active") : t("common.inactive")}
            </Badge>
            {(area.supervisor_count ?? 0) === 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                {t("area.detail.noSupervisor")}
              </span>
            )}
            {(area.member_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {area.member_count}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-lg p-1 border shadow-sm">
        {onView && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={t("common.view")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}
        {canUpdate && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg hover:bg-accent text-warning hover:text-warning transition-colors cursor-pointer"
            title={t("common.edit")}
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-accent text-destructive hover:text-destructive transition-colors cursor-pointer"
            title={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

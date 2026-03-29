"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  MapPin,
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  Clock,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import { useAreaCoverage } from "../hooks/use-area-mapping";
import type { Area } from "@/features/master-data/organization/types";
import type { AreaCoverage } from "../types";
import { AreaMapView } from "@/features/master-data/organization/components/area/area-map-view";
import { formatDate } from "@/lib/utils";

export function AreaMappingContainer() {
  const t = useTranslations("areaMapping");
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const { data: areasData, isLoading: areasLoading } = useAreas({ per_page: 20 });
  const { data: coverageData } = useAreaCoverage();

  const areas = areasData?.data ?? [];
  const coverageList: AreaCoverage[] = useMemo(() => coverageData?.data?.areas ?? [], [coverageData?.data?.areas]);

  // Create lookup map for coverage data by area_id
  const coverageMap = useMemo(() => {
    const map = new Map<string, AreaCoverage>();
    coverageList.forEach((c: AreaCoverage) => map.set(c.area_id, c));
    return map;
  }, [coverageList]);

  // Summary stats
  const totalCaptures = useMemo(
    () => coverageList.reduce((sum: number, c: AreaCoverage) => sum + c.total_captures, 0),
    [coverageList]
  );
  const activeAreas = useMemo(
    () => coverageList.filter((c: AreaCoverage) => c.total_captures > 0).length,
    [coverageList]
  );
  const totalFieldReps = useMemo(
    () => coverageList.reduce((sum: number, c: AreaCoverage) => sum + c.unique_employees, 0),
    [coverageList]
  );

  const handleAreaClick = useCallback((area: Area) => {
    setSelectedArea(area);
  }, []);

  const selectedCoverage = selectedArea
    ? coverageMap.get(selectedArea.id)
    : null;

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        <AreaMapView
          areas={areas}
          selectedAreaId={selectedArea?.id}
          onAreaClick={handleAreaClick}
          isLoading={areasLoading}
        />
      </div>

      {/* Header Card - Top Left */}
      <div className="absolute top-6 left-6 z-30 flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/30 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-medium text-foreground">{t("title")}</h1>
            <p className="text-xs text-muted-foreground">{t("description")}</p>
          </div>
        </motion.div>
      </div>

      {/* Stats Cards - Top Right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-6 right-6 z-30 flex gap-3"
      >
        <StatCard icon={Activity} label={t("stats.captures")} value={totalCaptures} />
        <StatCard icon={MapPin} label={t("stats.activeAreas")} value={activeAreas} />
        <StatCard icon={Users} label={t("stats.fieldReps")} value={totalFieldReps} />
      </motion.div>

      {/* Selected Area Coverage - Bottom Left */}
      <AnimatePresence>
        {selectedArea && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-6 z-30"
          >
            <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/30 p-5 min-w-[320px] max-w-[420px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedArea.color ?? "var(--color-primary)"}20` }}
                  >
                    <MapPin className="w-6 h-6" style={{ color: selectedArea.color ?? "var(--color-primary)" }} />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{selectedArea.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{selectedArea.code}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedArea(null)}
                  className="h-8 w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Coverage Stats */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <BarChart3 className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold text-foreground">
                    {selectedCoverage?.total_captures ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("stats.captures")}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold text-foreground">
                    {selectedCoverage?.unique_employees ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("stats.fieldReps")}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-semibold text-foreground">
                    {selectedCoverage?.total_captures ? "Active" : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("coverage.status")}</p>
                </div>
              </div>

              {/* Last capture */}
              {selectedCoverage?.last_capture_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {t("coverage.lastCapture")}:{" "}
                    {formatDate(selectedCoverage.last_capture_at)}
                  </span>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mt-3">
                {selectedArea.province && (
                  <Badge variant="outline">{selectedArea.province}</Badge>
                )}
                <Badge variant={selectedArea.is_active ? "default" : "secondary"}>
                  {selectedArea.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coverage Legend - Bottom Right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-6 right-6 z-30"
      >
        <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border/30 p-4 min-w-[200px]">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("coverage.title")}</h4>
          <div className="space-y-2">
            {[...coverageList]
              .sort((a: AreaCoverage, b: AreaCoverage) => b.total_captures - a.total_captures)
              .slice(0, 5)
              .map((coverage: AreaCoverage) => (
                <div
                  key={coverage.area_id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground truncate max-w-[120px]">
                    {coverage.area_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {coverage.total_captures}
                  </Badge>
                </div>
              ))}
            {coverageList.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("coverage.noData")}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border/30 p-3 min-w-[100px] text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-primary" />
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

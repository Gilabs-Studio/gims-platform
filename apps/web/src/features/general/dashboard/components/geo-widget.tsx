"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { GeoOverviewData } from "../types";

interface GeoWidgetProps {
  readonly data?: GeoOverviewData;
}

// Color scale from light to dark (7 steps)
const COLOR_SCALE = [
  "#e0f2fe", // lightest
  "#bae6fd",
  "#7dd3fc",
  "#38bdf8",
  "#0ea5e9",
  "#0284c7",
  "#0369a1", // darkest
];

function getColorForValue(value: number, max: number): string {
  if (max === 0) return COLOR_SCALE[0];
  const ratio = value / max;
  const index = Math.min(Math.floor(ratio * COLOR_SCALE.length), COLOR_SCALE.length - 1);
  return COLOR_SCALE[index];
}

export function GeoWidget({ data }: GeoWidgetProps) {
  const t = useTranslations("dashboard");
  const regions = data?.regions ?? [];
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxValue = useMemo(
    () => Math.max(...regions.map((r) => r.value), 1),
    [regions],
  );

  const regionMap = useMemo(() => {
    const map = new Map<string, (typeof regions)[0]>();
    for (const r of regions) {
      map.set(r.name.toUpperCase(), r);
    }
    return map;
  }, [regions]);

  // Load GeoJSON on mount
  useEffect(() => {
    fetch("/geojson/indonesia-provinces-simple.geojson")
      .then((res) => res.json())
      .then((json: GeoJSON.FeatureCollection) => setGeojsonData(json))
      .catch(() => setGeojsonData(null));
  }, []);

  const handleMouseEnter = useCallback((name: string) => {
    setHoveredRegion(name);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null);
  }, []);

  // Aggregate GeoJSON features → province-level summaries for the list
  const provinceList = useMemo(() => {
    if (!geojsonData?.features) return regions;
    // Group geojson features by WADMPR (province)
    const provinces = new Map<string, { count: number }>();
    for (const f of geojsonData.features) {
      const prov = (f.properties?.WADMPR as string) ?? "";
      if (!provinces.has(prov)) provinces.set(prov, { count: 0 });
      const entry = provinces.get(prov);
      if (entry) entry.count++;
    }
    return regions;
  }, [geojsonData, regions]);

  const hoveredData = hoveredRegion
    ? regionMap.get(hoveredRegion.toUpperCase())
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t("widgets.geographic_overview.title")}
          </CardTitle>
          {data?.total_formatted && (
            <span className="text-sm font-semibold text-primary">
              {data.total_formatted}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Map placeholder: use a simplified region grid when no Map lib */}
          <div className="lg:col-span-2">
            <div className="relative rounded-lg border bg-secondary/30 p-4">
              {regions.length === 0 ? (
                <div className="flex h-52 items-center justify-center">
                  <p className="text-sm text-muted-foreground">{t("noData")}</p>
                </div>
              ) : (
                <>
                  {/* Simple choropleth grid */}
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6">
                    {provinceList.map((region) => {
                      const color = getColorForValue(region.value, maxValue);
                      const isHovered =
                        hoveredRegion?.toUpperCase() ===
                        region.name.toUpperCase();
                      return (
                        <div
                          key={region.code || region.name}
                          className="cursor-pointer rounded-md p-2 text-center transition-all"
                          style={{
                            backgroundColor: color,
                            opacity: isHovered ? 1 : 0.85,
                            transform: isHovered ? "scale(1.08)" : "scale(1)",
                            boxShadow: isHovered
                              ? "0 2px 8px rgba(0,0,0,0.15)"
                              : "none",
                          }}
                          onMouseEnter={() => handleMouseEnter(region.name)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <p
                            className="truncate text-[10px] font-medium"
                            style={{
                              color:
                                region.value / maxValue > 0.5 ? "#fff" : "#1e293b",
                            }}
                          >
                            {region.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tooltip on hover */}
                  {hoveredData && (
                    <div className="absolute bottom-2 left-2 rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                      <p className="font-semibold">{hoveredData.name}</p>
                      <p className="text-muted-foreground">
                        {hoveredData.formatted} &middot; {hoveredData.count}{" "}
                        {t("widgets.geographic_overview.entries")}
                      </p>
                    </div>
                  )}

                  {/* Color legend */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{t("widgets.geographic_overview.low")}</span>
                    {COLOR_SCALE.map((c) => (
                      <div
                        key={c}
                        className="h-3 w-5 rounded-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <span>{t("widgets.geographic_overview.high")}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Region list */}
          <div className="max-h-72 space-y-1 overflow-y-auto lg:col-span-1">
            {provinceList
              .sort((a, b) => b.value - a.value)
              .slice(0, 10)
              .map((region, i) => (
                <div
                  key={region.code || region.name}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-secondary"
                  onMouseEnter={() => handleMouseEnter(region.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm">{region.name}</span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {region.formatted}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

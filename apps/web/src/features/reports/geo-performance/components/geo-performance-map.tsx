"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import {
  Layers,
  MapIcon,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Activity,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — leaflet CSS has no type declarations
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection } from "geojson";

import { useGeoPerformance } from "../hooks/use-geo-performance";
import { useGeoPerformanceFormData } from "../hooks/use-geo-performance-form-data";

// -- Map configuration --

type MapStyle = "auto" | "light" | "dark" | "satellite";

const TILE_LAYERS: Record<
  Exclude<MapStyle, "auto">,
  { url: string; attribution: string }
> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
};

const INDONESIA_CENTER: L.LatLngExpression = [-2.5, 118.0];
const DEFAULT_ZOOM = 5;

// Choropleth color scale (light to dark)
const REVENUE_COLORS = [
  "#dcfce7",
  "#86efac",
  "#4ade80",
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#166534",
];
const FREQUENCY_COLORS = [
  "#dbeafe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e3a8a",
];

// -- Helper components --

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(id);
  }, [map]);
  return null;
}

function FitBounds({
  data,
  animate,
}: {
  data: FeatureCollection | null;
  animate: boolean;
}) {
  const map = useMap();
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.features?.length) return;
    const key = data.features.length.toString();
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    try {
      const layer = L.geoJSON(data);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], animate, maxZoom: 14 });
      }
    } catch {
      // Invalid geometry — ignore
    }
  }, [data, map, animate]);

  return null;
}

// -- Utility functions --

// Always renders full number without abbreviations (e.g. Rp 1.500.000 not Rp 1.5jt)
function formatCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function getColorForValue(
  value: number,
  maxValue: number,
  colors: string[]
): string {
  if (maxValue <= 0 || value <= 0) return colors[0];
  const ratio = Math.min(value / maxValue, 1);
  const index = Math.min(
    Math.floor(ratio * (colors.length - 1)),
    colors.length - 1
  );
  return colors[index];
}

function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    .toISOString()
    .split("T")[0];
  return { start, end };
}

// -- Props --

interface GeoPerformanceMapProps {
  readonly className?: string;
}

// -- Main component --

export function GeoPerformanceMap({ className }: GeoPerformanceMapProps) {
  const t = useTranslations("geoPerformanceReport");
  const { resolvedTheme } = useTheme();

  // Filter state
  const defaultDates = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  // DateRange object for the DateRangePicker component
  const dateRange: DateRange | undefined = useMemo(() => ({
    from: new Date(startDate + "T00:00:00"),
    to: new Date(endDate + "T00:00:00"),
  }), [startDate, endDate]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, "yyyy-MM-dd"));
      setEndDate(range.to ? format(range.to, "yyyy-MM-dd") : defaultDates.end);
    }
  };
  const [mode, setMode] = useState<GeoPerformanceMode>("sales_order");
  const [level, setLevel] = useState<GeoPerformanceLevel>("province");
  const [salesRepId, setSalesRepId] = useState<string>("__all__");
  const [metric, setMetric] = useState<GeoPerformanceMetric>("revenue");

  // Map state
  const [mapStyle, setMapStyle] = useState<MapStyle>("auto");
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);

  // Data hooks
  const { summary, areas, isLoading, error } = useGeoPerformance({
    start_date: startDate,
    end_date: endDate,
    mode,
    level,
    sales_rep_id: salesRepId === "__all__" ? undefined : salesRepId,
  });
  const { salesReps } = useGeoPerformanceFormData();

  // Load GeoJSON static file
  useEffect(() => {
    fetch("/geojson/indonesia-provinces-simple.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        setAllFeatures(data.features ?? []);
      })
      .catch(() => {
        // GeoJSON load failure — map will show empty
      });
  }, []);

  // Build lookup from province name -> area metrics
  const areaLookup = useMemo(() => {
    const lookup = new Map<string, GeoPerformanceArea>();
    const normalizeName = (n?: string) =>
      String(n ?? "")
        .toLowerCase()
        .replace(/^kota\s+/, "")
        .replace(/^kabupaten\s+/, "")
        .replace(/\s+/g, " ")
        .trim();

    for (const area of areas) {
      lookup.set(normalizeName(area.area_name), area);
    }
    return lookup;
  }, [areas]);

  // Compute max values for color scaling
  const maxValues = useMemo(() => {
    let maxRevenue = 0;
    let maxOrders = 0;
    for (const area of areas) {
      if (area.total_revenue > maxRevenue) maxRevenue = area.total_revenue;
      if (area.total_orders > maxOrders) maxOrders = area.total_orders;
    }
    return { maxRevenue, maxOrders };
  }, [areas]);

  // Build choropleth FeatureCollection — group features by province and merge
  const choroplethData = useMemo<FeatureCollection | null>(() => {
    if (!allFeatures.length) return null;

    // Group features by selected aggregation level property
    // Level -> GeoJSON property mapping: province -> WADMPR, city -> WADMKK, district -> WADMKC
    const keyProp = level === "city" ? "WADMKK" : level === "district" ? "WADMKC" : "WADMPR";

    const normalizeName = (n?: string) =>
      String(n ?? "")
        .toLowerCase()
        .replace(/^kota\s+/, "")
        .replace(/^kabupaten\s+/, "")
        .replace(/\s+/g, " ")
        .trim();

    const groups = new Map<string, Feature[]>();
    for (const feature of allFeatures) {
      const rawName = String(feature.properties?.[keyProp] ?? "");
      if (!rawName) continue;
      const name = normalizeName(rawName);
      const existing = groups.get(name) ?? [];
      existing.push(feature);
      groups.set(name, existing);
    }

    // Only include features that have performance data for the matching area name
    const features: Feature[] = [];
    for (const [name, feats] of groups) {
      const areaData = areaLookup.get(name);
      if (!areaData) continue;
      for (const f of feats) {
        features.push({
          ...f,
          properties: {
            ...f.properties,
            _areaData: areaData,
            _hasData: true,
          },
        });
      }
    }

    if (!features.length) return null;
    return { type: "FeatureCollection", features };
  }, [allFeatures, areaLookup]);

  // Determine active tile layer
  const activeTile = useMemo(() => {
    if (mapStyle === "auto") {
      return TILE_LAYERS[resolvedTheme === "dark" ? "dark" : "light"];
    }
    return TILE_LAYERS[mapStyle];
  }, [mapStyle, resolvedTheme]);

  // Color palette based on selected metric
  const colorScale = metric === "revenue" ? REVENUE_COLORS : FREQUENCY_COLORS;

  // GeoJSON style callback
  const getStyle = useCallback(
    (feature?: Feature) => {
      const areaData = feature?.properties?._areaData as
        | GeoPerformanceArea
        | undefined;
      if (!areaData) {
        return {
          fillColor: "transparent",
          fillOpacity: 0,
          weight: 0.5,
          color: resolvedTheme === "dark" ? "#374151" : "#d1d5db",
          opacity: 0.3,
        };
      }

      const value =
        metric === "revenue" ? areaData.total_revenue : areaData.total_orders;
      const maxVal =
        metric === "revenue" ? maxValues.maxRevenue : maxValues.maxOrders;
      const fillColor = getColorForValue(value, maxVal, colorScale);

      return {
        fillColor,
        fillOpacity: 0.65,
        weight: 1.5,
        color: resolvedTheme === "dark" ? "#6b7280" : "#9ca3af",
        opacity: 0.8,
      };
    },
    [metric, maxValues, colorScale, resolvedTheme]
  );

  // GeoJSON interaction callbacks
  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const areaData = feature.properties?._areaData as
        | GeoPerformanceArea
        | undefined;
      if (!areaData) return;

      const tooltipContent = `
        <div style="font-family: system-ui; padding: 4px 0;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">${areaData.area_name}</div>
          <div style="display: grid; grid-template-columns: auto auto; gap: 2px 12px; font-size: 12px;">
            <span style="color: #6b7280;">${t("tooltip.totalRevenue")}:</span>
            <span style="font-weight: 500;">${formatCurrency(areaData.total_revenue)}</span>
            <span style="color: #6b7280;">${t("tooltip.totalOrders")}:</span>
            <span style="font-weight: 500;">${areaData.total_orders.toLocaleString("id-ID")}</span>
            <span style="color: #6b7280;">${t("tooltip.avgOrderValue")}:</span>
            <span style="font-weight: 500;">${formatCurrency(areaData.avg_order_value)}</span>
          </div>
        </div>
      `;

      layer.bindTooltip(tooltipContent, {
        sticky: true,
        direction: "top",
        className: "geo-performance-tooltip",
      });

      const pathLayer = layer as L.Path;
      layer.on({
        mouseover: () => {
          pathLayer.setStyle({ fillOpacity: 0.85, weight: 2.5 });
        },
        mouseout: () => {
          pathLayer.setStyle({ fillOpacity: 0.65, weight: 1.5 });
        },
      });
    },
    [t]
  );

  // Unique key to force GeoJSON re-render when data/style changes
  const geoJsonKey = useMemo(
    () => `${metric}-${mode}-${level}-${startDate}-${endDate}-${salesRepId}-${areas.length}`,
    [metric, mode, level, startDate, endDate, salesRepId, areas.length]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      {/* Key Metrics — same pattern as product-detail-page */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("summary.totalRevenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-medium">
                {formatCurrency(summary?.total_revenue ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("summary.totalOrders")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-medium">
                {(summary?.total_orders ?? 0).toLocaleString("id-ID")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("summary.avgOrderValue")}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-medium">
                {formatCurrency(summary?.avg_order_value ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("summary.areasWithData")}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-medium">
                {summary?.areas_with_data ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters + Map */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filter Panel */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t("filters.dateRange")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateRangePicker
              dateRange={dateRange}
              onDateChange={handleDateRangeChange}
            />

            <div className="space-y-2">
              <Label>{t("filters.mode")}</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as GeoPerformanceMode)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_order" className="cursor-pointer">
                    {t("filters.modeOptions.sales_order")}
                  </SelectItem>
                  <SelectItem value="paid_invoice" className="cursor-pointer">
                    {t("filters.modeOptions.paid_invoice")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("filters.level")}</Label>
              <Select
                value={level}
                onValueChange={(v) => setLevel(v as GeoPerformanceLevel)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="province" className="cursor-pointer">
                    {t("filters.levelOptions.province")}
                  </SelectItem>
                  <SelectItem value="city" className="cursor-pointer">
                    {t("filters.levelOptions.city")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("filters.salesRep")}</Label>
              <Select value={salesRepId} onValueChange={setSalesRepId}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={t("filters.allSalesReps")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="cursor-pointer">
                    {t("filters.allSalesReps")}
                  </SelectItem>
                  {salesReps.map((rep) => (
                    <SelectItem
                      key={rep.id}
                      value={rep.id}
                      className="cursor-pointer"
                    >
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("filters.metric")}</Label>
              <Select
                value={metric}
                onValueChange={(v) => setMetric(v as GeoPerformanceMetric)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue" className="cursor-pointer">
                    {t("filters.metricOptions.revenue")}
                  </SelectItem>
                  <SelectItem value="frequency" className="cursor-pointer">
                    {t("filters.metricOptions.frequency")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Legend */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-muted-foreground">
                {metric === "revenue"
                  ? t("filters.metricOptions.revenue")
                  : t("filters.metricOptions.frequency")}
              </Label>
              <div className="flex h-3 w-full overflow-hidden rounded">
                {colorScale.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Container — pure map with border, no Card header */}
        <div className="relative overflow-hidden rounded-lg border">
            {/* Map Style Switcher */}
            <div className="absolute right-3 top-3 z-[1000]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 shadow-md cursor-pointer"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(
                    ["auto", "light", "dark", "satellite"] as MapStyle[]
                  ).map((style) => (
                    <DropdownMenuItem
                      key={style}
                      onClick={() => setMapStyle(style)}
                      className={cn(
                        "cursor-pointer",
                        mapStyle === style && "bg-accent"
                      )}
                    >
                      {t(`mapStyle.${style}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mode Badge */}
            <div className="absolute left-3 top-3 z-[1000]">
              <Badge variant="secondary" className="shadow-md text-xs">
                {mode === "sales_order"
                  ? t("filters.modeOptions.sales_order")
                  : t("filters.modeOptions.paid_invoice")}
              </Badge>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/50">
                <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 shadow-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">{t("map.loading")}</span>
                </div>
              </div>
            )}

            {/* Leaflet Map */}
            <div className="h-[500px] w-full lg:h-[600px]">
              <MapContainer
                center={INDONESIA_CENTER}
                zoom={DEFAULT_ZOOM}
                className="h-full w-full"
                zoomControl={true}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url={activeTile.url}
                  attribution={activeTile.attribution}
                />
                <InvalidateSize />

                {choroplethData && (
                  <>
                    <GeoJSON
                      key={geoJsonKey}
                      data={choroplethData}
                      style={getStyle}
                      onEachFeature={onEachFeature}
                    />
                    <FitBounds data={choroplethData} animate />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Empty State */}
            {!isLoading && !error && areas.length === 0 && (
              <div className="absolute inset-0 z-[998] flex flex-col items-center justify-center bg-background/60">
                <MapIcon className="mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t("map.noData")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t("map.noDataHint")}
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Area Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("table.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : areas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("table.noData")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t("table.rank")}</TableHead>
                    <TableHead>{t("table.areaName")}</TableHead>
                    <TableHead className="text-right">
                      {t("table.totalRevenue")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("table.totalOrders")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("table.avgOrderValue")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.map((area, index) => (
                    <TableRow key={area.area_id}>
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {area.area_name}
                          </span>
                          {area.parent_name && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {area.parent_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(area.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {area.total_orders.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(area.avg_order_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



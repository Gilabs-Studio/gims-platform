"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Users,
  UtensilsCrossed,
  RefreshCw,
  LayoutPanelTop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useLiveTableData } from "../hooks/use-live-table";
import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { LiveTableInfo, LiveTableStatus } from "../types";
import type { POSOrder } from "@/features/pos/terminal/types";

const STATUS_CONFIG: Record<
  LiveTableStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  AVAILABLE: {
    label: "Available",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  SEATED: {
    label: "Occupied",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    icon: Users,
  },
  FOOD_READY: {
    label: "Food Ready",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: UtensilsCrossed,
  },
  WARN_LONG: {
    label: "Long Wait",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
  },
  SERVED: {
    label: "Served",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    icon: CheckCircle2,
  },
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

// ─── Read-Only Floor Layout View ─────────────────────────────────────────────

const TABLE_STATUS_COLORS: Record<
  LiveTableStatus,
  { fill: string; stroke: string; text: string }
> = {
  AVAILABLE: { fill: "#d1fae5", stroke: "#10b981", text: "#065f46" },
  SEATED: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
  FOOD_READY: { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
  WARN_LONG: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  SERVED: { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95" },
};

interface FloorLayoutViewProps {
  objects: LayoutObject[];
  infos: LiveTableInfo[];
  width: number;
  height: number;
  onTableClick: (info: LiveTableInfo) => void;
}

function FloorLayoutView({
  objects,
  infos,
  width,
  height,
  onTableClick,
}: FloorLayoutViewProps) {
  const infoByTableId = useMemo(() => {
    return new Map(infos.map((info) => [info.tableObj.id, info]));
  }, [infos]);

  const objectBounds = useMemo(() => {
    return objects.reduce(
      (acc, obj) => {
        const maxX = obj.x + obj.width;
        const maxY = obj.y + obj.height;
        return {
          maxX: maxX > acc.maxX ? maxX : acc.maxX,
          maxY: maxY > acc.maxY ? maxY : acc.maxY,
        };
      },
      { maxX: 0, maxY: 0 },
    );
  }, [objects]);

  const canvasWidth = Math.max(width, Math.ceil(objectBounds.maxX + 80), 900);
  const canvasHeight = Math.max(height, Math.ceil(objectBounds.maxY + 80), 560);
  const staticObjects = objects.filter((obj) => obj.type !== "table");
  const tableObjects = objects.filter((obj) => obj.type === "table");

  return (
    <div className="rounded-xl border bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950/40 dark:to-slate-900/30 p-3">
      <div className="rounded-lg border bg-background overflow-auto">
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="w-full min-h-[580px] h-auto"
          role="img"
          aria-label="Floor layout live table view"
        >
          <defs>
            <pattern id="live-layout-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                className="text-slate-200 dark:text-slate-700"
              />
            </pattern>
          </defs>

          <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="url(#live-layout-grid)" />

          {staticObjects.map((obj) => {
            const transform = `translate(${obj.x} ${obj.y}) rotate(${obj.rotation} ${obj.width / 2} ${obj.height / 2})`;

            if (obj.type === "wall") {
              return (
                <g key={obj.id} transform={transform}>
                  <rect x={0} y={0} width={obj.width} height={obj.height} fill="#475569" stroke="#334155" strokeWidth={1} rx={1} />
                </g>
              );
            }

            if (obj.type === "zone") {
              const zoneColor = obj.color ?? "#3b82f6";
              return (
                <g key={obj.id} transform={transform}>
                  <rect
                    x={1}
                    y={1}
                    width={Math.max(8, obj.width - 2)}
                    height={Math.max(8, obj.height - 2)}
                    rx={8}
                    fill={zoneColor}
                    fillOpacity={obj.opacity ?? 0.12}
                    stroke={zoneColor}
                    strokeOpacity={0.9}
                    strokeDasharray="7 4"
                  />
                  <text
                    x={obj.width / 2}
                    y={16}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={600}
                    fill={zoneColor}
                    className="select-none pointer-events-none"
                  >
                    {obj.label ?? obj.zoneType ?? "Zone"}
                  </text>
                </g>
              );
            }

            if (obj.type === "door") {
              return (
                <g key={obj.id} transform={transform}>
                  <rect x={0} y={0} width={obj.width} height={obj.height} fill="#fde68a" stroke="#d97706" strokeWidth={1} rx={2} />
                </g>
              );
            }

            if (obj.type === "cashier") {
              return (
                <g key={obj.id} transform={transform}>
                  <rect x={1} y={1} width={obj.width - 2} height={obj.height - 2} rx={4} fill="#dcfce7" stroke="#16a34a" strokeWidth={1.5} />
                  <text
                    x={obj.width / 2}
                    y={obj.height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fontWeight={600}
                    fill="#166534"
                    className="select-none pointer-events-none"
                  >
                    {obj.label ?? "Cashier"}
                  </text>
                </g>
              );
            }

            if (obj.type === "chair") {
              return (
                <g key={obj.id} transform={transform}>
                  <rect x={2} y={2} width={Math.max(8, obj.width - 4)} height={Math.max(8, obj.height - 4)} rx={3} fill="#dbeafe" stroke="#60a5fa" strokeWidth={1.2} />
                </g>
              );
            }

            return (
              <g key={obj.id} transform={transform}>
                <rect x={1} y={1} width={Math.max(8, obj.width - 2)} height={Math.max(8, obj.height - 2)} rx={4} fill="#fce7f3" stroke="#ec4899" strokeWidth={1} strokeDasharray="4 2" />
              </g>
            );
          })}

          {tableObjects.map((obj) => {
            const info = infoByTableId.get(obj.id);
            const status = info?.status ?? "AVAILABLE";
            const statusColor = TABLE_STATUS_COLORS[status];
            const transform = `translate(${obj.x} ${obj.y}) rotate(${obj.rotation} ${obj.width / 2} ${obj.height / 2})`;
            const label = obj.label ?? `T${obj.tableNumber ?? obj.id}`;
            const isCircle = obj.tableShape === "circle";

            return (
              <g
                key={obj.id}
                transform={transform}
                className={cn(info && "cursor-pointer")}
                onClick={() => info && onTableClick(info)}
              >
                {isCircle ? (
                  <>
                    <circle
                      cx={obj.width / 2}
                      cy={obj.height / 2}
                      r={Math.min(obj.width, obj.height) / 2 - 2}
                      fill={statusColor.fill}
                      stroke={statusColor.stroke}
                      strokeWidth={2}
                    />
                    {info?.isOverThreshold && (
                      <circle
                        cx={obj.width / 2}
                        cy={obj.height / 2}
                        r={Math.min(obj.width, obj.height) / 2 + 3}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        className="animate-pulse"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <rect
                      x={1}
                      y={1}
                      width={Math.max(8, obj.width - 2)}
                      height={Math.max(8, obj.height - 2)}
                      rx={6}
                      fill={statusColor.fill}
                      stroke={statusColor.stroke}
                      strokeWidth={2}
                    />
                    {info?.isOverThreshold && (
                      <rect
                        x={-2}
                        y={-2}
                        width={obj.width + 4}
                        height={obj.height + 4}
                        rx={8}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        className="animate-pulse"
                      />
                    )}
                  </>
                )}

                <text
                  x={obj.width / 2}
                  y={obj.height / 2 - (info?.order ? 6 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={700}
                  fill={statusColor.text}
                  className="select-none pointer-events-none"
                >
                  {label}
                </text>

                {info?.order && (
                  <text
                    x={obj.width / 2}
                    y={obj.height / 2 + 9}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fill={statusColor.text}
                    className="select-none pointer-events-none"
                  >
                    #{info.order.order_number}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Order Detail Dialog ──────────────────────────────────────────────────────

interface OrderDetailDialogProps {
  info: LiveTableInfo | null;
  onClose: () => void;
}

function OrderDetailDialog({ info, onClose }: OrderDetailDialogProps) {
  if (!info) return null;
  const cfg = STATUS_CONFIG[info.status];
  const label = info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
  const order: POSOrder | null = info.order;

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{label}</span>
            <Badge className={cn("text-xs", cfg.color, "border", cfg.border, cfg.bg)}>
              {cfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!order ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
            <p className="text-sm">Table is available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className={cn("font-bold text-sm", cfg.color)}>
                  {formatDuration(info.durationSec)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Guests</p>
                <p className="font-bold text-sm">{order.guest_count}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Order</p>
                <p className="font-bold text-sm font-mono truncate">#{order.order_number}</p>
              </div>
            </div>

            {info.isOverThreshold && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>This table has been occupied for over 30 minutes.</span>
              </div>
            )}

            <Separator />

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Order Items
              </p>
              <ScrollArea className="max-h-52">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-muted-foreground w-6 text-right shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="truncate">{item.product_name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            item.status === "SERVED"
                              ? "text-emerald-600 border-emerald-300"
                              : item.status === "PREPARING"
                              ? "text-amber-600 border-amber-300"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between font-semibold text-sm">
              <span>Total</span>
              <span>Rp {order.total_amount.toLocaleString("id-ID")}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Live Table Stats Bar ─────────────────────────────────────────────────────

interface StatsBarProps {
  infos: LiveTableInfo[];
}

function StatsBar({ infos }: StatsBarProps) {
  const total = infos.length;
  const available = infos.filter((i) => i.status === "AVAILABLE").length;
  const occupied = infos.filter((i) => i.status !== "AVAILABLE").length;
  const warnings = infos.filter((i) => i.isOverThreshold).length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <LayoutPanelTop className="h-4 w-4" />
        <span className="font-medium">{total}</span>
        <span>tables</span>
      </div>
      <div className="flex items-center gap-1 text-emerald-600">
        <span className="font-semibold">{available}</span>
        <span className="text-muted-foreground">available</span>
      </div>
      <div className="flex items-center gap-1 text-blue-600">
        <span className="font-semibold">{occupied}</span>
        <span className="text-muted-foreground">occupied</span>
      </div>
      {warnings > 0 && (
        <div className="flex items-center gap-1 text-red-600 font-semibold animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{warnings} long wait</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LiveTablePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outletId = searchParams.get("outlet_id") ?? undefined;
  const outletName = searchParams.get("outlet_name") ?? undefined;
  const floorPlanId = searchParams.get("floor_plan_id") ?? undefined;

  const [selectedInfo, setSelectedInfo] = useState<LiveTableInfo | null>(null);
  const [now, setNow] = useState<number>();

  // Tick every 30s to refresh durations
  useEffect(() => {
    const initialTickId = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(initialTickId);
      clearInterval(id);
    };
  }, []);

  const { plan, liveTableInfos, layoutObjects, isLoading } = useLiveTableData({
    outletId,
    floorPlanId,
    outletName,
    now,
  });

  const handleTableClick = useCallback((info: LiveTableInfo) => {
    if (info.status === "AVAILABLE" && outletId) {
      const tableLabel = info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
      const query = new URLSearchParams();
      query.set("outlet_id", outletId);
      query.set("table_id", info.tableObj.id);
      query.set("table_label", tableLabel);
      router.push(`/pos/fb/terminal?${query.toString()}`);
      return;
    }
    setSelectedInfo(info);
  }, [outletId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading live table view…</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <LayoutPanelTop className="h-12 w-12 text-muted-foreground/20" />
        <p className="font-medium">No floor plan found</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          No published floor plan is associated with this outlet.
        </p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{plan.name}</h1>
            <p className="text-xs text-muted-foreground">
              {outletName ? `${outletName} · Live Table` : "Live Table Management"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatsBar infos={liveTableInfos} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
        {(Object.entries(STATUS_CONFIG) as [LiveTableStatus, typeof STATUS_CONFIG[LiveTableStatus]][]).map(
          ([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs shrink-0">
                <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                <span className="text-muted-foreground">{cfg.label}</span>
              </div>
            );
          }
        )}
        <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Auto-refresh 15s
        </div>
      </div>

      {/* Floor layout view */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {layoutObjects.length === 0 || liveTableInfos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <LayoutPanelTop className="h-10 w-10 opacity-20" />
              <p className="text-sm">No tables found in the floor plan.</p>
            </div>
          ) : (
            <FloorLayoutView
              objects={layoutObjects}
              infos={liveTableInfos}
              width={plan.width ?? 1200}
              height={plan.height ?? 800}
              onTableClick={handleTableClick}
            />
          )}
        </div>
      </ScrollArea>

      {/* Table detail dialog */}
      <OrderDetailDialog info={selectedInfo} onClose={() => setSelectedInfo(null)} />
    </div>
  );
}

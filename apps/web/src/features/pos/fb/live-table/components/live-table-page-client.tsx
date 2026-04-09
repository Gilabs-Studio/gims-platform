"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  LayoutGrid,
  MapPin,
  UtensilsCrossed,
  Users,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { usePOSUIStore } from "@/features/pos/stores/use-pos-ui-store";
import type { LiveTableInfo, LiveTableStatus } from "../types";
import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { POSOrder } from "@/features/pos/terminal/types";

// ─── Status definitions ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LiveTableStatus,
  {
    label: string;
    dot: string;
    card: string;
    text: string;
    icon: React.ElementType;
  }
> = {
  AVAILABLE: {
    label: "Available",
    dot: "bg-emerald-500",
    card: "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  SEATED: {
    label: "Occupied",
    dot: "bg-blue-500",
    card: "border-blue-200/60 bg-blue-50/40 dark:border-blue-800/40 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-400",
    icon: Users,
  },
  FOOD_READY: {
    label: "Food Ready",
    dot: "bg-amber-500",
    card: "border-amber-200/60 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-400",
    icon: UtensilsCrossed,
  },
  WARN_LONG: {
    label: "Long Wait",
    dot: "bg-rose-500 animate-pulse",
    card: "border-rose-200/60 bg-rose-50/40 dark:border-rose-800/40 dark:bg-rose-950/20",
    text: "text-rose-700 dark:text-rose-400",
    icon: AlertTriangle,
  },
  SERVED: {
    label: "Served",
    dot: "bg-violet-500",
    card: "border-violet-200/60 bg-violet-50/40 dark:border-violet-800/40 dark:bg-violet-950/20",
    text: "text-violet-700 dark:text-violet-400",
    icon: CircleDot,
  },
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ─── Table Card ───────────────────────────────────────────────────────────────

interface TableCardProps {
  info: LiveTableInfo;
  onClick: () => void;
}

function TableCard({ info, onClick }: TableCardProps) {
  const cfg = STATUS_CONFIG[info.status];
  const Icon = cfg.icon;
  const label =
    info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-2xl border p-4 text-left",
        "transition-all duration-200 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5",
        "hover:shadow-md active:scale-[0.98] cursor-pointer",
        cfg.card,
      )}
    >
      <span
        className={cn("absolute top-3 right-3 h-2 w-2 rounded-full", cfg.dot)}
      />
      <p className="text-2xl font-bold tracking-tight text-foreground">
        {label}
      </p>
      <div className={cn("mt-1.5 flex items-center gap-1.5 text-xs font-medium", cfg.text)}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{cfg.label}</span>
      </div>
      {info.order ? (
        <div className="mt-3 space-y-0.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatDuration(info.durationSec)}</span>
            {info.isOverThreshold && (
              <AlertTriangle className="h-3 w-3 text-rose-500 ml-0.5" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono truncate">
            #{info.order.order_number}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">Open</p>
      )}
    </button>
  );
}

// ─── Table Grid ───────────────────────────────────────────────────────────────

interface TableGridProps {
  infos: LiveTableInfo[];
  onTableClick: (info: LiveTableInfo) => void;
}

function TableGrid({ infos, onTableClick }: TableGridProps) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-5 sm:p-8">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(160px, 200px))`,
          justifyContent: "center",
          width: "100%",
          maxWidth: 960,
        }}
      >
        {infos.map((info) => (
          <TableCard
            key={info.tableObj.id}
            info={info}
            onClick={() => onTableClick(info)}
          />
        ))}
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
  const Icon = cfg.icon;
  const label = info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
  const order: POSOrder | null = info.order;

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{label}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                cfg.card,
                cfg.text,
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!order ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
            <p className="text-sm">Table is available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className={cn("font-bold text-sm", cfg.text)}>
                  {formatDuration(info.durationSec)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Guests</p>
                <p className="font-bold text-sm">{order.guest_count}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Order</p>
                <p className="font-bold text-sm font-mono truncate">#{order.order_number}</p>
              </div>
            </div>

            {info.isOverThreshold && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Table has been occupied for over 30 minutes.</span>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Items
              </p>
              <ScrollArea className="max-h-52">
                <div className="space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-muted-foreground w-5 text-right shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="truncate">{item.product_name}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0 ml-2 tabular-nums">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div className="flex items-center justify-between font-semibold text-sm">
              <span>Total</span>
              <span className="tabular-nums">Rp {order.total_amount.toLocaleString("id-ID")}</span>
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
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        <span className="font-semibold text-foreground">{total}</span> tables
      </span>
      <span className="text-emerald-600 tabular-nums">
        <span className="font-semibold">{available}</span>
        <span className="text-muted-foreground ml-1">free</span>
      </span>
      <span className="text-blue-600 tabular-nums">
        <span className="font-semibold">{occupied}</span>
        <span className="text-muted-foreground ml-1">occupied</span>
      </span>
      {warnings > 0 && (
        <span className="flex items-center gap-1 text-rose-600 font-semibold animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5" />
          {warnings}
        </span>
      )}
    </div>
  );
}

// ─── SVG fill colors for floor-layout view (raw CSS values, no Tailwind) ────

const STATUS_SVG: Record<
  LiveTableStatus,
  { fill: string; stroke: string; text: string }
> = {
  AVAILABLE: { fill: "#f0fdf4", stroke: "#86efac", text: "#166534" },
  SEATED:    { fill: "#eff6ff", stroke: "#93c5fd", text: "#1d4ed8" },
  FOOD_READY:{ fill: "#fffbeb", stroke: "#fcd34d", text: "#92400e" },
  WARN_LONG: { fill: "#fff1f2", stroke: "#fca5a5", text: "#9f1239" },
  SERVED:    { fill: "#f5f3ff", stroke: "#c4b5fd", text: "#5b21b6" },
};

// ─── Floor Layout View ────────────────────────────────────────────────────────

interface LiveFloorViewProps {
  planWidth: number;
  planHeight: number;
  layoutObjects: LayoutObject[];
  infos: LiveTableInfo[];
  onTableClick: (info: LiveTableInfo) => void;
}

function LiveFloorView({
  planWidth,
  planHeight,
  layoutObjects,
  infos,
  onTableClick,
}: LiveFloorViewProps) {
  const infoByLabel = useMemo(() => {
    const map = new Map<string, LiveTableInfo>();
    for (const info of infos) {
      const label =
        info.tableObj.label ??
        info.tableObj.tableNumber?.toString() ??
        info.tableObj.id;
      map.set(label, info);
    }
    return map;
  }, [infos]);

  const [scale, setScale] = useState(1);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      setScale((prev) => Math.min(3, Math.max(0.3, prev - e.deltaY * 0.001)));
    },
    [],
  );

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-auto p-4">
      {/* Zoom controls */}
      <div className="absolute right-5 top-5 z-10 flex flex-col gap-1">
        <button
          onClick={() => setScale((s) => Math.min(3, +(s + 0.15).toFixed(2)))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-lg leading-none shadow hover:bg-accent"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setScale(1)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-[11px] font-medium shadow hover:bg-accent"
          title="Reset zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.3, +(s - 0.15).toFixed(2)))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-lg leading-none shadow hover:bg-accent"
          title="Zoom out"
        >
          &minus;
        </button>
      </div>

      <div
        className="overflow-auto"
        onWheel={handleWheel}
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      >
        <svg
          viewBox={`0 0 ${planWidth} ${planHeight}`}
          className="rounded-2xl border bg-muted/10"
          style={{
            width: planWidth * scale,
            height: planHeight * scale,
            minWidth: 280,
            transition: "width 0.15s, height 0.15s",
          }}
          preserveAspectRatio="xMidYMid meet"
        >
        {layoutObjects.map((obj) => {
          const transform = `translate(${obj.x}, ${obj.y}) rotate(${obj.rotation ?? 0}, ${obj.width / 2}, ${obj.height / 2})`;

          if (obj.type === "table") {
            const label =
              obj.label ?? obj.tableNumber?.toString() ?? obj.id;
            const info = infoByLabel.get(label);
            const colors = info
              ? STATUS_SVG[info.status]
              : STATUS_SVG.AVAILABLE;
            const isCircle = obj.tableShape === "circle";
            const r = Math.min(obj.width, obj.height) / 2;

            return (
              <g
                key={obj.id}
                transform={transform}
                onClick={() => info && onTableClick(info)}
                style={{ cursor: info ? "pointer" : "default" }}
              >
                {isCircle ? (
                  <circle
                    cx={obj.width / 2}
                    cy={obj.height / 2}
                    r={r - 2}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={2}
                  />
                ) : (
                  <rect
                    x={1}
                    y={1}
                    width={obj.width - 2}
                    height={obj.height - 2}
                    rx={6}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={2}
                  />
                )}
                <text
                  x={obj.width / 2}
                  y={obj.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(obj.width, obj.height) * 0.28}
                  fontWeight="700"
                  fill={colors.text}
                  className="select-none pointer-events-none"
                >
                  {label}
                </text>
                {info?.order && (
                  <text
                    x={obj.width / 2}
                    y={obj.height * 0.78}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(obj.width, obj.height) * 0.18}
                    fill={colors.text}
                    opacity={0.75}
                    className="select-none pointer-events-none"
                  >
                    {formatDuration(info.durationSec)}
                  </text>
                )}
              </g>
            );
          }

          if (obj.type === "wall") {
            return (
              <rect
                key={obj.id}
                transform={transform}
                x={0}
                y={0}
                width={obj.width}
                height={obj.height}
                fill="#475569"
                rx={1}
              />
            );
          }

          if (obj.type === "zone") {
            const color = obj.color ?? "#3b82f6";
            return (
              <rect
                key={obj.id}
                transform={transform}
                x={0}
                y={0}
                width={obj.width}
                height={obj.height}
                rx={8}
                fill={color}
                opacity={(obj.opacity ?? 30) / 100}
                stroke={color}
                strokeWidth={1}
              />
            );
          }

          if (obj.type === "door") {
            return (
              <rect
                key={obj.id}
                transform={transform}
                x={0}
                y={0}
                width={obj.width}
                height={obj.height}
                rx={2}
                fill="#fde68a"
                stroke="#d97706"
                strokeWidth={1}
              />
            );
          }

          if (obj.type === "chair") {
            return (
              <rect
                key={obj.id}
                transform={transform}
                x={1}
                y={1}
                width={obj.width - 2}
                height={obj.height - 2}
                rx={4}
                fill="#dbeafe"
                stroke="#93c5fd"
                strokeWidth={1}
              />
            );
          }

          // decoration / cashier / other
          return (
            <rect
              key={obj.id}
              transform={transform}
              x={0}
              y={0}
              width={obj.width}
              height={obj.height}
              rx={4}
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      </div>
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

  const setFullScreen = usePOSUIStore((s) => s.setFullScreen);

  // Register as full-screen so DashboardLayout hides the outer header/breadcrumb.
  useEffect(() => {
    setFullScreen(true);
    return () => setFullScreen(false);
  }, [setFullScreen]);

  const [selectedInfo, setSelectedInfo] = useState<LiveTableInfo | null>(null);
  const [now, setNow] = useState<number>();
  const [viewMode, setViewMode] = useState<"grid" | "floor">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("live-table-view") as "grid" | "floor") ?? "grid";
    }
    return "grid";
  });

  const toggleView = useCallback(() => {
    setViewMode((v) => {
      const next = v === "grid" ? "floor" : "grid";
      localStorage.setItem("live-table-view", next);
      return next;
    });
  }, []);

  // Tick every second for real-time duration display.
  // Server data is refreshed every 15 s via TanStack Query — no extra API cost from this timer.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    setNow(Date.now());
    return () => clearInterval(id);
  }, []);

  const { plan, liveTableInfos, layoutObjects, isLoading } = useLiveTableData({
    outletId,
    floorPlanId,
    outletName,
    now,
  });

  const handleTableClick = useCallback(
    (info: LiveTableInfo) => {
      if (info.status === "AVAILABLE" && outletId) {
        const tableLabel =
          info.tableObj.label ??
          `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
        const query = new URLSearchParams();
        query.set("outlet_id", outletId);
        query.set("table_id", info.tableObj.id);
        query.set("table_label", tableLabel);
        router.push(`/pos/fb/terminal?${query.toString()}`);
        return;
      }
      setSelectedInfo(info);
    },
    [outletId, router],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="font-semibold text-lg">No floor plan found</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
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
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full cursor-pointer"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm leading-tight truncate">
              {plan.name}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {outletName ?? "Live Table"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatsBar infos={liveTableInfos} />
          {/* View toggle: card grid ↔ floor layout */}
          <Button
            variant="ghost"
            size="icon"
            title={viewMode === "grid" ? "Switch to floor layout" : "Switch to card grid"}
            className="h-8 w-8 rounded-full cursor-pointer"
            onClick={toggleView}
          >
            {viewMode === "grid" ? (
              <MapPin className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <RefreshCw className="h-3 w-3" />
            <span>15s</span>
          </div>
        </div>
      </header>

      {/* ── Status legend ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
        {(
          Object.entries(STATUS_CONFIG) as [
            LiveTableStatus,
            (typeof STATUS_CONFIG)[LiveTableStatus],
          ][]
        ).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 shrink-0">
            <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
            <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* ── Table grid / floor layout ── */}
      <ScrollArea className="flex-1">
        {liveTableInfos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <p className="text-sm">No tables in this floor plan.</p>
          </div>
        ) : viewMode === "grid" ? (
          <TableGrid infos={liveTableInfos} onTableClick={handleTableClick} />
        ) : (
          <LiveFloorView
            planWidth={plan.width ?? 1200}
            planHeight={plan.height ?? 800}
            layoutObjects={layoutObjects}
            infos={liveTableInfos}
            onTableClick={handleTableClick}
          />
        )}
      </ScrollArea>

      <OrderDetailDialog
        info={selectedInfo}
        onClose={() => setSelectedInfo(null)}
      />
    </div>
  );
}

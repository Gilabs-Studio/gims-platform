"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Store,
  LayoutPanelTop,
  MonitorSmartphone,
  ArrowLeft,
  ShieldOff,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePOSOutlets } from "@/features/pos/terminal/hooks/use-pos";
import type { Outlet } from "@/features/master-data/outlet/types";
import { useFloorLayouts } from "@/features/pos/fb/floor-layout/hooks/use-floor-layouts";
import { Link, useRouter } from "@/i18n/routing";
import { POSTerminalContainer } from "./pos-terminal-container";

type OutletMode = "LIVE_TABLE" | "DIRECT_POS";

type OutletWithMode = Outlet & {
  pos_mode: OutletMode;
};

export function POSTerminalPageClient() {
  const router = useRouter();
  const t = useTranslations("posTerminal");
  const searchParams = useSearchParams();
  const outletIdFromQuery = searchParams.get("outlet_id");
  const tableIdFromQuery = searchParams.get("table_id") ?? undefined;
  const tableLabelFromQuery = searchParams.get("table_label") ?? undefined;
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const hasAutoNavigated = useRef(false);

  const {
    data: outletsData,
    isLoading: outletsLoading,
    isError: outletsError,
  } = usePOSOutlets();

  const allOutlets = useMemo(() => outletsData?.data ?? [], [outletsData?.data]);
  const outlets = useMemo(
    () => allOutlets.filter((o) => !!o.warehouse_id),
    [allOutlets]
  );

  const { data: floorLayoutData, isLoading: floorLayoutLoading } = useFloorLayouts(
    { status: "published", per_page: 100 },
    { enabled: outlets.length > 0 }
  );
  const outletWithLayouts = useMemo(() => {
    const ids = new Set<string>();
    for (const plan of floorLayoutData?.data ?? []) {
      if (plan.outlet_id) ids.add(plan.outlet_id);
    }
    return ids;
  }, [floorLayoutData?.data]);

  const outletsWithMode = useMemo<OutletWithMode[]>(() => {
    return outlets.map((outlet) => ({
      ...outlet,
      pos_mode: outletWithLayouts.has(outlet.id) ? "LIVE_TABLE" : "DIRECT_POS",
    }));
  }, [outletWithLayouts, outlets]);

  const handleOutletSelect = (outlet: OutletWithMode) => {
    if (outlet.pos_mode === "LIVE_TABLE") {
      const query = new URLSearchParams();
      query.set("outlet_id", outlet.id);
      router.push(`/pos/fb/live-table?${query.toString()}`);
      return;
    }
    setSelectedOutletId(outlet.id);
  };

  const querySelectedOutlet = useMemo(
    () => outletsWithMode.find((o) => o.id === outletIdFromQuery) ?? null,
    [outletIdFromQuery, outletsWithMode],
  );

  const singleOutlet = useMemo(
    () => (outletsWithMode.length === 1 ? outletsWithMode[0] : null),
    [outletsWithMode],
  );

  const autoDirectOutlet =
    !outletIdFromQuery && singleOutlet?.pos_mode === "DIRECT_POS" ? singleOutlet : null;

  const selectedOutlet = useMemo(
    () =>
      outletsWithMode.find((o) => o.id === selectedOutletId) ??
      querySelectedOutlet ??
      autoDirectOutlet ??
      null,
    [autoDirectOutlet, outletsWithMode, querySelectedOutlet, selectedOutletId],
  );

  // Scenario 1: single outlet with LIVE_TABLE ⇒ auto-navigate immediately
  useEffect(() => {
    if (outletIdFromQuery) return;
    if (hasAutoNavigated.current) return;
    if (outletsLoading || floorLayoutLoading) return;
    if (!singleOutlet) return;
    if (singleOutlet.pos_mode !== "LIVE_TABLE") return;

    hasAutoNavigated.current = true;
    const query = new URLSearchParams();
    query.set("outlet_id", singleOutlet.id);
    router.push(`/pos/fb/live-table?${query.toString()}`);
  }, [floorLayoutLoading, outletIdFromQuery, outletsLoading, router, singleOutlet]);

  if (outletsLoading || (floorLayoutLoading && outlets.length > 0)) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-md mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (outletsError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Store className="h-12 w-12 text-muted-foreground/20" />
        <p className="font-medium">Unable to load POS outlets</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Check your access permissions or refresh the session.
        </p>
      </div>
    );
  }

  // Null state: RBAC granted but no outlets assigned at all
  if (allOutlets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <Store className="h-16 w-16 text-muted-foreground/15" />
          <ShieldOff className="h-7 w-7 absolute -bottom-1 -right-1 text-amber-500" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-semibold text-base">No Outlets Assigned</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your account has POS access but no outlet has been assigned to you.
            Please contact your administrator.
          </p>
          <Button asChild variant="outline" className="mt-2 cursor-pointer">
            <Link href="/master-data/outlet">{t("addOutlet")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Null state: outlets exist but none linked to a POS warehouse
  if (outletsWithMode.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <Store className="h-16 w-16 text-muted-foreground/15" />
          <MapPin className="h-7 w-7 absolute -bottom-1 -right-1 text-muted-foreground/50" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-semibold text-base">POS Not Configured</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your outlets exist but none have a linked POS warehouse.
            Please contact your system administrator.
          </p>
          <Button asChild variant="outline" className="mt-2 cursor-pointer">
            <Link href="/master-data/outlet">{t("addOutlet")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Scenario 2: multiple outlets ⇒ card grid selector
  if (outletsWithMode.length > 1 && !selectedOutlet) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Select Outlet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live Table outlets open the floor management view. Direct POS opens the cashier terminal.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {outletsWithMode.map((outlet) => {
            const isLive = outlet.pos_mode === "LIVE_TABLE";
            return (
              <Card
                key={outlet.id}
                className="flex flex-col hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                        {outlet.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {outlet.code}
                      </p>
                    </div>
                    <Badge
                      variant={isLive ? "default" : "secondary"}
                      className="shrink-0 text-[10px] px-1.5 py-0.5"
                    >
                      {isLive ? "Live Table" : "Direct POS"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 flex flex-col flex-1 gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1">
                    {isLive ? (
                      <LayoutPanelTop className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {isLive ? "Floor layout available" : "No floor layout"}
                    </span>
                  </div>

                  <Button
                    className="w-full cursor-pointer text-xs h-8"
                    variant={isLive ? "default" : "outline"}
                    onClick={() => handleOutletSelect(outlet)}
                  >
                    {isLive ? "Open Live Table" : "Open POS Terminal"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (!selectedOutlet) return null;

  // When this terminal session was opened from a live-table, build the return URL.
  const liveTableReturnUrl = (() => {
    if (!outletIdFromQuery || !tableIdFromQuery) return undefined;
    const targetOutlet = outletsWithMode.find((o) => o.id === outletIdFromQuery);
    if (!targetOutlet || targetOutlet.pos_mode !== "LIVE_TABLE") return undefined;
    const q = new URLSearchParams();
    q.set("outlet_id", outletIdFromQuery);
    return `/pos/fb/live-table?${q.toString()}`;
  })();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {outletsWithMode.length > 1 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedOutlet.name}</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {selectedOutlet.code}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">Direct POS</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (selectedOutlet.pos_mode === "LIVE_TABLE") {
                const query = new URLSearchParams();
                query.set("outlet_id", selectedOutlet.id);
                router.push(`/pos/fb/live-table?${query.toString()}`);
              } else {
                setSelectedOutletId(null);
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Change Outlet
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <POSTerminalContainer
          outletId={selectedOutlet.id}
          outletName={selectedOutlet.name}
          initialTableId={tableIdFromQuery}
          initialTableLabel={tableLabelFromQuery}
          returnUrl={liveTableReturnUrl}
          hasFloorLayout={selectedOutlet.pos_mode === "LIVE_TABLE"}
        />
      </div>
    </div>
  );
}

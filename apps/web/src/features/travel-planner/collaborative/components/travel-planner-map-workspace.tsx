"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Filter, MapPinned, Plus, Route, Search, Users, Wallet } from "lucide-react";

import { PageMotion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { MapView, MarkerClusterGroup, type MapMarker } from "@/components/ui/map/map-view";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useVisitReportById } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { visitReportService } from "@/features/crm/visit-report/services/visit-report-service";
import type { VisitReport } from "@/features/crm/visit-report/types";
import { useHasPermission, usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { formatCurrency, resolveImageUrl } from "@/lib/utils";
import {
  travelPlannerKeys,
  useCreateTravelPlan,
  useTravelPlan,
  useTravelPlanExpenses,
  useTravelPlannerFormData,
  useTravelPlans,
} from "../hooks/use-travel-planner";
import { travelPlannerService } from "../services/travel-planner-service";
import type { TravelPlanInput } from "../types";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

type PlannerMarkerData = {
  kind: "stop" | "visit";
  title: string;
  subtitle: string;
  visitId?: string;
};

function buildCreatePlanPayload(title: string, mode: string): TravelPlanInput {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = now.toISOString().slice(0, 10);
  const endDate = tomorrow.toISOString().slice(0, 10);

  return {
    title,
    mode,
    start_date: startDate,
    end_date: endDate,
    budget_amount: 0,
    notes: "",
    days: [
      {
        day_index: 1,
        day_date: startDate,
        summary: "",
        weather_risk: "low",
        stops: [],
        notes: [],
      },
    ],
  };
}

function parsePhotos(photos: string | null | undefined): string[] {
  if (!photos) return [];
  try {
    const parsed = JSON.parse(photos) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") as string[] : [];
  } catch {
    return [];
  }
}

export function TravelPlannerMapWorkspace() {
  const t = useTranslations("travelPlanner.workspace");
  const { user } = useAuthStore();

  const pathname = usePathname();
  const isFullPage = pathname?.includes("/travel-planner") ?? false;

  const canReadTravelPlanner = useHasPermission("travel_planner.read");
  const travelPlannerReadScope = usePermissionScope("travel_planner.read");

  const [newPlanTitle, setNewPlanTitle] = useState("Logistics Collaborative Plan");
  const [newPlanMode, setNewPlanMode] = useState("logistic");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [visitStatus, setVisitStatus] = useState("all");
  const [visitOutcome, setVisitOutcome] = useState("all");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [isVisitDrawerOpen, setIsVisitDrawerOpen] = useState(false);

  const plansQuery = useTravelPlans({ page: 1, per_page: 20 });
  const formDataQuery = useTravelPlannerFormData();
  const createPlanMutation = useCreateTravelPlan();

  const plans = useMemo(() => plansQuery.data?.data ?? [], [plansQuery.data?.data]);
  const activePlanId = selectedPlanId || plans[0]?.id || "";

  const activePlanQuery = useTravelPlan(activePlanId, !!activePlanId);
  const activePlan = activePlanQuery.data?.data ?? null;
  const activePlanExpensesQuery = useTravelPlanExpenses(activePlanId, !!activePlanId);

  const routeVisitsQueries = useQueries({
    queries: plans.map((plan) => ({
      queryKey: travelPlannerKeys.visits(plan.id),
      queryFn: () => travelPlannerService.listVisits(plan.id),
      enabled: !!plan.id,
      staleTime: 30_000,
    })),
  });

  const routeExpensesQueries = useQueries({
    queries: plans.map((plan) => ({
      queryKey: travelPlannerKeys.expenses(plan.id),
      queryFn: () => travelPlannerService.listExpenses(plan.id),
      enabled: !!plan.id,
      staleTime: 30_000,
    })),
  });

  const activePlanVisits = useMemo(() => {
    const activeRouteQuery = routeVisitsQueries[plans.findIndex((plan) => plan.id === activePlanId)];
    return activeRouteQuery?.data?.data ?? [];
  }, [activePlanId, plans, routeVisitsQueries]);

  const selectedVisitQuery = useVisitReportById(selectedVisitId);

  const activeVisitDetailQueries = useQueries({
    queries: activePlanVisits.map((visit) => ({
      queryKey: ["crm-visit-reports", "detail", visit.id],
      queryFn: () => visitReportService.getById(visit.id),
      enabled: !!activePlanId,
      staleTime: 30_000,
    })),
  });

  const routeEmployeesByPlan = useMemo(() => {
    const mapping = new Map<string, string[]>();

    plans.forEach((plan, index) => {
      const items = routeVisitsQueries[index]?.data?.data ?? [];
      const names = [...new Set(items.map((item) => item.employee_name).filter((name) => name.trim().length > 0))];
      mapping.set(plan.id, names);
    });

    return mapping;
  }, [plans, routeVisitsQueries]);

  const routeExpenseSummaryByPlan = useMemo(() => {
    const mapping = new Map<string, { budget: number; spent: number; remaining: number }>();

    plans.forEach((plan, index) => {
      const spent = routeExpensesQueries[index]?.data?.data?.total_amount ?? 0;
      const budget = plan.budget_amount ?? 0;
      const remaining = Math.max(budget - spent, 0);

      mapping.set(plan.id, {
        budget,
        spent,
        remaining,
      });
    });

    return mapping;
  }, [plans, routeExpensesQueries]);

  const detailedVisits = useMemo(() => {
    return activeVisitDetailQueries
      .map((query) => query.data?.data)
      .filter((visit): visit is VisitReport => !!visit);
  }, [activeVisitDetailQueries]);

  const filteredVisits = useMemo(() => {
    const keyword = visitSearch.trim().toLowerCase();

    return detailedVisits.filter((visit) => {
      const statusMatch = visitStatus === "all" || visit.status === visitStatus;
      const outcomeMatch = visitOutcome === "all" || visit.outcome === visitOutcome;
      const textMatch =
        keyword.length === 0 ||
        visit.code.toLowerCase().includes(keyword) ||
        (visit.employee?.name ?? "").toLowerCase().includes(keyword) ||
        (visit.customer?.name ?? "").toLowerCase().includes(keyword) ||
        (visit.address ?? "").toLowerCase().includes(keyword) ||
        visit.purpose.toLowerCase().includes(keyword);

      return statusMatch && outcomeMatch && textMatch;
    });
  }, [detailedVisits, visitOutcome, visitSearch, visitStatus]);

  const totalSpent = activePlanExpensesQuery.data?.data?.total_amount ?? 0;
  const totalBudget = activePlan?.budget_amount ?? 0;
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);

  const markers = useMemo<MapMarker<PlannerMarkerData>[]>(() => {
    const stopMarkers = (activePlan?.days ?? []).flatMap((day) =>
      (day.stops ?? []).map((stop) => ({
        id: stop.id,
        latitude: stop.latitude,
        longitude: stop.longitude,
        data: {
          kind: "stop" as const,
          title: stop.place_name,
          subtitle: stop.note || `${t("weather.dayLabel", { day: day.day_index })}`,
        },
      })),
    );

    const visitMarkers = detailedVisits
      .filter((visit) => typeof visit.latitude === "number" && typeof visit.longitude === "number")
      .map((visit) => ({
        id: `visit-${visit.id}`,
        latitude: Number(visit.latitude),
        longitude: Number(visit.longitude),
        data: {
          kind: "visit" as const,
          title: visit.code,
          subtitle: visit.address || visit.purpose || "Visit report",
          visitId: visit.id,
        },
      }));

    return [...stopMarkers, ...visitMarkers];
  }, [activePlan?.days, detailedVisits, t]);

  const mapCenter = useMemo<[number, number]>(() => {
    const firstMarker = markers[0];
    if (firstMarker) {
      return [firstMarker.latitude, firstMarker.longitude];
    }
    return [-6.2088, 106.8456];
  }, [markers]);

  const renderMarkers = (markerList: MapMarker<PlannerMarkerData>[]) => {
    if (markerList.length === 0) {
      return null;
    }

    return (
      <MarkerClusterGroup chunkedLoading>
        {markerList.map((marker) => (
          <Marker
            key={String(marker.id)}
            position={[marker.latitude, marker.longitude]}
            eventHandlers={{
              click: () => {
                if (marker.data.kind === "visit" && marker.data.visitId) {
                  setSelectedVisitId(marker.data.visitId);
                  setIsVisitDrawerOpen(true);
                }
              },
            }}
          >
            <Popup>
              <div className="min-w-52 space-y-1">
                <p className="text-sm font-semibold">{marker.data.title}</p>
                <p className="text-xs text-muted-foreground">{marker.data.subtitle}</p>
                <Badge variant="outline" className="mt-1">
                  {marker.data.kind === "visit" ? t("visits.createTitle") : t("tabs.map")}
                </Badge>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    );
  };

  const handleCreatePlan = async () => {
    const payload = buildCreatePlanPayload(newPlanTitle.trim() || "Travel Plan", newPlanMode);
    const response = await createPlanMutation.mutateAsync(payload);
    const createdId = response.data?.id ?? "";
    if (createdId) {
      setSelectedVisitId("");
      setIsVisitDrawerOpen(false);
      setSelectedPlanId(createdId);
    }
  };

  const visitPhotos = parsePhotos(selectedVisitQuery.data?.data?.photos);

  const pageMotionClass = isFullPage
    ? "relative h-full w-full min-h-0 overflow-hidden bg-transparent"
    : "relative h-[calc(100vh-2rem)] min-h-[680px] overflow-hidden rounded-xl border bg-background";

  const mainClass = isFullPage ? "h-full w-full relative" : "h-full w-full relative bg-muted/30";

  return (
    <PageMotion className={pageMotionClass}>
      <main className={mainClass}>
        {activePlanQuery.isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <MapView
            markers={markers}
            renderMarkers={renderMarkers}
            className="h-full w-full"
            defaultCenter={mapCenter}
            defaultZoom={11}
            selectedMarkerId={null}
            showLayerControl
          />
        )}

        <aside className="absolute left-4 top-4 bottom-4 z-40 w-84 rounded-xl border bg-background/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-background/80 flex flex-col">
          <div className="p-4 border-b space-y-3">
            <p className="text-sm font-semibold">{t("planBootstrap.title")}</p>
            <Input
              value={newPlanTitle}
              onChange={(event) => setNewPlanTitle(event.target.value)}
              placeholder={t("planBootstrap.titlePlaceholder")}
            />
            <Select value={newPlanMode} onValueChange={setNewPlanMode}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("planBootstrap.modePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {(formDataQuery.data?.data?.modes ?? []).map((mode) => (
                  <SelectItem key={mode.value} value={mode.value} className="cursor-pointer">
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full cursor-pointer" onClick={handleCreatePlan} disabled={createPlanMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              {t("actions.createPlan")}
            </Button>
          </div>

          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("tabs.operations")}</p>
            <Badge variant="outline">{plans.length}</Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {plansQuery.isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : null}

              {(plans ?? []).map((plan) => {
                const employees = routeEmployeesByPlan.get(plan.id) ?? [];
                const expenseSummary = routeExpenseSummaryByPlan.get(plan.id) ?? {
                  budget: 0,
                  spent: 0,
                  remaining: 0,
                };
                const isActive = plan.id === activePlanId;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                      isActive ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                    }`}
                    onClick={() => {
                      setSelectedVisitId("");
                      setIsVisitDrawerOpen(false);
                      setSelectedPlanId(plan.id);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold line-clamp-1">{plan.title}</p>
                      <Route className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.code}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {employees.slice(0, 3).map((employee) => (
                        <Badge key={`${plan.id}-${employee}`} variant="outline" className="text-[10px]">
                          <Users className="h-3 w-3 mr-1" />
                          {employee}
                        </Badge>
                      ))}
                      {employees.length === 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("visits.linkedEmpty")}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-md border bg-muted/40 p-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Budget</p>
                        <p className="text-[11px] font-semibold leading-tight">{formatCurrency(expenseSummary.budget)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Spent</p>
                        <p className="text-[11px] font-semibold leading-tight">{formatCurrency(expenseSummary.spent)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remain</p>
                        <p className="text-[11px] font-semibold leading-tight">{formatCurrency(expenseSummary.remaining)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        <aside className="absolute right-4 top-4 bottom-4 z-40 w-90 rounded-xl border bg-background/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-background/80 flex flex-col">
          <div className="p-4 border-b space-y-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? "User"} />
                    <AvatarFallback dataSeed={user?.name ?? "guest"}>{user?.name ?? "U"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name ?? t("context.notAuthenticated")}</p>
                    <p className="text-xs text-muted-foreground truncate">{travelPlannerReadScope ?? t("context.scopeUnknown")}</p>
                  </div>
                  <Badge variant={canReadTravelPlanner ? "success" : "destructive"}>
                    {canReadTravelPlanner ? t("context.permissionGranted") : t("context.permissionMissing")}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("tabs.operations")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Budget</span>
                  <span className="font-semibold">{formatCurrency(totalBudget)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-semibold">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold">{formatCurrency(totalRemaining)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={visitSearch}
                  onChange={(event) => setVisitSearch(event.target.value)}
                  placeholder={t("visits.searchPlaceholder")}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={visitStatus} onValueChange={setVisitStatus}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Status</SelectItem>
                    <SelectItem value="draft" className="cursor-pointer">Draft</SelectItem>
                    <SelectItem value="submitted" className="cursor-pointer">Submitted</SelectItem>
                    <SelectItem value="approved" className="cursor-pointer">Approved</SelectItem>
                    <SelectItem value="rejected" className="cursor-pointer">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={visitOutcome} onValueChange={setVisitOutcome}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Outcome</SelectItem>
                    <SelectItem value="very_positive" className="cursor-pointer">Very Positive</SelectItem>
                    <SelectItem value="positive" className="cursor-pointer">Positive</SelectItem>
                    <SelectItem value="neutral" className="cursor-pointer">Neutral</SelectItem>
                    <SelectItem value="negative" className="cursor-pointer">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 border-b flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {t("visits.linkedTitle")}
            </p>
            <Badge variant="outline">{filteredVisits.length}</Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {filteredVisits.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    {t("visits.linkedEmpty")}
                  </CardContent>
                </Card>
              ) : null}

              {filteredVisits.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  className="w-full rounded-lg border p-3 text-left hover:bg-accent/40 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedVisitId(visit.id);
                    setIsVisitDrawerOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold line-clamp-1">{visit.code}</p>
                    <Badge variant="outline" className="text-[10px]">{visit.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{visit.employee?.name || "-"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{visit.customer?.name || t("visits.noCustomer")}</p>
                  <p className="text-xs mt-2 line-clamp-2">{visit.purpose || "-"}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </main>

      <Drawer
        open={isVisitDrawerOpen}
        onOpenChange={setIsVisitDrawerOpen}
        title={selectedVisitQuery.data?.data?.code || t("visits.linkedTitle")}
        side="right"
        defaultWidth={520}
      >
        <div className="p-4 space-y-4">
          {selectedVisitQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : null}

          {selectedVisitQuery.data?.data ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("context.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Employee:</span> {selectedVisitQuery.data.data.employee?.name || "-"}</p>
                  <p><span className="text-muted-foreground">Customer:</span> {selectedVisitQuery.data.data.customer?.name || "-"}</p>
                  <p><span className="text-muted-foreground">Address:</span> {selectedVisitQuery.data.data.address || "-"}</p>
                  <p><span className="text-muted-foreground">Purpose:</span> {selectedVisitQuery.data.data.purpose || "-"}</p>
                  <p><span className="text-muted-foreground">Notes:</span> {selectedVisitQuery.data.data.notes || "-"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Interest</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(selectedVisitQuery.data.data.details ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No product interest details.</p>
                  ) : (
                    (selectedVisitQuery.data.data.details ?? []).map((detail) => (
                      <div key={detail.id} className="rounded-md border p-3 space-y-1">
                        <p className="text-sm font-semibold">{detail.product?.name || "Unknown Product"}</p>
                        <p className="text-xs text-muted-foreground">Interest: {detail.interest_level}/5</p>
                        <p className="text-xs">{detail.notes || "-"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  {visitPhotos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documentation photos.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {visitPhotos.map((photoUrl, index) => (
                        <Image
                          key={`${photoUrl}-${index}`}
                          src={resolveImageUrl(photoUrl) ?? photoUrl}
                          alt={`Visit documentation ${index + 1}`}
                          width={320}
                          height={180}
                          unoptimized
                          className="h-28 w-full rounded-md object-cover border"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {(typeof selectedVisitQuery.data.data.latitude === "number" && typeof selectedVisitQuery.data.data.longitude === "number") ? (
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${selectedVisitQuery.data?.data.latitude},${selectedVisitQuery.data?.data.longitude}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MapPinned className="h-4 w-4 mr-2" />
                  Open Visit Location
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </Drawer>
    </PageMotion>
  );
}

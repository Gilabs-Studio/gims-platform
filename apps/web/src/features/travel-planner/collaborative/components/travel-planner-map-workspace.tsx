"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Filter, MapPinned, Plus, Search, Wallet } from "lucide-react";

import { PageMotion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { MapView, MarkerClusterGroup, type MapMarker } from "@/components/ui/map/map-view";
import { NumericInput } from "@/components/ui/numeric-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useVisitReportById } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { visitReportService } from "@/features/crm/visit-report/services/visit-report-service";
import type { VisitReport } from "@/features/crm/visit-report/types";
import { useHasPermission, usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency, resolveImageUrl } from "@/lib/utils";
import {
  travelPlannerKeys,
  useCreateTravelExpense,
  useCreateTravelPlan,
  useTravelPlan,
  useTravelPlanExpenses,
  useTravelPlannerFormData,
  useTravelPlans,
} from "../hooks/use-travel-planner";
import { travelPlannerService } from "../services/travel-planner-service";
import type { TravelPlanInput } from "../types";
import { TravelPlannerCreatePlanDialog } from "./travel-planner-create-plan-dialog";
import { TravelPlannerMobileToolbar } from "./travel-planner-mobile-toolbar";

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

type PlannerMarkerData = {
  kind: "stop" | "visit";
  title: string;
  subtitle: string;
  visitId?: string;
};

type PlanDetailType = "up_country_cost" | "visit_report";

const PARTICIPANT_META_PREFIX = "[participants:";
const PARTICIPANT_META_SUFFIX = "]";

function appendParticipantMeta(notes: string, participantIDs: string[]): string {
  const sanitizedIDs = participantIDs.map((id) => id.trim()).filter(Boolean);
  if (sanitizedIDs.length === 0) {
    return notes;
  }

  const cleanNotes = notes.replace(/\n?\[participants:[^\]]*\]$/i, "").trim();
  const participantMeta = `${PARTICIPANT_META_PREFIX}${sanitizedIDs.join(",")}${PARTICIPANT_META_SUFFIX}`;
  return cleanNotes ? `${cleanNotes}\n${participantMeta}` : participantMeta;
}

function extractParticipantIDs(notes: string): string[] {
  const trimmedNotes = notes.trim();
  if (!trimmedNotes.includes(PARTICIPANT_META_PREFIX)) {
    return [];
  }

  const start = trimmedNotes.lastIndexOf(PARTICIPANT_META_PREFIX);
  if (start < 0) {
    return [];
  }

  const end = trimmedNotes.indexOf(PARTICIPANT_META_SUFFIX, start);
  if (end < 0) {
    return [];
  }

  const content = trimmedNotes.slice(start + PARTICIPANT_META_PREFIX.length, end);
  return content.split(",").map((id) => id.trim()).filter(Boolean);
}

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
  const isMobile = useIsMobile();

  const canReadTravelPlanner = useHasPermission("travel_planner.read");
  const canCreateTravelPlanner = useHasPermission("travel_planner.create");
  const canUpdateTravelPlanner = useHasPermission("travel_planner.update");
  const travelPlannerReadScope = usePermissionScope("travel_planner.read");

  const [newPlanTitle, setNewPlanTitle] = useState("Logistics Collaborative Plan");
  const [newPlanMode, setNewPlanMode] = useState("logistic");
  const [newPlanBudget, setNewPlanBudget] = useState<number>(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedParticipantIDs, setSelectedParticipantIDs] = useState<string[]>([]);
  const [initialExpenseItems, setInitialExpenseItems] = useState<Array<{ expense_type: string; amount: number; description: string }>>([]);
  const [selectedLocationLat, setSelectedLocationLat] = useState<number | undefined>(undefined);
  const [selectedLocationLng, setSelectedLocationLng] = useState<number | undefined>(undefined);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isPlanPanelOpen, setIsPlanPanelOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [planSearch, setPlanSearch] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState<"all" | PlanDetailType>("all");
  const [visitSearch, setVisitSearch] = useState("");
  const [visitStatus, setVisitStatus] = useState("all");
  const [visitOutcome, setVisitOutcome] = useState("all");
  const [detailExpenseType, setDetailExpenseType] = useState("transport");
  const [detailExpenseAmount, setDetailExpenseAmount] = useState(0);
  const [detailExpenseDescription, setDetailExpenseDescription] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [isVisitDrawerOpen, setIsVisitDrawerOpen] = useState(false);

  const debouncedPlanSearch = useDebounce(planSearch, 300);
  const debouncedVisitSearch = useDebounce(visitSearch, 300);

  const showPlanPanel = () => {
    setIsPlanPanelOpen(true);
    setIsDetailPanelOpen(false);
  };

  const showDetailPanel = () => {
    setIsPlanPanelOpen(false);
    setIsDetailPanelOpen(true);
  };

  const closeMobilePanels = () => {
    setIsPlanPanelOpen(false);
    setIsDetailPanelOpen(false);
  };

  const plansQuery = useTravelPlans({
    page: 1,
    per_page: 20,
    search: debouncedPlanSearch.trim() || undefined,
    plan_type: planTypeFilter === "all" ? undefined : planTypeFilter,
  });
  const formDataQuery = useTravelPlannerFormData();
  const createPlanMutation = useCreateTravelPlan();
  const createExpenseMutation = useCreateTravelExpense();
  const participantOptions = useMemo(() => formDataQuery.data?.data?.employees ?? [], [formDataQuery.data?.data?.employees]);
  const participantOptionByID = useMemo(() => {
    const mapping = new Map<string, { employee_name: string; employee_avatar_url: string }>();
    participantOptions.forEach((employee) => {
      mapping.set(employee.id, {
        employee_name: employee.name,
        employee_avatar_url: employee.avatar_url,
      });
    });
    return mapping;
  }, [participantOptions]);

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

  const routeParticipantsByPlan = useMemo(() => {
    const mapping = new Map<string, Array<{ employee_id: string; employee_name: string; employee_avatar_url: string }>>();

    plans.forEach((plan, index) => {
      if (plan.plan_type !== "visit_report") {
        const assignedParticipantIDs = extractParticipantIDs(plan.notes ?? "");
        const assignedParticipants = assignedParticipantIDs
          .map((employeeID) => {
            const participant = participantOptionByID.get(employeeID);
            if (!participant) {
              return null;
            }

            return {
              employee_id: employeeID,
              employee_name: participant.employee_name,
              employee_avatar_url: participant.employee_avatar_url,
            };
          })
          .filter((item): item is { employee_id: string; employee_name: string; employee_avatar_url: string } => !!item);

        mapping.set(plan.id, assignedParticipants);
        return;
      }

      const items = routeVisitsQueries[index]?.data?.data ?? [];
      const participantById = new Map<string, { employee_id: string; employee_name: string; employee_avatar_url: string }>();

      items.forEach((item) => {
        const employeeId = item.employee_id?.trim();
        if (!employeeId || participantById.has(employeeId)) {
          return;
        }

        participantById.set(employeeId, {
          employee_id: employeeId,
          employee_name: item.employee_name,
          employee_avatar_url: item.employee_avatar_url,
        });
      });

      mapping.set(plan.id, Array.from(participantById.values()));
    });

    return mapping;
  }, [participantOptionByID, plans, routeVisitsQueries]);

  const activePlanParticipants = useMemo(() => {
    return routeParticipantsByPlan.get(activePlanId) ?? [];
  }, [activePlanId, routeParticipantsByPlan]);

  const routePlanTypeByPlan = useMemo(() => {
    const mapping = new Map<string, PlanDetailType>();

    plans.forEach((plan) => {
      const normalized = plan.plan_type === "visit_report" ? "visit_report" : "up_country_cost";
      mapping.set(plan.id, normalized);
    });

    return mapping;
  }, [plans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const planType = routePlanTypeByPlan.get(plan.id) ?? "up_country_cost";
      return planTypeFilter === "all" || planTypeFilter === planType;
    });
  }, [planTypeFilter, plans, routePlanTypeByPlan]);

  const activePlanDetailType = useMemo<PlanDetailType>(() => {
    return routePlanTypeByPlan.get(activePlanId) ?? "up_country_cost";
  }, [activePlanId, routePlanTypeByPlan]);

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
    const keyword = debouncedVisitSearch.trim().toLowerCase();

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
  }, [debouncedVisitSearch, detailedVisits, visitOutcome, visitStatus]);

  const totalSpent = activePlanExpensesQuery.data?.data?.total_amount ?? 0;
  const totalBudget = activePlan?.budget_amount ?? 0;
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);
  const expenseTypeOptions = formDataQuery.data?.data?.expense_types ?? [];

  const toggleParticipantAssignment = (employeeID: string) => {
    setSelectedParticipantIDs((current) =>
      current.includes(employeeID) ? current.filter((item) => item !== employeeID) : [...current, employeeID],
    );
  };

  const addExpenseItemRow = () => {
    const fallbackExpenseType = expenseTypeOptions[0]?.value ?? "transport";
    setInitialExpenseItems((current) => [...current, { expense_type: fallbackExpenseType, amount: 0, description: "" }]);
  };

  const updateExpenseItemRow = (index: number, field: "expense_type" | "amount" | "description", value: string | number) => {
    setInitialExpenseItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const totalExpenseAmount = useMemo(() => {
    return initialExpenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [initialExpenseItems]);

  const removeExpenseItemRow = (index: number) => {
    setInitialExpenseItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const markers = useMemo<MapMarker<PlannerMarkerData>[]>(() => {
    const stopMarkers = (activePlan?.days ?? []).flatMap((day) =>
      (day.stops ?? []).map((stop) => ({
        id: stop.id,
        latitude: stop.latitude,
        longitude: stop.longitude,
        data: {
          kind: "stop" as const,
          title: stop.place_name,
          subtitle: stop.note || `Day ${day.day_index}`,
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
  }, [activePlan?.days, detailedVisits]);

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
    if (!canCreateTravelPlanner) {
      return;
    }

    const safeBudget = Number.isFinite(newPlanBudget) && newPlanBudget >= 0 ? newPlanBudget : 0;

    const payload = buildCreatePlanPayload(newPlanTitle.trim() || "Travel Plan", newPlanMode);
    payload.budget_amount = safeBudget;
    payload.notes = appendParticipantMeta(payload.notes ?? "", selectedParticipantIDs);
    if (typeof selectedLocationLat === "number" && typeof selectedLocationLng === "number") {
      payload.days[0].stops = [
        {
          place_name: "Selected start location",
          latitude: selectedLocationLat,
          longitude: selectedLocationLng,
          category: "checkpoint",
          order_index: 1,
          is_locked: false,
          source: "manual",
          note: "Auto-added from map picker",
        },
      ];
    }

    const response = await createPlanMutation.mutateAsync(payload);
    const createdId = response.data?.id ?? "";
    if (!createdId) {
      return;
    }

    const startDate = payload.start_date;

    await Promise.all(
      initialExpenseItems
        .filter((item) => item.amount > 0)
        .map((item) =>
          createExpenseMutation.mutateAsync({
            planId: createdId,
            payload: {
              expense_type: item.expense_type,
              amount: item.amount,
              expense_date: startDate,
              description: item.description,
            },
          }),
        ),
    );

    setSelectedVisitId("");
    setIsVisitDrawerOpen(false);
    setSelectedPlanId(createdId);
    setIsCreateDialogOpen(false);
    setSelectedParticipantIDs([]);
    setInitialExpenseItems([]);
    setSelectedLocationLat(undefined);
    setSelectedLocationLng(undefined);
  };

  const handleCreateDetailExpense = async () => {
    if (!canUpdateTravelPlanner) {
      return;
    }

    if (!activePlanId) {
      return;
    }

    if (detailExpenseAmount <= 0) {
      return;
    }

    const expenseDate = activePlan?.start_date ?? new Date().toISOString().slice(0, 10);

    await createExpenseMutation.mutateAsync({
      planId: activePlanId,
      payload: {
        expense_type: detailExpenseType,
        amount: detailExpenseAmount,
        expense_date: expenseDate,
        description: detailExpenseDescription,
      },
    });

    setDetailExpenseAmount(0);
    setDetailExpenseDescription("");
  };

  const visitPhotos = parsePhotos(selectedVisitQuery.data?.data?.photos);

  const pageMotionClass = isFullPage
    ? "relative h-full w-full min-h-0 overflow-hidden bg-transparent"
    : "relative h-[calc(100vh-2rem)] min-h-[680px] overflow-hidden rounded-xl border bg-background";

  const mainClass = isFullPage ? "h-full w-full relative" : "h-full w-full relative bg-muted/30";

  return (
    <PageMotion className={pageMotionClass}>
      <main className={mainClass}>
        {isMobile ? (
          <TravelPlannerMobileToolbar
            showPlans={showPlanPanel}
            showDetails={showDetailPanel}
            closePanels={closeMobilePanels}
            hasOpenPanel={isPlanPanelOpen || isDetailPanelOpen}
          />
        ) : null}

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

        <aside
          className="hidden md:flex absolute z-40 rounded-xl border bg-background/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-background/80 flex-col transition-all left-4 top-4 bottom-4 w-84"
        >
          <div className="p-4 border-b space-y-3">
            <p className="text-sm font-semibold">{t("planBootstrap.title")}</p>
            {canCreateTravelPlanner ? (
              <Button
                className="w-full cursor-pointer"
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={createPlanMutation.isPending || createExpenseMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("actions.createPlan")}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">You do not have permission to create plans.</p>
            )}
            <p className="text-[11px] text-muted-foreground">Create Plan is only for Up Country Cost. Visit Report is created via CRM.</p>
          </div>

          <div className="px-4 py-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("tabs.operations")}</p>
              <Badge variant="outline">{filteredPlans.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={planSearch}
                onChange={(event) => setPlanSearch(event.target.value)}
                placeholder="Search plans"
                className="pl-9"
              />
            </div>
            <Select value={planTypeFilter} onValueChange={(value) => setPlanTypeFilter(value as "all" | PlanDetailType)}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Types</SelectItem>
                <SelectItem value="up_country_cost" className="cursor-pointer">Up Country Cost / Travel Planner</SelectItem>
                <SelectItem value="visit_report" className="cursor-pointer">Visit Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {plansQuery.isLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : null}

              {filteredPlans.map((plan) => {
                const participants = routeParticipantsByPlan.get(plan.id) ?? [];
                const planType = routePlanTypeByPlan.get(plan.id) ?? "up_country_cost";
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
                      if (isMobile) {
                        showDetailPanel();
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold line-clamp-1">{plan.title}</p>
                      {planType === "visit_report" ? (
                        <MapPinned className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.code}</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {planType === "visit_report" ? "Visit Report" : "Up Country Cost"}
                    </Badge>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {participants.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {participants.slice(0, 3).map((participant) => (
                              <Avatar key={`${plan.id}-${participant.employee_id}`} className="h-7 w-7 border border-background">
                                <AvatarImage src={participant.employee_avatar_url || undefined} alt={participant.employee_name} />
                                <AvatarFallback dataSeed={participant.employee_name}>{participant.employee_name}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {participants.length > 3 ? `+${participants.length - 3} more` : `${participants.length} participant`}
                          </Badge>
                        </div>
                      ) : null}
                      {participants.length === 0 ? (
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

        <aside
          className="hidden md:flex absolute z-40 rounded-xl border bg-background/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-background/80 flex-col transition-all right-4 top-4 bottom-4 w-90"
        >
          <div className="p-4 border-b space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? "User"} />
                  <AvatarFallback dataSeed={user?.name ?? "guest"}>{user?.name ?? "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.name ?? t("context.notAuthenticated")}</p>
                  <p className="text-xs text-muted-foreground truncate">{travelPlannerReadScope ?? t("context.scopeUnknown")}</p>
                </div>
                <Badge variant={canReadTravelPlanner ? "success" : "destructive"}>
                  {canReadTravelPlanner ? t("context.permissionGranted") : t("context.permissionMissing")}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tabs.operations")}</p>
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
              <div className="pt-2 border-t space-y-1.5">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Participants</span>
                {activePlanParticipants.length > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex -space-x-2">
                      {activePlanParticipants.slice(0, 4).map((participant) => (
                        <Avatar key={`active-${participant.employee_id}`} className="h-7 w-7 border border-background">
                          <AvatarImage src={participant.employee_avatar_url || undefined} alt={participant.employee_name} />
                          <AvatarFallback dataSeed={participant.employee_name}>{participant.employee_name}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {activePlanParticipants.length > 4 ? `+${activePlanParticipants.length - 4}` : activePlanParticipants.length}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No participants yet</p>
                )}
              </div>
            </div>

            {activePlanDetailType === "visit_report" ? (
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
            ) : (
              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Add Expense Item</p>
                  <Select value={detailExpenseType} onValueChange={setDetailExpenseType}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypeOptions.map((expenseType) => (
                        <SelectItem key={expenseType.value} value={expenseType.value} className="cursor-pointer">
                          {expenseType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <NumericInput
                    value={detailExpenseAmount}
                    onChange={(value) => setDetailExpenseAmount(value ?? 0)}
                    placeholder="Amount"
                  />
                  <Input
                    value={detailExpenseDescription}
                    onChange={(event) => setDetailExpenseDescription(event.target.value)}
                    placeholder="Description"
                  />
                  <Button
                    type="button"
                    className="w-full cursor-pointer"
                    onClick={handleCreateDetailExpense}
                    disabled={createExpenseMutation.isPending || detailExpenseAmount <= 0 || !activePlanId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-b flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {activePlanDetailType === "visit_report" ? "Visit Report Details" : "Expense Details"}
            </p>
            <Badge variant="outline">
              {activePlanDetailType === "visit_report"
                ? filteredVisits.length
                : (activePlanExpensesQuery.data?.data?.items?.length ?? 0)}
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {activePlanDetailType === "visit_report" ? (
                <>
                  {filteredVisits.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
                        {t("visits.linkedEmpty")}
                    </div>
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
                </>
              ) : (
                <>
                  {(activePlanExpensesQuery.data?.data?.items ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
                        No expense items yet.
                    </div>
                  ) : null}

                  {(activePlanExpensesQuery.data?.data?.items ?? []).map((expense) => (
                    <div key={expense.id} className="rounded-2xl border border-border/60 bg-background/60 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold line-clamp-1">{expense.expense_type}</p>
                          <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{expense.expense_date}</p>
                        <p className="text-xs">{expense.description || "-"}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </aside>
      </main>

      {isMobile ? (
        <Drawer
          open={isPlanPanelOpen}
          onOpenChange={setIsPlanPanelOpen}
          title={t("planBootstrap.title")}
          side="bottom"
          className="h-[82vh] rounded-t-2xl"
          showCloseButton
          resizable={false}
        >
          <div className="h-full min-h-0 flex flex-col">
            <div className="p-4 border-b space-y-3">
              {canCreateTravelPlanner ? (
                <Button
                  className="w-full cursor-pointer"
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={createPlanMutation.isPending || createExpenseMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("actions.createPlan")}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">You do not have permission to create plans.</p>
              )}
              <p className="text-[11px] text-muted-foreground">Create Plan is only for Up Country Cost. Visit Report is created via CRM.</p>
            </div>

            <div className="px-4 py-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("tabs.operations")}</p>
                <Badge variant="outline">{filteredPlans.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={planSearch}
                  onChange={(event) => setPlanSearch(event.target.value)}
                  placeholder="Search plans"
                  className="pl-9"
                />
              </div>
              <Select value={planTypeFilter} onValueChange={(value) => setPlanTypeFilter(value as "all" | PlanDetailType)}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All Types</SelectItem>
                  <SelectItem value="up_country_cost" className="cursor-pointer">Up Country Cost / Travel Planner</SelectItem>
                  <SelectItem value="visit_report" className="cursor-pointer">Visit Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
              <div className="p-2 space-y-2 pb-5">
                {plansQuery.isLoading ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : null}

                {filteredPlans.map((plan) => {
                  const participants = routeParticipantsByPlan.get(plan.id) ?? [];
                  const planType = routePlanTypeByPlan.get(plan.id) ?? "up_country_cost";
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
                        {planType === "visit_report" ? (
                          <MapPinned className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.code}</p>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {planType === "visit_report" ? "Visit Report" : "Up Country Cost"}
                      </Badge>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {participants.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {participants.slice(0, 3).map((participant) => (
                                <Avatar key={`${plan.id}-${participant.employee_id}`} className="h-7 w-7 border border-background">
                                  <AvatarImage src={participant.employee_avatar_url || undefined} alt={participant.employee_name} />
                                  <AvatarFallback dataSeed={participant.employee_name}>{participant.employee_name}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {participants.length > 3 ? `+${participants.length - 3} more` : `${participants.length} participant`}
                            </Badge>
                          </div>
                        ) : null}
                        {participants.length === 0 ? (
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
            </div>
          </div>
        </Drawer>
      ) : null}

      {isMobile ? (
        <Drawer
          open={isDetailPanelOpen}
          onOpenChange={setIsDetailPanelOpen}
          title={activePlan?.title ?? "Plan details"}
          side="bottom"
          className="h-[82vh] rounded-t-2xl"
          showCloseButton
          resizable={false}
        >
          <div className="h-full min-h-0 flex flex-col">
            <div className="p-4 border-b space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? "User"} />
                    <AvatarFallback dataSeed={user?.name ?? "guest"}>{user?.name ?? "U"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{user?.name ?? t("context.notAuthenticated")}</p>
                    <p className="text-xs text-muted-foreground truncate">{travelPlannerReadScope ?? t("context.scopeUnknown")}</p>
                  </div>
                  <Badge variant={canReadTravelPlanner ? "success" : "destructive"}>
                    {canReadTravelPlanner ? t("context.permissionGranted") : t("context.permissionMissing")}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("tabs.operations")}</p>
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
              </div>

              {activePlanDetailType === "visit_report" ? (
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
              ) : (
                <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Add Expense Item</p>
                  <Select value={detailExpenseType} onValueChange={setDetailExpenseType}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypeOptions.map((expenseType) => (
                        <SelectItem key={expenseType.value} value={expenseType.value} className="cursor-pointer">
                          {expenseType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <NumericInput
                    value={detailExpenseAmount}
                    onChange={(value) => setDetailExpenseAmount(value ?? 0)}
                    placeholder="Amount"
                  />
                  <Input
                    value={detailExpenseDescription}
                    onChange={(event) => setDetailExpenseDescription(event.target.value)}
                    placeholder="Description"
                  />
                  <Button
                    type="button"
                    className="w-full cursor-pointer"
                    onClick={handleCreateDetailExpense}
                    disabled={createExpenseMutation.isPending || detailExpenseAmount <= 0 || !activePlanId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-b flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {activePlanDetailType === "visit_report" ? "Visit Report Details" : "Expense Details"}
              </p>
              <Badge variant="outline">
                {activePlanDetailType === "visit_report"
                  ? filteredVisits.length
                  : (activePlanExpensesQuery.data?.data?.items?.length ?? 0)}
              </Badge>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y">
              <div className="p-2 space-y-2 pb-5">
                {activePlanDetailType === "visit_report" ? (
                  <>
                    {filteredVisits.length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
                        {t("visits.linkedEmpty")}
                      </div>
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
                  </>
                ) : (
                  <>
                    {(activePlanExpensesQuery.data?.data?.items ?? []).length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
                        No expense items yet.
                      </div>
                    ) : null}

                    {(activePlanExpensesQuery.data?.data?.items ?? []).map((expense) => (
                      <div key={expense.id} className="rounded-2xl border border-border/60 bg-background/60 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold line-clamp-1">{expense.expense_type}</p>
                          <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{expense.expense_date}</p>
                        <p className="text-xs">{expense.description || "-"}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </Drawer>
      ) : null}

      <TravelPlannerCreatePlanDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        canCreate={canCreateTravelPlanner}
        isSubmitting={createPlanMutation.isPending || createExpenseMutation.isPending}
        title={newPlanTitle}
        onTitleChange={setNewPlanTitle}
        mode={newPlanMode}
        onModeChange={setNewPlanMode}
        budget={newPlanBudget}
        onBudgetChange={setNewPlanBudget}
        modeOptions={formDataQuery.data?.data?.modes ?? []}
        participantOptions={participantOptions}
        selectedParticipantIDs={selectedParticipantIDs}
        onToggleParticipant={toggleParticipantAssignment}
        expenseTypeOptions={expenseTypeOptions}
        initialExpenseItems={initialExpenseItems}
        totalExpenseAmount={totalExpenseAmount}
        onAddExpenseItem={addExpenseItemRow}
        onUpdateExpenseItem={updateExpenseItemRow}
        onRemoveExpenseItem={removeExpenseItemRow}
        selectedLocationLat={selectedLocationLat}
        selectedLocationLng={selectedLocationLng}
        onLocationChange={(lat, lng) => {
          setSelectedLocationLat(lat);
          setSelectedLocationLng(lng);
        }}
        onCreate={handleCreatePlan}
      />

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
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("context.title")}</p>
                  <p><span className="text-muted-foreground">Employee:</span> {selectedVisitQuery.data.data.employee?.name || "-"}</p>
                  <p><span className="text-muted-foreground">Customer:</span> {selectedVisitQuery.data.data.customer?.name || "-"}</p>
                  <p><span className="text-muted-foreground">Address:</span> {selectedVisitQuery.data.data.address || "-"}</p>
                  <p><span className="text-muted-foreground">Purpose:</span> {selectedVisitQuery.data.data.purpose || "-"}</p>
                  <p><span className="text-muted-foreground">Notes:</span> {selectedVisitQuery.data.data.notes || "-"}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Product Interest</p>
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
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Documentation</p>
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
              </div>

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

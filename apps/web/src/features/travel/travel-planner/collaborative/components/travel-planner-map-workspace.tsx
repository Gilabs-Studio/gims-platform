"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Check,
  Camera,
  CheckCircle2,
  Clock,
  Filter,
  FileText,
  Image as ImageIcon,
  MapPin,
  MapPinned,
  Package,
  Plus,
  Search,
  Target,
  User,
  Wallet,
  X,
  ZoomIn,
} from "lucide-react";

import { PageMotion } from "@/components/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { MapView, MarkerClusterGroup, type MapMarker } from "@/components/ui/map/map-view";
import { NumericInput } from "@/components/ui/numeric-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  useTravelPlannerParticipants,
  useTravelPlans,
  useUpdateTravelPlanParticipants,
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

type GpsCoords = {
  lat: number;
  lng: number;
};

function parseGpsLocation(locationJSON: string | null | undefined): GpsCoords | null {
  if (!locationJSON) {
    return null;
  }

  try {
    const parsed = JSON.parse(locationJSON) as Record<string, unknown>;
    const latRaw = parsed.lat ?? parsed.latitude;
    const lngRaw = parsed.lng ?? parsed.longitude;

    if (typeof latRaw !== "number" || typeof lngRaw !== "number") {
      return null;
    }

    return {
      lat: latRaw,
      lng: lngRaw,
    };
  } catch {
    return null;
  }
}

function formatTimeShort(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLatLng(latitude: number | null | undefined, longitude: number | null | undefined): string {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return "-";
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function TravelPlannerMapWorkspace() {
  const t = useTranslations("travelPlanner.workspace");
  const { user } = useAuthStore();

  const pathname = usePathname();
  const isFullPage = pathname?.includes("/travel/travel-planner") ?? false;
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
  const [detailExpenseType, setDetailExpenseType] = useState("transport");
  const [detailExpenseAmount, setDetailExpenseAmount] = useState(0);
  const [detailExpenseDescription, setDetailExpenseDescription] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [detailParticipantDraftIDs, setDetailParticipantDraftIDs] = useState<string[] | null>(null);
  const [isParticipantPickerOpen, setIsParticipantPickerOpen] = useState(false);
  const [participantPickerSearch, setParticipantPickerSearch] = useState("");
  const [participantPickerPage, setParticipantPickerPage] = useState(1);

  const PARTICIPANT_PICKER_PER_PAGE = 20;

  const debouncedPlanSearch = useDebounce(planSearch, 300);
  const debouncedParticipantSearch = useDebounce(participantPickerSearch, 300);

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
  const updateParticipantsMutation = useUpdateTravelPlanParticipants();
  const createExpenseMutation = useCreateTravelExpense();
  const participantPickerQuery = useTravelPlannerParticipants(
    participantPickerPage,
    PARTICIPANT_PICKER_PER_PAGE,
    debouncedParticipantSearch,
    isParticipantPickerOpen,
  );
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
            return {
              employee_id: employeeID,
              employee_name: participant?.employee_name ?? employeeID,
              employee_avatar_url: participant?.employee_avatar_url ?? "",
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

  const activePlanParticipantIDs = useMemo(() => {
    if (!activePlan || activePlan.plan_type === "visit_report") {
      return [];
    }

    return extractParticipantIDs(activePlan.notes ?? "");
  }, [activePlan]);

  const detailSelectedParticipantIDs = detailParticipantDraftIDs ?? activePlanParticipantIDs;

  const participantPickerItems = participantPickerQuery.data?.data ?? [];
  const participantPickerMeta = participantPickerQuery.data?.meta?.pagination;
  const participantPickerHasPrev = participantPickerMeta?.has_prev ?? false;
  const participantPickerHasNext = participantPickerMeta?.has_next ?? false;

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

  const routeVisitSummaryByPlan = useMemo(() => {
    const mapping = new Map<string, { checkInCount: number; productInterestCount: number; documentationCount: number; latestDescription: string }>();

    plans.forEach((plan, index) => {
      const visits = routeVisitsQueries[index]?.data?.data ?? [];
      const checkInCount = visits.filter((visit) => !!visit.check_in_at).length;
      const productInterestCount = visits.reduce((sum, visit) => sum + (visit.product_interest_count ?? 0), 0);
      const documentationCount = visits.reduce((sum, visit) => sum + parsePhotos(visit.photos).length, 0);
      const latestDescription = visits[0]?.notes || visits[0]?.result || visits[0]?.purpose || "-";

      mapping.set(plan.id, {
        checkInCount,
        productInterestCount,
        documentationCount,
        latestDescription,
      });
    });

    return mapping;
  }, [plans, routeVisitsQueries]);

  const detailedVisits = useMemo(() => {
    return activeVisitDetailQueries
      .map((query) => query.data?.data)
      .filter((visit): visit is VisitReport => !!visit);
  }, [activeVisitDetailQueries]);

  const filteredVisits = detailedVisits;

  const effectiveSelectedVisitId = useMemo(() => {
    if (activePlanDetailType !== "visit_report") {
      return selectedVisitId;
    }
    if (filteredVisits.length === 0) {
      return "";
    }

    const hasSelected = filteredVisits.some((visit) => visit.id === selectedVisitId);
    return hasSelected ? selectedVisitId : filteredVisits[0].id;
  }, [activePlanDetailType, filteredVisits, selectedVisitId]);

  const selectedVisitQuery = useVisitReportById(effectiveSelectedVisitId);

  const activeVisitInsights = useMemo(() => {
    const total = detailedVisits.length;
    const checkedIn = detailedVisits.filter((visit) => !!visit.check_in_at).length;
    const productInterests = detailedVisits.reduce((sum, visit) => sum + (visit.details?.length ?? 0), 0);
    const documentations = detailedVisits.reduce((sum, visit) => sum + parsePhotos(visit.photos).length, 0);

    return {
      total,
      checkedIn,
      productInterests,
      documentations,
    };
  }, [detailedVisits]);

  const totalSpent = activePlanExpensesQuery.data?.data?.total_amount ?? 0;
  const totalBudget = activePlan?.budget_amount ?? 0;
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);
  const expenseTypeOptions = formDataQuery.data?.data?.expense_types ?? [];

  const toggleParticipantAssignment = (employeeID: string) => {
    setSelectedParticipantIDs((current) =>
      current.includes(employeeID) ? current.filter((item) => item !== employeeID) : [...current, employeeID],
    );
  };

  const handleToggleParticipantAndAutoSave = async (employeeID: string) => {
    if (!canUpdateTravelPlanner || !activePlan || activePlan.plan_type === "visit_report") {
      return;
    }

    const current = detailSelectedParticipantIDs;
    const nextIDs = current.includes(employeeID)
      ? current.filter((item) => item !== employeeID)
      : [...current, employeeID];

    setDetailParticipantDraftIDs(nextIDs);

    await updateParticipantsMutation.mutateAsync({
      id: activePlan.id,
      participantIDs: nextIDs,
    });

    await activePlanQuery.refetch();
    setDetailParticipantDraftIDs(null);
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

    const visitMarkers = detailedVisits.flatMap((visit) => {
      const checkIn = parseGpsLocation(visit.check_in_location);
      const checkOut = parseGpsLocation(visit.check_out_location);
      const markersByVisit: MapMarker<PlannerMarkerData>[] = [];

      if (checkIn) {
        markersByVisit.push({
          id: `visit-in-${visit.id}`,
          latitude: checkIn.lat,
          longitude: checkIn.lng,
          data: {
            kind: "visit" as const,
            title: `${visit.code} • Check In`,
            subtitle: visit.address || visit.purpose || "Visit report",
            visitId: visit.id,
          },
        });
      }

      if (checkOut) {
        markersByVisit.push({
          id: `visit-out-${visit.id}`,
          latitude: checkOut.lat,
          longitude: checkOut.lng,
          data: {
            kind: "visit" as const,
            title: `${visit.code} • Check Out`,
            subtitle: visit.address || visit.purpose || "Visit report",
            visitId: visit.id,
          },
        });
      }

      if (markersByVisit.length > 0) {
        return markersByVisit;
      }

      if (typeof visit.latitude === "number" && typeof visit.longitude === "number") {
        return [
          {
            id: `visit-${visit.id}`,
            latitude: Number(visit.latitude),
            longitude: Number(visit.longitude),
            data: {
              kind: "visit" as const,
              title: visit.code,
              subtitle: visit.address || visit.purpose || "Visit report",
              visitId: visit.id,
            },
          },
        ];
      }

      return [];
    });

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
    setSelectedPlanId(createdId);
    setDetailParticipantDraftIDs(null);
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
  const selectedVisitCheckInCoords = parseGpsLocation(selectedVisitQuery.data?.data?.check_in_location);
  const selectedVisitCheckOutCoords = parseGpsLocation(selectedVisitQuery.data?.data?.check_out_location);
  const selectedVisitMapCoords = selectedVisitCheckOutCoords ?? selectedVisitCheckInCoords ?? (
    typeof selectedVisitQuery.data?.data?.latitude === "number" && typeof selectedVisitQuery.data?.data?.longitude === "number"
      ? { lat: Number(selectedVisitQuery.data.data.latitude), lng: Number(selectedVisitQuery.data.data.longitude) }
      : null
  );

  const renderSelectedVisitDetail = () => {
    if (activePlanDetailType !== "visit_report") {
      return null;
    }

    if (selectedVisitQuery.isLoading) {
      return (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }

    if (!selectedVisitQuery.data?.data) {
      return null;
    }

    const visit = selectedVisitQuery.data.data;

    return (
      <div className="space-y-5 rounded-xl border bg-card p-4 shadow-sm relative overflow-hidden w-full max-w-full ">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 relative z-10 w-full overflow-hidden">
          <div className="space-y-3 min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 tracking-wide font-medium">
                {visit.code}
              </Badge>
              {visit.outcome && <Badge variant="secondary" className="text-[10px] uppercase truncate max-w-[120px]">{visit.outcome}</Badge>}
            </div>
            
            <div className="min-w-0">
              <p className="text-lg font-bold tracking-tight text-foreground [word-break:break-word] whitespace-pre-wrap">{visit.customer?.name || t("visits.noCustomer")}</p>
              <div className="mt-2 space-y-1.5 text-sm text-muted-foreground w-full">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 opacity-70 shrink-0" /><span className="truncate">{visit.employee?.name || "-"}</span></div>
                {visit.address && <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5 opacity-70 shrink-0" /> <span className="line-clamp-2 leading-tight ">{visit.address}</span></div>}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground shrink-0 bg-muted/30" onClick={() => setSelectedVisitId("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 rounded-lg bg-muted/30 p-3 border border-border/50">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3 text-primary" /> Check In</span>
            <p className="text-sm font-medium">{formatTimeShort(visit.check_in_at)}</p>
            <p className="text-[10px] text-muted-foreground truncate" title={selectedVisitCheckInCoords ? `${selectedVisitCheckInCoords.lat}, ${selectedVisitCheckInCoords.lng}` : undefined}>
              {selectedVisitCheckInCoords ? formatLatLng(selectedVisitCheckInCoords.lat, selectedVisitCheckInCoords.lng) : "-"}
            </p>
          </div>
          <div className="space-y-1.5 rounded-lg bg-muted/30 p-3 border border-border/50">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Check Out</span>
            <p className="text-sm font-medium">{formatTimeShort(visit.check_out_at)}</p>
            <p className="text-[10px] text-muted-foreground truncate" title={selectedVisitCheckOutCoords ? `${selectedVisitCheckOutCoords.lat}, ${selectedVisitCheckOutCoords.lng}` : undefined}>
              {selectedVisitCheckOutCoords ? formatLatLng(selectedVisitCheckOutCoords.lat, selectedVisitCheckOutCoords.lng) : "-"}
            </p>
          </div>
        </div>

        {/* Details */}
          <div className="space-y-3 pt-1 w-full min-w-0">
            {visit.purpose && (
              <div className="w-full">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1"><Target className="h-3 w-3 opacity-70" /> Purpose</span>
                <p className="text-sm text-foreground leading-relaxed [word-break:break-word] whitespace-pre-wrap">{visit.purpose}</p>
              </div>
            )}
            {visit.result && (
              <div className="pt-2 w-full">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1"><FileText className="h-3 w-3 opacity-70" /> Result</span>
                <p className="text-sm text-foreground leading-relaxed [word-break:break-word] whitespace-pre-wrap">{visit.result}</p>
              </div>
            )}
            
            {(visit.lead?.code || visit.deal?.code) && (
              <div className="rounded-lg bg-muted/20 p-2.5 space-y-1.5 mt-3 border border-border/50 w-full overflow-hidden">
                {visit.lead?.code && (
                  <div className="text-xs flex justify-between items-center gap-2 overflow-hidden w-full">
                    <span className="text-muted-foreground font-medium shrink-0">Lead:</span>
                    <span className="text-foreground text-right truncate min-w-0 block">{visit.lead.code} - {`${visit.lead.first_name} ${visit.lead.last_name}`.trim()}</span>
                  </div>
                )}
                {visit.deal?.code && (
                  <div className="text-xs flex flex-row items-center gap-2 overflow-hidden w-full">
                    <span className="text-muted-foreground font-medium shrink-0">Pipeline:</span>
                    <span className="text-foreground text-right truncate min-w-0 block flex-1">{visit.deal.code} - {visit.deal.title}</span>
                  </div>
                )}
              </div>
            )}
        </div>

        <Separator className="opacity-70" />

        {/* Product Interest */}
        <div className="space-y-3 w-full">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Package className="h-3 w-3 opacity-70" /> Product Interest</p>
          {(visit.details ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic bg-muted/20 rounded-md p-2 text-center text-[13px]">No product interest recorded.</p>
          ) : (
            <div className="space-y-3 w-full">
              {(visit.details ?? []).map((detail) => (
                <div key={detail.id} className="rounded-lg border bg-muted/10 p-3 transition-colors hover:bg-muted/20 cursor-default w-full overflow-hidden">
                  <p className="text-[13px] font-semibold text-foreground [word-break:break-word] whitespace-pre-wrap">{detail.product?.name || "Unknown Product"}</p>
                  
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <div className="flex items-center text-warning shrink-0" title={`Interest: ${detail.interest_level}/5`}>
                      {"★".repeat(detail.interest_level)}{"☆".repeat(Math.max(0, 5 - detail.interest_level))}
                    </div>
                    <div className="text-muted-foreground flex items-center shrink-0">
                      Qty: <Badge variant="secondary" className="ml-1.5 rounded-sm px-1.5 py-0 font-mono text-[10px]">{detail.quantity ?? 0}</Badge>
                    </div>
                    <div className="text-muted-foreground flex items-center shrink-0">
                      Price: <span className="ml-1.5 font-medium text-foreground tracking-tight">{formatCurrency(detail.price ?? 0)}</span>
                    </div>
                  </div>
                  
                  {detail.notes && <p className="text-xs mt-2.5 text-muted-foreground italic border-l-2 pl-2 border-muted-foreground/30 py-0.5 [word-break:break-word] whitespace-pre-wrap">&ldquo;{detail.notes}&rdquo;</p>}
                  
                  {(detail.answers ?? []).length > 0 ? (
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-border/50 pt-2.5">
                      {(detail.answers ?? []).map((answer) => (
                        <div key={answer.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1.5 w-full">
                          <span className="text-[11px] text-muted-foreground/90 font-medium leading-tight [word-break:break-word] whitespace-pre-wrap flex-1">{answer.question_text || "Question"}</span>
                          <span className="text-[11px] font-semibold text-foreground bg-background px-1.5 py-0.5 rounded shadow-sm border border-border/40 inline-flex w-fit max-w-full items-baseline shrink-0">
                            <span className="truncate">{answer.option_text || answer.option_id || "-"}</span> 
                            {answer.score ? <span className="text-muted-foreground ml-1 opacity-60 shrink-0">({answer.score})</span> : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="opacity-70" />

        {/* Documentation */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ImageIcon className="h-3 w-3 opacity-70" /> Documentation</p>
          {visitPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground italic bg-muted/20 rounded-md p-2 text-center text-[13px]">No documentation photos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {visitPhotos.map((photoUrl, index) => (
                <button
                  key={`${photoUrl}-${index}`}
                  type="button"
                  className="group relative cursor-zoom-in overflow-hidden rounded-md border shadow-sm"
                  onClick={() => setZoomedPhotoUrl(resolveImageUrl(photoUrl) ?? photoUrl)}
                >
                  <Image
                    src={resolveImageUrl(photoUrl) ?? photoUrl}
                    alt={`Visit documentation ${index + 1}`}
                    width={320}
                    height={180}
                    unoptimized
                    className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <ZoomIn className="h-5 w-5 drop-shadow-md" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedVisitMapCoords && (
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors hover:border-primary/30"
              onClick={() => {
                const url = `https://www.google.com/maps?q=${selectedVisitMapCoords.lat},${selectedVisitMapCoords.lng}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <MapPinned className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderVisitReportCards = () => {
    if (filteredVisits.length === 0) {
      return (
        <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t("visits.linkedEmpty")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 relative w-full overflow-hidden px-1 pb-1">
        {/* Timeline Line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border/60 pointer-events-none hidden md:block" />
        
        {filteredVisits.filter((visit) => visit.id !== effectiveSelectedVisitId).map((visit) => (
          <div key={visit.id} className="relative z-10 pl-0 md:pl-10 w-full">
            {/* Timeline Dot (Desktop only) */}
            <div className="absolute left-3 top-5 h-2 w-2 rounded-full bg-primary/70 ring-4 ring-background hidden md:block" />
            
            <button
              type="button"
              className="w-full group rounded-xl border bg-card hover:bg-accent/30 hover:shadow-sm text-left transition-all cursor-pointer overflow-hidden flex flex-col"
              onClick={() => setSelectedVisitId(visit.id)}
            >
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{visit.customer?.name || t("visits.noCustomer")}</p>
                  <span className="text-[10px] font-medium text-muted-foreground/80 shrink-0 font-mono">{visit.code.split("-").pop() || visit.code}</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <User className="h-3.5 w-3.5 opacity-60" />
                  <span className="truncate">{visit.employee?.name || "-"}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    <Clock className="h-3 w-3" />
                    {formatTimeShort(visit.check_in_at)} - {formatTimeShort(visit.check_out_at)}
                  </div>
                  
                  <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                    {(visit.details?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 font-medium text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded"><Package className="h-3 w-3" />{visit.details?.length}</span>
                    )}
                    {parsePhotos(visit.photos).length > 0 && (
                      <span className="flex items-center gap-1 font-medium bg-muted px-1.5 py-0.5 rounded"><Camera className="h-3 w-3" />{parsePhotos(visit.photos).length}</span>
                    )}
                  </div>
                </div>
              </div>
              {visit.outcome && (
                <div className="px-3.5 py-2 bg-muted/20 border-t text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <span className="opacity-80">Outcome:</span> {visit.outcome}
                </div>
              )}
            </button>
          </div>
        ))}
        {renderSelectedVisitDetail()}
      </div>
    );
  };

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

          <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]>div]:block!">
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
                const visitSummary = routeVisitSummaryByPlan.get(plan.id) ?? {
                  checkInCount: 0,
                  productInterestCount: 0,
                  documentationCount: 0,
                  latestDescription: "-",
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
                      setSelectedPlanId(plan.id);
                      setDetailParticipantDraftIDs(null);
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
                      {planType !== "visit_report" && participants.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {participants.slice(0, 3).map((participant) => (
                              <Tooltip key={`${plan.id}-${participant.employee_id}`}>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Avatar className="h-7 w-7 border border-background cursor-pointer">
                                      <AvatarImage src={participant.employee_avatar_url || undefined} alt={participant.employee_name} />
                                      <AvatarFallback dataSeed={participant.employee_name}>{participant.employee_name}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">{participant.employee_name}</TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {participants.length > 3 ? `+${participants.length - 3} more` : `${participants.length} participant`}
                          </Badge>
                        </div>
                      ) : null}
                      {planType !== "visit_report" && participants.length === 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("visits.linkedEmpty")}
                        </Badge>
                      ) : null}
                    </div>
                    {planType === "visit_report" ? (
                      <div className="mt-3 space-y-2 rounded-md border bg-muted/40 p-2">
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Check In</p>
                            <p className="text-[11px] font-semibold leading-tight">{visitSummary.checkInCount}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Product</p>
                            <p className="text-[11px] font-semibold leading-tight">{visitSummary.productInterestCount}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Docs</p>
                            <p className="text-[11px] font-semibold leading-tight">{visitSummary.documentationCount}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{visitSummary.latestDescription}</p>
                      </div>
                    ) : (
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
                    )}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? "User"} />
                        <AvatarFallback dataSeed={user?.name ?? "guest"}>{user?.name ?? "U"}</AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{user?.name ?? t("context.notAuthenticated")}</TooltipContent>
                </Tooltip>
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
              {activePlanDetailType === "visit_report" ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Visit</span>
                    <span className="font-semibold">{activeVisitInsights.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Check In</span>
                    <span className="font-semibold">{activeVisitInsights.checkedIn}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />Product Interest</span>
                    <span className="font-semibold">{activeVisitInsights.productInterests}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Dokumentasi</span>
                    <span className="font-semibold">{activeVisitInsights.documentations}</span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
              {activePlanDetailType !== "visit_report" && (
                <div className="pt-2 border-t space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Participants</span>
                    <Badge variant="secondary" className="text-[10px]">{activePlanParticipants.length}</Badge>
                  </div>
                  <TooltipProvider>
                    <div className="flex flex-wrap items-center gap-2">
                      {activePlanParticipants.map((participant) => (
                        <Tooltip key={`active-${participant.employee_id}`}>
                          <TooltipTrigger asChild>
                            <div>
                              <Avatar className="h-7 w-7 border border-background cursor-pointer">
                                <AvatarImage src={participant.employee_avatar_url || undefined} alt={participant.employee_name} />
                                <AvatarFallback dataSeed={participant.employee_name}>{participant.employee_name}</AvatarFallback>
                              </Avatar>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">{participant.employee_name}</TooltipContent>
                        </Tooltip>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full cursor-pointer"
                        onClick={() => {
                          setParticipantPickerPage(1);
                          setParticipantPickerSearch("");
                          setIsParticipantPickerOpen(true);
                        }}
                        disabled={!canUpdateTravelPlanner || updateParticipantsMutation.isPending}
                        aria-label="Add participants"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {activePlanDetailType === "visit_report" ? (
              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
                Visit report mode is simplified for faster reading. Select a card to open full detail.
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

          <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]>div]:block!">
            <div className="p-2 space-y-2">
              {activePlanDetailType === "visit_report" ? (
                renderVisitReportCards()
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
                  const visitSummary = routeVisitSummaryByPlan.get(plan.id) ?? {
                    checkInCount: 0,
                    productInterestCount: 0,
                    documentationCount: 0,
                    latestDescription: "-",
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
                        setSelectedPlanId(plan.id);
                        setDetailParticipantDraftIDs(null);
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
                        {planType !== "visit_report" && participants.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {participants.slice(0, 3).map((participant) => (
                                <Avatar
                                  key={`${plan.id}-${participant.employee_id}`}
                                  className="h-7 w-7 border border-background"
                                  title={participant.employee_name}
                                >
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
                        {planType !== "visit_report" && participants.length === 0 ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {t("visits.linkedEmpty")}
                          </Badge>
                        ) : null}
                      </div>
                      {planType === "visit_report" ? (
                        <div className="mt-3 space-y-2 rounded-md border bg-muted/40 p-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Check In</p>
                              <p className="text-[11px] font-semibold leading-tight">{visitSummary.checkInCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Product</p>
                              <p className="text-[11px] font-semibold leading-tight">{visitSummary.productInterestCount}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Docs</p>
                              <p className="text-[11px] font-semibold leading-tight">{visitSummary.documentationCount}</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{visitSummary.latestDescription}</p>
                        </div>
                      ) : (
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
                      )}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Avatar className="h-10 w-10 cursor-pointer">
                          <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? "User"} />
                          <AvatarFallback dataSeed={user?.name ?? "guest"}>{user?.name ?? "U"}</AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{user?.name ?? t("context.notAuthenticated")}</TooltipContent>
                  </Tooltip>
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
                {activePlanDetailType === "visit_report" ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Visit</span>
                      <span className="font-semibold">{activeVisitInsights.total}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Check In</span>
                      <span className="font-semibold">{activeVisitInsights.checkedIn}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />Product Interest</span>
                      <span className="font-semibold">{activeVisitInsights.productInterests}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Dokumentasi</span>
                      <span className="font-semibold">{activeVisitInsights.documentations}</span>
                    </div>
                  </>
                ) : (
                  <>
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
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs uppercase tracking-wide">Participants</span>
                        <Badge variant="secondary" className="text-[10px]">{activePlanParticipants.length}</Badge>
                      </div>
                      <TooltipProvider>
                        <div className="flex flex-wrap items-center gap-2">
                          {activePlanParticipants.map((participant) => (
                            <Tooltip key={`mobile-active-${participant.employee_id}`}>
                              <TooltipTrigger asChild>
                                <div>
                                  <Avatar className="h-7 w-7 border border-background cursor-pointer">
                                    <AvatarImage src={participant.employee_avatar_url || undefined} alt={participant.employee_name} />
                                    <AvatarFallback dataSeed={participant.employee_name}>{participant.employee_name}</AvatarFallback>
                                  </Avatar>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">{participant.employee_name}</TooltipContent>
                            </Tooltip>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full cursor-pointer"
                            onClick={() => {
                              setParticipantPickerPage(1);
                              setParticipantPickerSearch("");
                              setIsParticipantPickerOpen(true);
                            }}
                            disabled={!canUpdateTravelPlanner || updateParticipantsMutation.isPending}
                            aria-label="Add participants"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </div>

              {activePlanDetailType === "visit_report" ? (
                <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
                  Visit report mode is simplified for faster reading. Select a card to open full detail.
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
                  renderVisitReportCards()
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

      <Dialog open={!!zoomedPhotoUrl} onOpenChange={(open) => !open && setZoomedPhotoUrl(null)}>
        <DialogContent size="2xl" className="p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle>Visit Documentation</DialogTitle>
          </DialogHeader>
          {zoomedPhotoUrl ? (
            <div className="max-h-[75vh] overflow-auto rounded-md border bg-muted/20 p-2">
              <Image
                src={zoomedPhotoUrl}
                alt="Visit documentation preview"
                width={1600}
                height={1000}
                unoptimized
                className="h-auto w-full rounded-md object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isParticipantPickerOpen} onOpenChange={setIsParticipantPickerOpen}>
        <DialogContent size="lg" className="space-y-3">
          <DialogHeader>
            <DialogTitle>Select Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={participantPickerSearch}
              onChange={(event) => {
                setParticipantPickerPage(1);
                setParticipantPickerSearch(event.target.value);
              }}
              placeholder="Search employee name or code"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-save enabled. Selecting an employee will save immediately.
            </p>
          </div>
          <div className="max-h-[55vh] space-y-2 overflow-auto rounded-md border p-2">
            {participantPickerQuery.isLoading ? (
              <div className="space-y-2 p-1">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : null}
            {!participantPickerQuery.isLoading && participantPickerItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active employees available.</p>
            ) : null}
            {participantPickerItems.map((employee) => {
              const selected = detailSelectedParticipantIDs.includes(employee.id);
              return (
                <button
                  key={`picker-participant-${employee.id}`}
                  type="button"
                  className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    selected ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                  }`}
                  onClick={() => void handleToggleParticipantAndAutoSave(employee.id)}
                  disabled={!canUpdateTravelPlanner || updateParticipantsMutation.isPending}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7" title={employee.name}>
                      <AvatarImage src={employee.avatar_url || undefined} alt={employee.name} />
                      <AvatarFallback dataSeed={employee.name}>{employee.name}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{employee.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{employee.employee_code}</p>
                    </div>
                    {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Page {participantPickerMeta?.page ?? participantPickerPage} / {participantPickerMeta?.total_pages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setParticipantPickerPage((page) => Math.max(page - 1, 1))}
                disabled={!participantPickerHasPrev || participantPickerQuery.isFetching}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setParticipantPickerPage((page) => page + 1)}
                disabled={!participantPickerHasNext || participantPickerQuery.isFetching}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsParticipantPickerOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </PageMotion>
  );
}

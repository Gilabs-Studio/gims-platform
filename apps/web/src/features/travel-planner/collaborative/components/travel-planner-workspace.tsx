"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Link, Navigation, Plus, RefreshCcw, Route, Save, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageMotion } from "@/components/motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { runAsyncExport } from "@/lib/async-export";
import { useExportProgress } from "@/lib/use-export-progress";
import { useVisitReportFormData } from "@/features/crm/visit-report/hooks/use-visit-reports";
import { useHasPermission, usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import {
  useCreateTravelExpense,
  useCreateTravelPlanVisit,
  useDeleteTravelExpense,
  useCreateTravelPlan,
  useLinkTravelPlanVisits,
  useOptimizeTravelRoute,
  useTravelPlan,
  useTravelPlanAvailableVisits,
  useTravelPlanExpenses,
  useTravelPlanGoogleMapsLinks,
  useTravelPlanVisits,
  useUnlinkTravelPlanVisit,
  useTravelPlannerFormData,
  useTravelPlannerPlaceSearch,
  useTravelPlans,
  useUpdateTravelPlan,
} from "../hooks/use-travel-planner";
import type { PlaceSearchResult, TravelPlan, TravelPlanInput } from "../types";
import { ItineraryBoard } from "./itinerary-board";
import { TravelMapPanel } from "./travel-map-panel";

function buildDefaultPlanInput(title: string, mode: string): TravelPlanInput {
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
    notes: "",
    days: [
      {
        day_index: 1,
        day_date: startDate,
        summary: "",
        stops: [
          {
            place_name: "Jakarta Checkpoint",
            latitude: -6.2088,
            longitude: 106.8456,
            category: "checkpoint",
            order_index: 1,
            is_locked: false,
            source: "manual",
            photo_url: "",
            note: "",
          },
        ],
        notes: [],
      },
    ],
  };
}

function toTravelPlanInput(plan: TravelPlan): TravelPlanInput {
  return {
    title: plan.title,
    mode: plan.mode,
    start_date: plan.start_date,
    end_date: plan.end_date,
    status: plan.status,
    notes: plan.notes,
    days: [...(plan.days ?? [])]
      .sort((a, b) => a.day_index - b.day_index)
      .map((day) => ({
        day_index: day.day_index,
        day_date: day.day_date,
        summary: day.summary,
        stops: [...(day.stops ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((stop, index) => ({
            place_name: stop.place_name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            category: stop.category,
            order_index: index + 1,
            is_locked: stop.is_locked,
            source: stop.source,
            photo_url: stop.photo_url,
            note: stop.note,
          })),
        notes: [...(day.notes ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((note, index) => ({
            icon_tag: note.icon_tag,
            note_text: note.note_text,
            note_time: note.note_time,
            order_index: index + 1,
          })),
      })),
  };
}

function collectCategories(plan: TravelPlan | null): string[] {
  if (!plan) {
    return [];
  }

  const categorySet = new Set<string>();
  for (const day of plan.days ?? []) {
    for (const stop of day.stops ?? []) {
      categorySet.add(stop.category);
    }
  }

  return [...categorySet];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TravelPlannerWorkspace() {
  const t = useTranslations("travelPlanner.workspace");
  const { user } = useAuthStore();
  const canReadTravelPlanner = useHasPermission("travel_planner.read");
  const travelPlannerReadScope = usePermissionScope("travel_planner.read");

  const plansQuery = useTravelPlans({ page: 1, per_page: 20 });
  const formDataQuery = useTravelPlannerFormData();

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [draftPlan, setDraftPlan] = useState<TravelPlan | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [newPlanTitle, setNewPlanTitle] = useState<string>("Logistics Collaborative Plan");
  const [newPlanMode, setNewPlanMode] = useState<string>("logistic");
  const [activeTab, setActiveTab] = useState<string>("planner");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchProvider, setSearchProvider] = useState<string>("auto");
  const [availableVisitSearch, setAvailableVisitSearch] = useState<string>("");

  const [newExpenseType, setNewExpenseType] = useState<string>("transport");
  const [newExpenseDate, setNewExpenseDate] = useState<string>(getTodayDate());
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>("");
  const [newExpenseDescription, setNewExpenseDescription] = useState<string>("");
  const [newExpenseReceiptUrl, setNewExpenseReceiptUrl] = useState<string>("");

  const [newVisitDate, setNewVisitDate] = useState<string>(getTodayDate());
  const [newVisitEmployeeId, setNewVisitEmployeeId] = useState<string>("");
  const [newVisitCustomerId, setNewVisitCustomerId] = useState<string>("none");
  const [newVisitContactPerson, setNewVisitContactPerson] = useState<string>("");
  const [newVisitContactPhone, setNewVisitContactPhone] = useState<string>("");
  const [newVisitAddress, setNewVisitAddress] = useState<string>("");
  const [newVisitPurpose, setNewVisitPurpose] = useState<string>("");
  const [newVisitNotes, setNewVisitNotes] = useState<string>("");
  const [selectedAvailableVisitIds, setSelectedAvailableVisitIds] = useState<string[]>([]);

  const plans = plansQuery.data?.data ?? [];
  const fallbackPlanId = plans[0]?.id ?? "";
  const activePlanId = selectedPlanId || fallbackPlanId;

  const selectedPlanQuery = useTravelPlan(activePlanId, !!activePlanId);
  const mapsLinksQuery = useTravelPlanGoogleMapsLinks(activePlanId, !!activePlanId);
  const expensesQuery = useTravelPlanExpenses(activePlanId, !!activePlanId);
  const visitsQuery = useTravelPlanVisits(activePlanId, !!activePlanId);
  const availableVisitsQuery = useTravelPlanAvailableVisits(availableVisitSearch, true);
  const visitFormDataQuery = useVisitReportFormData({ enabled: !!activePlanId });
  const placeSearchQuery = useTravelPlannerPlaceSearch(
    searchQuery,
    searchProvider === "auto" ? undefined : searchProvider,
  );

  const createPlanMutation = useCreateTravelPlan();
  const updatePlanMutation = useUpdateTravelPlan();
  const optimizeRouteMutation = useOptimizeTravelRoute();
  const exportProgress = useExportProgress();
  const createExpenseMutation = useCreateTravelExpense();
  const deleteExpenseMutation = useDeleteTravelExpense();
  const linkVisitsMutation = useLinkTravelPlanVisits();
  const unlinkVisitMutation = useUnlinkTravelPlanVisit();
  const createVisitMutation = useCreateTravelPlanVisit();

  const selectedPlan = selectedPlanQuery.data?.data ?? null;
  const activePlan = draftPlan?.id === activePlanId ? draftPlan : selectedPlan;
  const expenseTypes = formDataQuery.data?.data?.expense_types ?? [];
  const expenses = expensesQuery.data?.data?.items ?? [];
  const totalExpenseAmount = expensesQuery.data?.data?.total_amount ?? 0;
  const linkedVisits = visitsQuery.data?.data ?? [];
  const availableVisits = availableVisitsQuery.data?.data ?? [];
  const visitEmployees = visitFormDataQuery.data?.data?.employees ?? [];
  const visitCustomers = visitFormDataQuery.data?.data?.customers ?? [];

  const resolvedSelectedDayIndex = useMemo(() => {
    const dayIndexes = (activePlan?.days ?? []).map((day) => day.day_index);
    if (dayIndexes.includes(selectedDayIndex)) {
      return selectedDayIndex;
    }
    return dayIndexes[0] ?? 1;
  }, [activePlan?.days, selectedDayIndex]);

  const selectedDay = useMemo(() => {
    return activePlan?.days?.find((day) => day.day_index === resolvedSelectedDayIndex) ?? null;
  }, [activePlan?.days, resolvedSelectedDayIndex]);

  const availableCategories = useMemo(() => collectCategories(activePlan), [activePlan]);

  const resolvedSelectedCategories = useMemo(() => {
    if (availableCategories.length === 0) {
      return [];
    }

    const stillValid = selectedCategories.filter((category) => availableCategories.includes(category));
    return stillValid.length > 0 ? stillValid : availableCategories;
  }, [availableCategories, selectedCategories]);

  const activeDayGoogleMapsLink = useMemo(() => {
    const links = mapsLinksQuery.data?.data ?? [];
    return links.find((link) => link.day_index === resolvedSelectedDayIndex)?.url ?? "";
  }, [mapsLinksQuery.data?.data, resolvedSelectedDayIndex]);

  const handleCreatePlan = async () => {
    try {
      const payload = buildDefaultPlanInput(newPlanTitle.trim() || "Travel Plan", newPlanMode);
      const response = await createPlanMutation.mutateAsync(payload);
      const createdPlanId = response.data?.id ?? "";
      if (createdPlanId) {
        setSelectedPlanId(createdPlanId);
        setDraftPlan(null);
        setSelectedDayIndex(1);
      }
      toast.success(t("toasts.planCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const handleSavePlan = async () => {
    if (!activePlan?.id) {
      return;
    }

    try {
      const payload = toTravelPlanInput(activePlan);
      await updatePlanMutation.mutateAsync({
        id: activePlan.id,
        payload,
      });
      await selectedPlanQuery.refetch();
      toast.success(t("toasts.planSaved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const handleOptimizeRoute = async () => {
    if (!activePlanId) {
      return;
    }

    try {
      await optimizeRouteMutation.mutateAsync(activePlanId);
      setDraftPlan(null);
      await Promise.all([selectedPlanQuery.refetch(), mapsLinksQuery.refetch()]);
      toast.success(t("toasts.routeOptimized"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const handleAddPlaceToSelectedDay = (place: PlaceSearchResult) => {
    if (!activePlan || !selectedDay) {
      return;
    }

    const nextDays = activePlan.days.map((day) => {
      if (day.day_index !== selectedDay.day_index) {
        return day;
      }

      const nextStops = [
        ...(day.stops ?? []),
        {
          id: `tmp-stop-${selectedDay.day_index}-${(day.stops?.length ?? 0) + 1}-${place.latitude}-${place.longitude}`,
          place_name: place.place_name,
          latitude: place.latitude,
          longitude: place.longitude,
          category: place.category || "custom",
          order_index: (day.stops?.length ?? 0) + 1,
          is_locked: false,
          source: place.provider === "google_places" ? "google_places" : "open_street_map",
          photo_url: place.photo_url,
          note: place.address,
        },
      ].map((stop, index) => ({
        ...stop,
        order_index: index + 1,
      }));

      return {
        ...day,
        stops: nextStops,
      };
    });

    setDraftPlan({
      ...activePlan,
      days: nextDays,
    });

    if (!resolvedSelectedCategories.includes(place.category)) {
      setSelectedCategories((previous) => [...previous, place.category]);
    }

    toast.success(t("toasts.placeAdded"));
  };

  const handleExportPdf = async (dayIndex?: number) => {
    if (!activePlanId) {
      return;
    }

    try {
      await exportProgress.runWithProgress({
        endpoint: `/travel-planner/plans/${activePlanId}/export/pdf`,
        params: {
          day_index: dayIndex,
        },
      });
      toast.success(t("toasts.pdfExported"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const openGoogleMaps = () => {
    if (!activeDayGoogleMapsLink) {
      return;
    }
    window.open(activeDayGoogleMapsLink, "_blank", "noopener,noreferrer");
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) => {
      const baseline = previous.length > 0 ? previous : availableCategories;
      return baseline.includes(category)
        ? baseline.filter((value) => value !== category)
        : [...baseline, category];
    });
  };

  const handleCreateExpense = async () => {
    if (!activePlanId) {
      toast.error(t("errors.selectPlanFirst"));
      return;
    }

    const amount = Number(newExpenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("errors.invalidExpenseAmount"));
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        planId: activePlanId,
        payload: {
          expense_type: newExpenseType || expenseTypes[0]?.value || "other",
          description: newExpenseDescription.trim(),
          amount,
          expense_date: newExpenseDate,
          receipt_url: newExpenseReceiptUrl.trim(),
        },
      });
      setNewExpenseAmount("");
      setNewExpenseDescription("");
      setNewExpenseReceiptUrl("");
      toast.success(t("toasts.expenseCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!activePlanId) {
      return;
    }

    try {
      await deleteExpenseMutation.mutateAsync({
        planId: activePlanId,
        expenseId,
      });
      toast.success(t("toasts.expenseDeleted"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const toggleAvailableVisit = (visitId: string) => {
    setSelectedAvailableVisitIds((previous) =>
      previous.includes(visitId) ? previous.filter((id) => id !== visitId) : [...previous, visitId],
    );
  };

  const handleLinkVisits = async () => {
    if (!activePlanId) {
      toast.error(t("errors.selectPlanFirst"));
      return;
    }

    if (selectedAvailableVisitIds.length === 0) {
      toast.error(t("errors.selectVisitsToLink"));
      return;
    }

    try {
      const response = await linkVisitsMutation.mutateAsync({
        planId: activePlanId,
        payload: {
          visit_ids: selectedAvailableVisitIds,
        },
      });
      setSelectedAvailableVisitIds([]);
      toast.success(
        t("toasts.visitsLinked", {
          count: response.data?.linked_count ?? selectedAvailableVisitIds.length,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const handleUnlinkVisit = async (visitId: string) => {
    if (!activePlanId) {
      return;
    }

    try {
      await unlinkVisitMutation.mutateAsync({
        planId: activePlanId,
        visitId,
      });
      toast.success(t("toasts.visitUnlinked"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  const handleCreateVisit = async () => {
    if (!activePlanId) {
      toast.error(t("errors.selectPlanFirst"));
      return;
    }

    if (!newVisitEmployeeId) {
      toast.error(t("errors.employeeRequired"));
      return;
    }

    try {
      await createVisitMutation.mutateAsync({
        planId: activePlanId,
        payload: {
          visit_date: newVisitDate,
          employee_id: newVisitEmployeeId,
          customer_id: newVisitCustomerId !== "none" ? newVisitCustomerId : null,
          contact_person: newVisitContactPerson.trim(),
          contact_phone: newVisitContactPhone.trim(),
          address: newVisitAddress.trim(),
          purpose: newVisitPurpose.trim(),
          notes: newVisitNotes.trim(),
        },
      });

      setNewVisitContactPerson("");
      setNewVisitContactPhone("");
      setNewVisitAddress("");
      setNewVisitPurpose("");
      setNewVisitNotes("");
      toast.success(t("toasts.visitCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.genericError");
      toast.error(message);
    }
  };

  return (
    <PageMotion className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">{t("badge")}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("planBootstrap.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-5">
          <Input
            value={newPlanTitle}
            onChange={(event) => setNewPlanTitle(event.target.value)}
            placeholder={t("planBootstrap.titlePlaceholder")}
            className="lg:col-span-2"
          />
          <Select value={newPlanMode} onValueChange={setNewPlanMode}>
            <SelectTrigger className="lg:col-span-1 cursor-pointer">
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
          <Select
            value={activePlanId}
            onValueChange={(value) => {
              setSelectedPlanId(value);
              setDraftPlan(null);
              setSelectedDayIndex(1);
            }}
          >
            <SelectTrigger className="lg:col-span-1 cursor-pointer">
              <SelectValue placeholder={t("planBootstrap.pickExisting")} />
            </SelectTrigger>
            <SelectContent>
              {(plansQuery.data?.data ?? []).map((plan) => (
                <SelectItem key={plan.id} value={plan.id} className="cursor-pointer">
                  {plan.code} - {plan.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={handleCreatePlan}
            disabled={createPlanMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            {createPlanMutation.isPending ? t("actions.creating") : t("actions.createPlan")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("context.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? "User"} />
                <AvatarFallback dataSeed={user?.name ?? "guest"}>{user?.name ?? "User"}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("context.userLabel")}</p>
                <p className="text-sm font-semibold">{user?.name ?? t("context.notAuthenticated")}</p>
                <p className="text-xs text-muted-foreground">{user?.email ?? "-"}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("context.roleLabel")}</p>
                <p className="text-sm font-medium">{user?.role?.name ?? "-"}</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("context.scopeLabel")}</p>
                <p className="text-sm font-medium">{travelPlannerReadScope ?? t("context.scopeUnknown")}</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("context.permissionLabel")}</p>
                <Badge variant={canReadTravelPlanner ? "success" : "destructive"}>
                  {canReadTravelPlanner ? t("context.permissionGranted") : t("context.permissionMissing")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {plansQuery.isLoading || selectedPlanQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {plansQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errors.failedLoadPlansTitle")}</AlertTitle>
          <AlertDescription>{t("errors.failedLoadPlansDescription")}</AlertDescription>
        </Alert>
      ) : null}

      {selectedPlanQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errors.failedLoadPlanTitle")}</AlertTitle>
          <AlertDescription>{t("errors.failedLoadPlanDescription")}</AlertDescription>
        </Alert>
      ) : null}

      {activePlan ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-fit">
            <TabsTrigger value="planner" className="cursor-pointer">
              <Route className="h-4 w-4 mr-1" />
              {t("tabs.planner")}
            </TabsTrigger>
            <TabsTrigger value="operations" className="cursor-pointer">
              <Users className="h-4 w-4 mr-1" />
              {t("tabs.operations")}
            </TabsTrigger>
            <TabsTrigger value="insights" className="cursor-pointer">
              <FileDown className="h-4 w-4 mr-1" />
              {t("tabs.insights")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={handleOptimizeRoute}
                disabled={optimizeRouteMutation.isPending}
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                {optimizeRouteMutation.isPending ? t("actions.optimizing") : t("actions.optimize")}
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                onClick={handleSavePlan}
                disabled={updatePlanMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updatePlanMutation.isPending ? t("actions.saving") : t("actions.savePlan")}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("tabs.itinerary")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ItineraryBoard
                  days={activePlan.days ?? []}
                  selectedDayIndex={resolvedSelectedDayIndex}
                  onSelectDay={setSelectedDayIndex}
                  onChange={(nextDays) => {
                    setDraftPlan({
                      ...activePlan,
                      days: nextDays,
                    });
                  }}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-5">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">{t("placeSearch.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3">
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t("placeSearch.placeholder")}
                    />
                    <Select value={searchProvider} onValueChange={setSearchProvider}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto" className="cursor-pointer">
                          Auto
                        </SelectItem>
                        <SelectItem value="google" className="cursor-pointer">
                          Google Places
                        </SelectItem>
                        <SelectItem value="osm" className="cursor-pointer">
                          OpenStreetMap
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ScrollArea className="h-64 rounded-md border">
                    <div className="space-y-2 p-2">
                      {(placeSearchQuery.data?.data ?? []).map((place) => (
                        <button
                          key={`${place.provider}-${place.latitude}-${place.longitude}-${place.place_name}`}
                          type="button"
                          className="w-full rounded-md border p-2 text-left hover:bg-accent/60 transition-colors cursor-pointer"
                          onClick={() => handleAddPlaceToSelectedDay(place)}
                        >
                          <p className="text-sm font-medium">{place.place_name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{place.address}</p>
                        </button>
                      ))}
                      {!placeSearchQuery.isFetching && (placeSearchQuery.data?.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("placeSearch.empty")}</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">{t("tabs.map")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TravelMapPanel
                    days={activePlan.days ?? []}
                    selectedDayIndex={resolvedSelectedDayIndex}
                    selectedCategories={resolvedSelectedCategories}
                    onToggleCategory={toggleCategory}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("visits.createTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-3">
                      <Input
                        type="date"
                        value={newVisitDate}
                        onChange={(event) => setNewVisitDate(event.target.value)}
                      />
                      <Select value={newVisitEmployeeId} onValueChange={setNewVisitEmployeeId}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("visits.employeePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {visitEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id} className="cursor-pointer">
                              {employee.employee_code} - {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={newVisitCustomerId} onValueChange={setNewVisitCustomerId}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("visits.customerPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="cursor-pointer">
                            {t("visits.noCustomer")}
                          </SelectItem>
                          {visitCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id} className="cursor-pointer">
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={newVisitContactPerson}
                        onChange={(event) => setNewVisitContactPerson(event.target.value)}
                        placeholder={t("visits.contactPersonPlaceholder")}
                      />
                      <Input
                        value={newVisitContactPhone}
                        onChange={(event) => setNewVisitContactPhone(event.target.value)}
                        placeholder={t("visits.contactPhonePlaceholder")}
                      />
                      <Input
                        value={newVisitAddress}
                        onChange={(event) => setNewVisitAddress(event.target.value)}
                        placeholder={t("visits.addressPlaceholder")}
                      />
                      <Input
                        value={newVisitPurpose}
                        onChange={(event) => setNewVisitPurpose(event.target.value)}
                        placeholder={t("visits.purposePlaceholder")}
                        className="lg:col-span-2"
                      />
                      <Input
                        value={newVisitNotes}
                        onChange={(event) => setNewVisitNotes(event.target.value)}
                        placeholder={t("visits.notesPlaceholder")}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="cursor-pointer"
                        onClick={handleCreateVisit}
                        disabled={createVisitMutation.isPending}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {createVisitMutation.isPending ? t("visits.creating") : t("visits.createAction")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("visits.availableTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <Input
                        value={availableVisitSearch}
                        onChange={(event) => setAvailableVisitSearch(event.target.value)}
                        placeholder={t("visits.searchPlaceholder")}
                      />
                      <Button
                        type="button"
                        className="cursor-pointer"
                        onClick={handleLinkVisits}
                        disabled={linkVisitsMutation.isPending || selectedAvailableVisitIds.length === 0}
                      >
                        <Link className="h-4 w-4 mr-1" />
                        {linkVisitsMutation.isPending
                          ? t("visits.linking")
                          : t("visits.linkSelected", { count: selectedAvailableVisitIds.length })}
                      </Button>
                    </div>

                    {availableVisitsQuery.isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : null}

                    {availableVisitsQuery.isError ? (
                      <Alert variant="destructive">
                        <AlertDescription>{t("errors.failedLoadAvailableVisits")}</AlertDescription>
                      </Alert>
                    ) : null}

                    {!availableVisitsQuery.isLoading && !availableVisitsQuery.isError ? (
                      <ScrollArea className="h-52 rounded-md border">
                        <div className="space-y-2 p-2">
                          {availableVisits.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("visits.availableEmpty")}</p>
                          ) : null}
                          {availableVisits.map((visit) => {
                            const isSelected = selectedAvailableVisitIds.includes(visit.id);
                            return (
                              <label
                                key={visit.id}
                                className="flex items-start gap-3 rounded-md border p-2 hover:bg-accent/60 transition-colors cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 cursor-pointer"
                                  checked={isSelected}
                                  onChange={() => toggleAvailableVisit(visit.id)}
                                />
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{visit.code}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {visit.visit_date} • {visit.employee_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {visit.customer_name || t("visits.noCustomer")}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("visits.linkedTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {visitsQuery.isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : null}

                    {visitsQuery.isError ? (
                      <Alert variant="destructive">
                        <AlertDescription>{t("errors.failedLoadTripVisits")}</AlertDescription>
                      </Alert>
                    ) : null}

                    {!visitsQuery.isLoading && !visitsQuery.isError ? (
                      <div className="space-y-2">
                        {linkedVisits.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("visits.linkedEmpty")}</p>
                        ) : null}
                        {linkedVisits.map((visit) => (
                          <div key={visit.id} className="flex items-center justify-between rounded-md border p-3 gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{visit.code}</p>
                              <p className="text-xs text-muted-foreground">
                                {visit.visit_date} • {visit.employee_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {visit.customer_name || t("visits.noCustomer")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => handleUnlinkVisit(visit.id)}
                              disabled={unlinkVisitMutation.isPending}
                            >
                              {t("visits.unlinkAction")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("expenses.createTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Select value={newExpenseType} onValueChange={setNewExpenseType}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("expenses.typePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseTypes.map((expenseType) => (
                            <SelectItem key={expenseType.value} value={expenseType.value} className="cursor-pointer">
                              {expenseType.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={newExpenseDate}
                        onChange={(event) => setNewExpenseDate(event.target.value)}
                      />
                      <Input
                        type="number"
                        value={newExpenseAmount}
                        onChange={(event) => setNewExpenseAmount(event.target.value)}
                        placeholder={t("expenses.amountPlaceholder")}
                        min="0"
                        step="0.01"
                      />
                      <Input
                        value={newExpenseDescription}
                        onChange={(event) => setNewExpenseDescription(event.target.value)}
                        placeholder={t("expenses.descriptionPlaceholder")}
                      />
                      <Input
                        value={newExpenseReceiptUrl}
                        onChange={(event) => setNewExpenseReceiptUrl(event.target.value)}
                        placeholder={t("expenses.receiptPlaceholder")}
                        className="lg:col-span-2"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="cursor-pointer"
                        onClick={handleCreateExpense}
                        disabled={createExpenseMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {createExpenseMutation.isPending ? t("expenses.creating") : t("expenses.createAction")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("expenses.summaryTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{formatCurrency(totalExpenseAmount)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("expenses.listTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expensesQuery.isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : null}

                    {expensesQuery.isError ? (
                      <Alert variant="destructive">
                        <AlertDescription>{t("errors.failedLoadExpenses")}</AlertDescription>
                      </Alert>
                    ) : null}

                    {!expensesQuery.isLoading && !expensesQuery.isError ? (
                      <div className="space-y-2">
                        {expenses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("expenses.empty")}</p>
                        ) : null}
                        {expenses.map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between rounded-md border p-3 gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{expense.expense_type}</p>
                              <p className="text-xs text-muted-foreground">
                                {expense.expense_date} • {formatCurrency(expense.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {expense.description || t("expenses.noDescription")}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => handleDeleteExpense(expense.id)}
                              disabled={deleteExpenseMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t("expenses.deleteAction")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("export.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={() => handleExportPdf()}
                    disabled={exportProgress.isExporting}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {exportProgress.label(t("export.fullPdf"))}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleExportPdf(resolvedSelectedDayIndex)}
                    disabled={exportProgress.isExporting}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {exportProgress.isExporting
                      ? exportProgress.label(t("export.dayPdf", { day: resolvedSelectedDayIndex }))
                      : t("export.dayPdf", { day: resolvedSelectedDayIndex })}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={openGoogleMaps}
                    disabled={!activeDayGoogleMapsLink}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    {t("export.openGoogleMaps")}
                  </Button>
                </div>

                <ScrollArea className="h-40 rounded-md border">
                  <div className="space-y-2 p-2">
                    {(mapsLinksQuery.data?.data ?? []).map((link) => (
                      <button
                        key={link.day_id}
                        type="button"
                        className="w-full rounded-md border p-2 text-left hover:bg-accent/60 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedDayIndex(link.day_index);
                          if (link.url) {
                            window.open(link.url, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        <p className="text-sm font-medium">{t("export.dayRoute", { day: link.day_index })}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{link.url}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </PageMotion>
  );
}

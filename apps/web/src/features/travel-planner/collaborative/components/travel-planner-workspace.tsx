"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CloudSun, FileDown, MapPinned, Navigation, Plus, RefreshCcw, Route, Save } from "lucide-react";
import { toast } from "sonner";

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
import {
  useCreateTravelPlan,
  useExportTravelPlanPdf,
  useOptimizeTravelRoute,
  useTravelPlan,
  useTravelPlanGoogleMapsLinks,
  useTravelPlannerFormData,
  useTravelPlannerPlaceSearch,
  useTravelPlans,
  useTravelPlanWeather,
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
        weather_risk: "low",
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
        weather_risk: day.weather_risk,
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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function TravelPlannerWorkspace() {
  const t = useTranslations("travelPlanner.workspace");

  const plansQuery = useTravelPlans({ page: 1, per_page: 20 });
  const formDataQuery = useTravelPlannerFormData();

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [draftPlan, setDraftPlan] = useState<TravelPlan | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [newPlanTitle, setNewPlanTitle] = useState<string>("Logistics Collaborative Plan");
  const [newPlanMode, setNewPlanMode] = useState<string>("logistic");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchProvider, setSearchProvider] = useState<string>("auto");

  const plans = plansQuery.data?.data ?? [];
  const fallbackPlanId = plans[0]?.id ?? "";
  const activePlanId = selectedPlanId || fallbackPlanId;

  const selectedPlanQuery = useTravelPlan(activePlanId, !!activePlanId);
  const weatherQuery = useTravelPlanWeather(activePlanId, !!activePlanId);
  const mapsLinksQuery = useTravelPlanGoogleMapsLinks(activePlanId, !!activePlanId);
  const placeSearchQuery = useTravelPlannerPlaceSearch(
    searchQuery,
    searchProvider === "auto" ? undefined : searchProvider,
  );

  const createPlanMutation = useCreateTravelPlan();
  const updatePlanMutation = useUpdateTravelPlan();
  const optimizeRouteMutation = useOptimizeTravelRoute();
  const exportPdfMutation = useExportTravelPlanPdf();

  const selectedPlan = selectedPlanQuery.data?.data ?? null;
  const activePlan = draftPlan?.id === activePlanId ? draftPlan : selectedPlan;

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

  const weatherByDate = useMemo(() => {
    const entries = weatherQuery.data?.data?.days ?? [];
    const map = new Map<string, (typeof entries)[number]>();
    for (const entry of entries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [weatherQuery.data?.data?.days]);

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
          id: `tmp-stop-${Date.now()}`,
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
      const blob = await exportPdfMutation.mutateAsync({
        planId: activePlanId,
        dayIndex,
      });
      const filename = dayIndex ? `travel-plan-day-${dayIndex}.pdf` : "travel-plan.pdf";
      downloadBlob(blob, filename);
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
        <Tabs defaultValue="itinerary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="itinerary" className="cursor-pointer">
              <Route className="h-4 w-4 mr-1" />
              {t("tabs.itinerary")}
            </TabsTrigger>
            <TabsTrigger value="map" className="cursor-pointer">
              <MapPinned className="h-4 w-4 mr-1" />
              {t("tabs.map")}
            </TabsTrigger>
            <TabsTrigger value="weather" className="cursor-pointer">
              <CloudSun className="h-4 w-4 mr-1" />
              {t("tabs.weather")}
            </TabsTrigger>
            <TabsTrigger value="export" className="cursor-pointer">
              <FileDown className="h-4 w-4 mr-1" />
              {t("tabs.export")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="itinerary" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("placeSearch.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-4">
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("placeSearch.placeholder")}
                    className="lg:col-span-3"
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

                <ScrollArea className="h-40 rounded-md border">
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

            <TravelMapPanel
              days={activePlan.days ?? []}
              selectedDayIndex={resolvedSelectedDayIndex}
              selectedCategories={resolvedSelectedCategories}
              onToggleCategory={toggleCategory}
            />
          </TabsContent>

          <TabsContent value="weather" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("weather.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(activePlan.days ?? []).map((day) => {
                    const weather = weatherByDate.get(day.day_date);
                    return (
                      <div key={day.id} className="rounded-md border p-3 space-y-2">
                        <p className="text-sm font-medium">
                          {t("weather.dayLabel", { day: day.day_index })}
                        </p>
                        <p className="text-xs text-muted-foreground">{day.day_date}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>{weather?.temperature_min ?? "-"}°C</span>
                          <span>{weather?.temperature_max ?? "-"}°C</span>
                        </div>
                        <Badge variant="outline">{weather?.risk ?? t("weather.noData")}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {t("weather.precipitation")}: {weather?.precipitation_percent ?? "-"}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
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
                    disabled={exportPdfMutation.isPending}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {t("export.fullPdf")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleExportPdf(resolvedSelectedDayIndex)}
                    disabled={exportPdfMutation.isPending}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    {t("export.dayPdf", { day: resolvedSelectedDayIndex })}
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
                        <p className="text-sm font-medium">
                          {t("export.dayRoute", { day: link.day_index })}
                        </p>
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

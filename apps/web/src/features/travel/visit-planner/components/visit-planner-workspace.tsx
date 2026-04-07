"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import { PageMotion } from "@/components/motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapView, MarkerClusterGroup, type MapMarker } from "@/components/ui/map/map-view";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/features/finance/assets/components/date-picker";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useHasPermission, usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { cn } from "@/lib/utils";
import {
  useCreateVisitPlannerPlan,
  usePublishVisitLocation,
  useSubmitVisitAction,
  useUploadVisitPlannerImage,
  useVisitPlannerFormData,
  useVisitPlannerRealtime,
  useVisitPlannerRoutes,
} from "../hooks/use-visit-planner";
import type {
  ActiveVisitRoute,
  LocationUpdateEvent,
  NavigationCheckpointInput,
  VisitCheckpoint,
} from "../types";
import { VisitDetailsInline, type VisitActionPayload } from "./visit-details-inline";

type PlannerMarkerData =
  | { kind: "checkpoint"; checkpoint: VisitCheckpoint }
  | { kind: "live-location"; location: LocationUpdateEvent };

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });

const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456];

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;

    while (index < encoded.length) {
      const byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (byte < 0x20) {
        break;
      }
    }

    const latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += latitudeDelta;

    shift = 0;
    result = 0;

    while (index < encoded.length) {
      const byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (byte < 0x20) {
        break;
      }
    }

    const longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += longitudeDelta;

    points.push([latitude / 1e5, longitude / 1e5]);
  }

  return points;
}

function canSelectCheckpoint(checkpoint: VisitCheckpoint): boolean {
  return (
    checkpoint.can_select === true
    && typeof checkpoint.latitude === "number"
    && typeof checkpoint.longitude === "number"
  );
}

function statusLabelKey(status: string): string {
  switch (status) {
    case "pending":
      return "status.pending";
    case "checked_in":
    case "in_progress":
      return "status.checkedIn";
    case "checked_out":
      return "status.checkedOut";
    case "completed":
      return "status.completed";
    case "skipped":
      return "status.skipped";
    default:
      return "status.pending";
  }
}

function deriveRouteProgress(route: ActiveVisitRoute): { completed: number; total: number } {
  const checkpoints = route.checkpoints ?? [];
  const total = checkpoints.length;
  const completed = checkpoints.filter((checkpoint) => checkpoint.status === "completed").length;
  return { completed, total };
}

async function captureCurrentPosition(): Promise<{
  lat: number;
  lng: number;
  accuracy?: number;
  speed_mps?: number;
  heading_deg?: number;
  captured_at: string;
} | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : undefined,
          speed_mps: Number.isFinite(position.coords.speed ?? NaN)
            ? (position.coords.speed ?? undefined)
            : undefined,
          heading_deg: Number.isFinite(position.coords.heading ?? NaN)
            ? (position.coords.heading ?? undefined)
            : undefined,
          captured_at: new Date().toISOString(),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
  });
}

function VisitPlannerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <Skeleton className="h-[560px] w-full" />
        <Skeleton className="h-[560px] w-full" />
        <Skeleton className="h-[560px] w-full" />
      </div>
    </div>
  );
}

export function VisitPlannerWorkspace() {
  const t = useTranslations("visitPlanner");
  const tCommon = useTranslations("common");
  const { user } = useAuthStore();

  const canReadVisitPlanner = useHasPermission("travel.visit.read");
  const canCreateVisit = useHasPermission("travel.visit.create");
  const readScope = usePermissionScope("travel.visit.read");

  const [routeDate, setRouteDate] = useState<string>(getTodayDate());
  const [sidebarView, setSidebarView] = useState<"employees" | "checkpoints">("employees");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>("");
  const [liveLocations, setLiveLocations] = useState<Record<string, LocationUpdateEvent>>({});
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState("Field Visit Plan");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const effectiveEmployeeId = useMemo(() => {
    if (readScope === "OWN") {
      return user?.employee_id ?? undefined;
    }
    return undefined;
  }, [readScope, user?.employee_id]);

  const queryParams = useMemo(
    () => ({
      route_date: routeDate,
      employee_id: effectiveEmployeeId,
    }),
    [effectiveEmployeeId, routeDate],
  );

  useEffect(() => {
    // Reset to employees list view when date changes
    setSidebarView("employees");
    setSelectedRouteId("");
  }, [routeDate]);

  const formDataQuery = useVisitPlannerFormData(queryParams, {
    enabled: canReadVisitPlanner,
  });
  const routesQuery = useVisitPlannerRoutes(queryParams, {
    enabled: canReadVisitPlanner,
  });

  const createPlanMutation = useCreateVisitPlannerPlan();
  const submitVisitActionMutation = useSubmitVisitAction();
  const publishLocationMutation = usePublishVisitLocation();
  const uploadImageMutation = useUploadVisitPlannerImage();

  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data?.data]);
  const outcomes = formDataQuery.data?.data?.outcomes ?? [];
  const activityTypes = formDataQuery.data?.data?.activity_types ?? [];
  const products = formDataQuery.data?.data?.products ?? [];
  const candidateOptions = useMemo(
    () => [
      ...(formDataQuery.data?.data?.customers ?? []).map((item) => ({
        key: `customer:${item.id}`,
        label: item.label,
        type: "customer" as const,
        refId: item.id,
        lat: item.lat ?? undefined,
        lng: item.lng ?? undefined,
      })),
      ...(formDataQuery.data?.data?.leads ?? []).map((item) => ({
        key: `lead:${item.id}`,
        label: item.label,
        type: "lead" as const,
        refId: item.id,
        lat: item.lat ?? undefined,
        lng: item.lng ?? undefined,
      })),
      ...(formDataQuery.data?.data?.deals ?? []).map((item) => ({
        key: `deal:${item.id}`,
        label: item.label,
        type: "deal" as const,
        refId: item.id,
        lat: item.lat ?? undefined,
        lng: item.lng ?? undefined,
      })),
    ],
    [formDataQuery.data?.data?.customers, formDataQuery.data?.data?.deals, formDataQuery.data?.data?.leads],
  );

  const resolvedSelectedRouteID = useMemo(() => {
    if (routes.length === 0) return "";
    // In ALL scope employees-list view, don't auto-select a route
    if (readScope !== "OWN" && sidebarView === "employees") return selectedRouteId;
    if (selectedRouteId && routes.some((route) => route.id === selectedRouteId)) return selectedRouteId;
    return routes[0]?.id ?? "";
  }, [routes, selectedRouteId, readScope, sidebarView]);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === resolvedSelectedRouteID) ?? null,
    [routes, resolvedSelectedRouteID],
  );

  const sortedCheckpoints = useMemo(
    () => [...(selectedRoute?.checkpoints ?? [])].sort((a, b) => a.sequence - b.sequence),
    [selectedRoute?.checkpoints],
  );

  const resolvedSelectedCheckpointID = useMemo(() => {
    if (!selectedRoute) {
      return "";
    }

    const checkpointExists = sortedCheckpoints.some((checkpoint) => checkpoint.id === selectedCheckpointId);
    if (checkpointExists) {
      return selectedCheckpointId;
    }

    const fallbackCheckpoint = sortedCheckpoints.find((checkpoint) => canSelectCheckpoint(checkpoint))
      ?? sortedCheckpoints[0]
      ?? null;

    return fallbackCheckpoint?.id ?? "";
  }, [selectedCheckpointId, selectedRoute, sortedCheckpoints]);

  const selectedCheckpoint = useMemo(
    () => sortedCheckpoints.find((checkpoint) => checkpoint.id === resolvedSelectedCheckpointID) ?? null,
    [resolvedSelectedCheckpointID, sortedCheckpoints],
  );

  const visibleEmployeeIds = useMemo(() => {
    return Array.from(
      new Set(routes.map((route) => route.employee_id).filter((id) => id.trim().length > 0)),
    );
  }, [routes]);

  useVisitPlannerRealtime({
    enabled: canReadVisitPlanner,
    employeeIds: visibleEmployeeIds,
    onLocationUpdate: (event) => {
      const matchedRoute = routes.find((route) => route.employee_id === event.employee_id);
      setLiveLocations((previous) => ({
        ...previous,
        [event.employee_id]: {
          ...event,
          employee_name: event.employee_name ?? matchedRoute?.employee_name,
        },
      }));
    },
    onRouteStatus: () => {
      void routesQuery.refetch();
    },
  });

  const mapMarkers = useMemo<MapMarker<PlannerMarkerData>[]>(() => {
    const liveMarkers = Object.values(liveLocations)
      .filter((location) => typeof location.lat === "number" && typeof location.lng === "number")
      .map((location) => ({
        id: `live-${location.employee_id}`,
        latitude: location.lat,
        longitude: location.lng,
        data: {
          kind: "live-location" as const,
          location,
        },
      }));

    // In ALL scope employees-list view: only show live position markers (no checkpoints)
    if (readScope !== "OWN" && sidebarView === "employees") {
      return liveMarkers;
    }

    const checkpointMarkers = sortedCheckpoints
      .filter((checkpoint) => typeof checkpoint.latitude === "number" && typeof checkpoint.longitude === "number")
      .map((checkpoint) => ({
        id: checkpoint.id,
        latitude: checkpoint.latitude as number,
        longitude: checkpoint.longitude as number,
        data: {
          kind: "checkpoint" as const,
          checkpoint,
        },
      }));

    return [...checkpointMarkers, ...liveMarkers];
  }, [liveLocations, sortedCheckpoints, readScope, sidebarView]);

  const routePath = useMemo<[number, number][]>(() => {
    // No route path shown in employees-list view
    if (readScope !== "OWN" && sidebarView === "employees") return [];

    const encodedPolyline = selectedRoute?.optimization?.polyline ?? "";
    const decodedPolyline = encodedPolyline ? decodePolyline(encodedPolyline) : [];
    if (decodedPolyline.length > 1) {
      return decodedPolyline;
    }

    return sortedCheckpoints
      .filter((checkpoint) => typeof checkpoint.latitude === "number" && typeof checkpoint.longitude === "number")
      .map((checkpoint) => [checkpoint.latitude as number, checkpoint.longitude as number]);
  }, [selectedRoute?.optimization?.polyline, sortedCheckpoints, readScope, sidebarView]);

  const handleUploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const response = await uploadImageMutation.mutateAsync(file);
        return response.data?.url ?? null;
      } catch {
        toast.error(t("toast.imageUploadFailed"));
        return null;
      }
    },
    [t, uploadImageMutation],
  );

  const handleSubmitVisitAction = useCallback(
    async (payload: VisitActionPayload) => {
      if (!selectedRoute || !selectedCheckpoint) {
        return;
      }

      const capturedGps = await captureCurrentPosition();
      if (!capturedGps) {
        toast.error(t("toast.locationUnavailable"));
      }

      try {
        const response = await submitVisitActionMutation.mutateAsync({
          visit_id: selectedCheckpoint.visit_id,
          route_id: selectedRoute.id,
          checkpoint_id: selectedCheckpoint.id,
          lead_id: selectedCheckpoint.lead_id ?? undefined,
          deal_id: selectedCheckpoint.deal_id ?? undefined,
          customer_id: selectedCheckpoint.customer_id ?? undefined,
          action: payload.event,
          timestamp: new Date().toISOString(),
          notes: payload.notes,
          activity_type: payload.activity_type,
          outcome: payload.outcome,
          photos: payload.photos,
          distance_m: payload.distance_m,
          product_interests: payload.product_interests,
          location: capturedGps
            ? {
                lat: capturedGps.lat,
                lng: capturedGps.lng,
              }
            : undefined,
        });

        if (capturedGps) {
          await publishLocationMutation.mutateAsync({
            route_id: selectedRoute.id,
            checkpoint_id: selectedCheckpoint.id,
            employee_id: selectedRoute.employee_id,
            lat: capturedGps.lat,
            lng: capturedGps.lng,
            heading: capturedGps.heading_deg,
          });

          setLiveLocations((previous) => ({
            ...previous,
            [selectedRoute.employee_id]: {
              employee_id: selectedRoute.employee_id,
              employee_name: selectedRoute.employee_name,
              route_id: selectedRoute.id,
              checkpoint_id: selectedCheckpoint.id,
              lat: capturedGps.lat,
              lng: capturedGps.lng,
              activity_type: payload.activity_type,
              status: response.data?.visit?.status ?? selectedCheckpoint.status,
              timestamp: new Date().toISOString(),
            },
          }));
        }

        toast.success(t("toast.visitUpdated"));
        await routesQuery.refetch();
      } catch (error) {
        const message = error instanceof Error ? error.message : tCommon("error");
        toast.error(message);
      }
    },
    [
      publishLocationMutation,
      routesQuery,
      selectedCheckpoint,
      selectedRoute,
      submitVisitActionMutation,
      t,
      tCommon,
    ],
  );

  const toggleCandidate = useCallback((candidateKey: string) => {
    setSelectedCandidates((previous) => {
      if (previous.includes(candidateKey)) {
        return previous.filter((value) => value !== candidateKey);
      }
      return [...previous, candidateKey];
    });
  }, []);

  const handleCreatePlan = useCallback(async () => {
    if (selectedCandidates.length === 0) {
      toast.error("Select at least one customer, lead, or deal checkpoint.");
      return;
    }

    const checkpoints: NavigationCheckpointInput[] = selectedCandidates
      .map((candidateKey) => candidateOptions.find((item) => item.key === candidateKey))
      .filter((item): item is (typeof candidateOptions)[number] => !!item)
      .map((candidate) => ({
        type: candidate.type,
        ref_id: candidate.refId,
        lat: candidate.lat,
        lng: candidate.lng,
      }));

    try {
      await createPlanMutation.mutateAsync({
        title: planTitle.trim() || undefined,
        route_date: routeDate,
        employee_id: effectiveEmployeeId,
        checkpoints,
      });

      toast.success("Visit plan created successfully.");
      setSelectedCandidates([]);
      setIsCreatePlanDialogOpen(false);
      await routesQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : tCommon("error");
      toast.error(message);
    }
  }, [candidateOptions, createPlanMutation, effectiveEmployeeId, planTitle, routeDate, routesQuery, selectedCandidates, tCommon]);

  const renderMapMarkers = (markers: MapMarker<PlannerMarkerData>[]) => {
    return (
      <>
        <MarkerClusterGroup>
          {markers.map((marker) => {
            if (marker.data.kind === "checkpoint") {
              const checkpoint = marker.data.checkpoint;
              return (
                <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
                  <Popup>
                    <div className="w-64 space-y-2">
                      <p className="font-medium text-sm">{checkpoint.name}</p>
                      <Badge variant="outline">{t(statusLabelKey(checkpoint.status))}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {checkpoint.latitude?.toFixed(5) ?? "-"}, {checkpoint.longitude?.toFixed(5) ?? "-"}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            const liveLocation = marker.data.location;
            return (
              <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
                <Popup>
                  <div className="w-64 space-y-2">
                    <p className="font-medium text-sm">{liveLocation.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("panel.lastUpdate")}: {new Date(liveLocation.timestamp).toLocaleString()}
                    </p>
                    {liveLocation.activity_type ? (
                      <p className="text-xs text-muted-foreground">
                        {t("panel.activity")}: {liveLocation.activity_type}
                      </p>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {routePath.length > 1 ? (
          <>
            <Polyline
              positions={routePath}
              pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.5 }}
            />
            <Polyline
              positions={routePath}
              pathOptions={{ color: "#4f46e5", weight: 5, opacity: 1 }}
            />
          </>
        ) : null}
      </>
    );
  };

  if (!canReadVisitPlanner) {
    return (
      <PageMotion className="h-full w-full p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("permissions.deniedTitle")}</AlertTitle>
          <AlertDescription>{t("permissions.deniedDescription")}</AlertDescription>
        </Alert>
      </PageMotion>
    );
  }

  if (formDataQuery.isPending || routesQuery.isPending) {
    return (
      <PageMotion className="h-full w-full p-4 md:p-6">
        <VisitPlannerSkeleton />
      </PageMotion>
    );
  }

  if (formDataQuery.isError || routesQuery.isError) {
    return (
      <PageMotion className="h-full w-full p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("state.loadFailedTitle")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t("state.loadFailedDescription")}</p>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                void Promise.all([formDataQuery.refetch(), routesQuery.refetch()]);
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="relative h-full w-full min-h-0 overflow-hidden bg-transparent">
      <div className="relative h-full w-full overflow-hidden bg-background">
        <MapView
          markers={mapMarkers}
          renderMarkers={renderMapMarkers}
          className="h-full"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={10}
          showLayerControl
          selectedMarkerId={resolvedSelectedCheckpointID || null}
          mapProfile="balanced"
        />

        <div className="absolute inset-y-3 left-3 top-3 z-50 flex w-[min(360px,calc(100%-24px))] flex-col rounded-lg border bg-card/95 p-3 backdrop-blur-sm">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-sm">{t("title")}</h2>
            {canCreateVisit ? (
              <Button
                type="button"
                size="sm"
                className="cursor-pointer"
                onClick={() => setIsCreatePlanDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("sidebar.createPlan")}
              </Button>
            ) : null}
          </div>

          {/* Date Picker */}
          <DatePicker
            value={routeDate}
            onChange={setRouteDate}
            placeholder={t("filters.routeDate")}
          />

          {/* RBAC List */}
          <ScrollArea className="mt-3 min-h-0 flex-1">
            {readScope === "OWN" ? (
              sortedCheckpoints.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <MapPin className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("state.emptyTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("state.emptyDescription")}</p>
                </div>
              ) : (
                <div className="space-y-2 pr-1">
                  {sortedCheckpoints.map((checkpoint) => {
                    const isSelectable = canSelectCheckpoint(checkpoint);
                    const isSelected = checkpoint.id === resolvedSelectedCheckpointID;
                    return (
                      <button
                        key={checkpoint.id}
                        type="button"
                        disabled={!isSelectable}
                        className={cn(
                          "w-full rounded-md border p-2 text-left transition",
                          isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                          isSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                        )}
                        onClick={() => {
                          if (isSelectable) {
                            setSelectedCheckpointId(checkpoint.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{checkpoint.name}</p>
                          <Badge variant="outline">{checkpoint.sequence}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t(statusLabelKey(checkpoint.status))}</p>
                      </button>
                    );
                  })}
                </div>
              )
            ) : sidebarView === "employees" ? (
              routes.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <MapPin className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("state.emptyTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("state.emptyDescription")}</p>
                </div>
              ) : (
                <div className="space-y-2 pr-1">
                  {routes.map((route) => {
                    const progress = deriveRouteProgress(route);
                    return (
                      <button
                        key={route.id}
                        type="button"
                        className="w-full cursor-pointer rounded-md border p-3 text-left transition hover:bg-muted/50"
                        onClick={() => {
                          setSelectedRouteId(route.id);
                          setSidebarView("checkpoints");
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{route.employee_name}</p>
                          <Badge variant="outline">{route.route_type}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {progress.completed}/{progress.total} {t("sidebar.completed")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="space-y-2 pr-1">
                <button
                  type="button"
                  className="mb-1 flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelectedRouteId("");
                    setSelectedCheckpointId("");
                    setSidebarView("employees");
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("sidebar.backToEmployees")}
                </button>
                {selectedRoute ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{selectedRoute.employee_name}</p>
                      <Badge variant="outline">{selectedRoute.route_type}</Badge>
                    </div>
                    {sortedCheckpoints.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("state.emptyDescription")}</p>
                    ) : (
                      sortedCheckpoints.map((checkpoint) => {
                        const isSelectable = canSelectCheckpoint(checkpoint);
                        const isSelected = checkpoint.id === resolvedSelectedCheckpointID;
                        return (
                          <button
                            key={checkpoint.id}
                            type="button"
                            disabled={!isSelectable}
                            className={cn(
                              "w-full rounded-md border p-2 text-left transition",
                              isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                              isSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                            )}
                            onClick={() => {
                              if (isSelectable) {
                                setSelectedCheckpointId(checkpoint.id);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{checkpoint.name}</p>
                              <Badge variant="outline">{checkpoint.sequence}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{t(statusLabelKey(checkpoint.status))}</p>
                          </button>
                        );
                      })
                    )}
                  </>
                ) : null}
              </div>
            )}
            </ScrollArea>
        </div>

        <div className="absolute inset-y-3 right-3 top-3 z-50 w-[min(420px,calc(100%-24px))] overflow-auto">
          <VisitDetailsInline
            key={selectedCheckpoint?.id ?? "visit-details-empty"}
            route={selectedRoute}
            checkpoint={selectedCheckpoint}
            outcomes={outcomes}
            activityTypes={activityTypes}
            products={products}
            canSubmit={canCreateVisit}
            isSubmitting={submitVisitActionMutation.isPending}
            isUploadingImage={uploadImageMutation.isPending}
            onUploadImage={handleUploadImage}
            onSubmitAction={handleSubmitVisitAction}
          />
        </div>

        <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Visit Plan</DialogTitle>
              <DialogDescription>
                Pilih customer/lead/deal sebagai checkpoint route. Setelah dibuat, route bisa langsung check-in/check-out.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} placeholder="Plan title" />

              <div className="grid max-h-72 gap-2 overflow-auto rounded-md border p-3">
                {candidateOptions.map((candidate) => {
                  const checked = selectedCandidates.includes(candidate.key);
                  return (
                    <label key={candidate.key} className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCandidate(candidate.key)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{candidate.label}</span>
                      <Badge variant="outline" className="ml-auto">{candidate.type}</Badge>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  className="cursor-pointer"
                  disabled={createPlanMutation.isPending || selectedCandidates.length === 0}
                  onClick={() => {
                    void handleCreatePlan();
                  }}
                >
                  {createPlanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageMotion>
  );
}

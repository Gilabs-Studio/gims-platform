"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  NavigationOff,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import { PageMotion } from "@/components/motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useStartNavigation,
  useStopNavigation,
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
  NavigationStatusEvent,
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

/** Approximate distance (metres) between two WGS-84 coordinates using Haversine formula. */
function haversineDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat
    + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function canSelectCheckpoint(checkpoint: VisitCheckpoint): boolean {
  return (
    checkpoint.can_select === true
    && typeof checkpoint.latitude === "number"
    && typeof checkpoint.longitude === "number"
  );
}

/**
 * Creates a circular avatar Leaflet DivIcon for a live employee location marker.
 * Falls back to initials when no avatar URL is available.
 * Active navigation users receive a green border to distinguish them visually.
 */
function createAvatarIcon(name: string, avatarUrl?: string | null, isActiveNavigation?: boolean) {
  if (typeof window === "undefined") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  const inner = avatarUrl
    ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
    : `<span style="font-size:13px;font-weight:700;color:#fff;line-height:1">${initials}</span>`;

  // Green ring + border for actively navigating employees; indigo otherwise.
  const borderColor = isActiveNavigation ? "#22c55e" : "#4f46e5";
  const bgColor = isActiveNavigation ? "#166534" : "#4f46e5";
  const outerRing = isActiveNavigation
    ? `<div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;border:2px solid #22c55e;opacity:0.65;pointer-events:none"></div>`
    : "";

  const html = `<div style="position:relative;width:38px;height:38px;display:inline-block">${outerRing}<div style="width:38px;height:38px;border-radius:50%;border:2.5px solid ${borderColor};background:${bgColor};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${inner}</div></div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
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
  // Tracks whether the current OWN-scope user has an active GPS navigation session.
  const [isNavigating, setIsNavigating] = useState(false);
  // Stores current GPS position while navigating, used to fetch the road route to the next checkpoint.
  const [currentGpsPosition, setCurrentGpsPosition] = useState<{ lat: number; lng: number } | null>(null);
  // Decoded road-routed polyline from current GPS position to next pending checkpoint.
  const [navigationPolyline, setNavigationPolyline] = useState<[number, number][] | null>(null);
  // Target for programmatic map camera movement (auto-follow GPS + re-centre button).
  // Always set to a fresh object reference so the MapController effect reliably fires.
  const [mapFlyTarget, setMapFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  // Controls whether the left sidebar panel is collapsed to a narrow strip.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Ref persists the geolocation watcher ID across renders for cleanup.
  const geoWatchRef = useRef<number | null>(null);
  // Throttle: timestamp of the last published location update (frontend side).
  const lastPublishRef = useRef<number>(0);
  // AbortController for in-flight OSRM navigation route requests.
  const navRouteAbortRef = useRef<AbortController | null>(null);
  // Last position for which an OSRM route was successfully fetched, used to throttle by distance.
  const lastNavFetchPosRef = useRef<{ lat: number; lng: number } | null>(null);

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
  const startNavigationMutation = useStartNavigation();
  const stopNavigationMutation = useStopNavigation();
  const uploadImageMutation = useUploadVisitPlannerImage();

  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data?.data]);

  // The route ID to use for navigation — always the current user's own route.
  const navigationRouteId = useMemo(() => {
    const ownRoute = routes.find((route) => route.employee_id === user?.employee_id);
    return ownRoute?.id ?? (readScope === "OWN" ? routes[0]?.id : undefined) ?? undefined;
  }, [routes, user?.employee_id, readScope]);

  // Sorted checkpoints from the navigating user's own route, used to pick the navigation target.
  const ownRouteSortedCheckpoints = useMemo(() => {
    const ownRoute = routes.find((r) => r.employee_id === user?.employee_id)
      ?? (readScope === "OWN" ? routes[0] : null)
      ?? null;
    return [...(ownRoute?.checkpoints ?? [])].sort((a, b) => a.sequence - b.sequence);
  }, [routes, user?.employee_id, readScope]);
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
    // Update live location map with navigation status so the "Navigating" badge
    // is shown on the employee card without waiting for the next GPS update.
    onNavigationStatus: (event: NavigationStatusEvent) => {
      setLiveLocations((previous) => {
        const existing = previous[event.employee_id] ?? {
          employee_id: event.employee_id,
          lat: event.lat,
          lng: event.lng,
          timestamp: event.timestamp,
        };
        return {
          ...previous,
          [event.employee_id]: {
            ...existing,
            employee_name: event.employee_name ?? existing.employee_name,
            employee_avatar: event.employee_avatar ?? existing.employee_avatar,
            route_id: event.route_id ?? existing.route_id,
            lat: event.lat || existing.lat,
            lng: event.lng || existing.lng,
            navigation_status: event.status,
            timestamp: event.timestamp,
          },
        };
      });
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

  // GPS watchPosition effect: streams live coordinates to the backend while
  // the user has navigation active. A frontend throttle of 5 seconds mirrors
  // the backend throttle to avoid redundant network requests.
  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    if (!("geolocation" in navigator)) {
      toast.error(t("navigation.gpsUnavailable"));
      setIsNavigating(false);
      return;
    }

    const activeRouteId = navigationRouteId;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const gpsPos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentGpsPosition(gpsPos);
        // Frontend throttle: publish at most once every 5 seconds.
        if (now - lastPublishRef.current < 5000) return;
        lastPublishRef.current = now;

        void publishLocationMutation.mutateAsync({
          route_id: activeRouteId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading ?? undefined,
        }).catch(() => {
          // Non-fatal: silently skip failed location publishes during navigation.
        });
      },
      () => {
        // Geolocation error callback — informational only; navigation continues.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    geoWatchRef.current = watchId;

    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
    };
  }, [isNavigating, navigationRouteId, publishLocationMutation, t]);

  // Fetch a road-routed polyline from current GPS position to the next pending checkpoint via OSRM.
  // Throttled: only re-fetches when the user has moved more than 30 metres from the last fetch position.
  useEffect(() => {
    if (!isNavigating || !currentGpsPosition) {
      setNavigationPolyline(null);
      return;
    }

    // Find nearest pending checkpoint by haversine distance from current GPS position.
    // This matches Grab/Gojek behavior — route to closest unvisited stop, not first-by-sequence.
    const pendingWithCoords = ownRouteSortedCheckpoints.filter(
      (cp) =>
        cp.status === "pending"
        && typeof cp.latitude === "number"
        && typeof cp.longitude === "number",
    );

    const nextCheckpoint = pendingWithCoords.sort(
      (a, b) =>
        haversineDistanceM(currentGpsPosition, { lat: a.latitude as number, lng: a.longitude as number })
        - haversineDistanceM(currentGpsPosition, { lat: b.latitude as number, lng: b.longitude as number }),
    )[0];

    if (!nextCheckpoint) {
      setNavigationPolyline(null);
      return;
    }

    // Throttle: skip re-fetching if user hasn't moved more than 30 metres.
    if (
      lastNavFetchPosRef.current
      && haversineDistanceM(lastNavFetchPosRef.current, currentGpsPosition) < 30
    ) {
      return;
    }

    navRouteAbortRef.current?.abort();
    const controller = new AbortController();
    navRouteAbortRef.current = controller;

    const { lat: fromLat, lng: fromLng } = currentGpsPosition;
    const toLat = nextCheckpoint.latitude as number;
    const toLng = nextCheckpoint.longitude as number;

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=polyline`;

    fetch(osrmUrl, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { code?: string; routes?: Array<{ geometry: string }> }) => {
        const geometry = data.routes?.[0]?.geometry;
        if (geometry) {
          lastNavFetchPosRef.current = currentGpsPosition;
          setNavigationPolyline(decodePolyline(geometry));
        } else {
          // OSRM returned no route — fall back to straight line.
          setNavigationPolyline([[fromLat, fromLng], [toLat, toLng]]);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Network error or other failure: fall back to straight line.
        setNavigationPolyline([[fromLat, fromLng], [toLat, toLng]]);
      });

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, currentGpsPosition, ownRouteSortedCheckpoints]);

  const handleToggleNavigation = useCallback(async () => {
    const activeRouteId = navigationRouteId;

    if (isNavigating) {
      try {
        await stopNavigationMutation.mutateAsync({ route_id: activeRouteId });
        setIsNavigating(false);
        setCurrentGpsPosition(null);
        setNavigationPolyline(null);
        setMapFlyTarget(null);
        lastNavFetchPosRef.current = null;
        navRouteAbortRef.current?.abort();
        if (geoWatchRef.current !== null) {
          navigator.geolocation.clearWatch(geoWatchRef.current);
          geoWatchRef.current = null;
        }
        toast.success(t("navigation.stopped"));
      } catch {
        toast.error(tCommon("error"));
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      toast.error(t("navigation.gpsUnavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await startNavigationMutation.mutateAsync({
            route_id: activeRouteId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
          });
          setIsNavigating(true);
          toast.success(t("navigation.started"));
        } catch {
          toast.error(tCommon("error"));
        }
      },
      () => {
        toast.error(t("navigation.gpsUnavailable"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [isNavigating, navigationRouteId, startNavigationMutation, stopNavigationMutation, t, tCommon]);

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
    // First pending checkpoint with coordinates — used only as a visual fallback label; routing is done via OSRM state.
    const firstPendingCheckpoint = ownRouteSortedCheckpoints.find(
      (cp) => cp.status === "pending" && typeof cp.latitude === "number" && typeof cp.longitude === "number",
    );

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
            const avatarIcon = createAvatarIcon(
              liveLocation.employee_name ?? "?",
              liveLocation.employee_avatar,
              liveLocation.navigation_status === "navigating",
            );
            return (
              <Marker
                key={marker.id}
                position={[marker.latitude, marker.longitude]}
                icon={avatarIcon}
              >
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

        {/* Road-routed navigation line: current GPS → nearest pending checkpoint (via OSRM).
            Same indigo/white-halo style as the checkpoint-to-checkpoint route. */}
        {isNavigating && navigationPolyline && navigationPolyline.length > 1 ? (
          <>
            <Polyline
              positions={navigationPolyline}
              pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.5 }}
            />
            <Polyline
              positions={navigationPolyline}
              pathOptions={{ color: "#4f46e5", weight: 5, opacity: 1 }}
            />
          </>
        ) : isNavigating && currentGpsPosition && firstPendingCheckpoint ? (
          // Straight-line fallback while OSRM route is loading
          <>
            <Polyline
              positions={[
                [currentGpsPosition.lat, currentGpsPosition.lng],
                [firstPendingCheckpoint.latitude as number, firstPendingCheckpoint.longitude as number],
              ]}
              pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.3 }}
            />
            <Polyline
              positions={[
                [currentGpsPosition.lat, currentGpsPosition.lng],
                [firstPendingCheckpoint.latitude as number, firstPendingCheckpoint.longitude as number],
              ]}
              pathOptions={{ color: "#4f46e5", weight: 5, opacity: 0.5, dashArray: "8 6" }}
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
          flyToPosition={mapFlyTarget}
        />

        {/* Re-centre button — visible during active navigation so user can snap back to GPS */}
        {isNavigating && currentGpsPosition ? (
          <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="cursor-pointer gap-1.5 rounded-full shadow-lg backdrop-blur-sm"
              onClick={() => setMapFlyTarget({ ...currentGpsPosition })}
            >
              <LocateFixed className="h-4 w-4" />
              {t("navigation.recenter")}
            </Button>
          </div>
        ) : null}

        {isSidebarCollapsed ? (
          <div className="absolute inset-y-3 left-3 top-3 z-50 flex w-10 flex-col items-center rounded-lg border bg-card/95 py-2 backdrop-blur-sm">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="cursor-pointer h-7 w-7"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
        <div className="absolute inset-y-3 left-3 top-3 z-50 flex w-[min(360px,calc(100%-24px))] flex-col rounded-lg border bg-card/95 p-3 backdrop-blur-sm">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="cursor-pointer h-6 w-6 shrink-0"
                onClick={() => setIsSidebarCollapsed(true)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <h2 className="font-semibold text-sm truncate">{t("title")}</h2>
            </div>
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

          {/* Start / Stop Navigation — available to any user who has their own route today */}
          {canCreateVisit && navigationRouteId ? (
            <Button
              type="button"
              variant={isNavigating ? "destructive" : "secondary"}
              size="sm"
              className="mt-2 w-full cursor-pointer"
              disabled={startNavigationMutation.isPending || stopNavigationMutation.isPending}
              onClick={() => void handleToggleNavigation()}
            >
              {startNavigationMutation.isPending || stopNavigationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isNavigating ? (
                <NavigationOff className="h-4 w-4" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {startNavigationMutation.isPending
                ? t("navigation.startingButton")
                : stopNavigationMutation.isPending
                  ? t("navigation.stoppingButton")
                  : isNavigating
                    ? t("navigation.stopButton")
                    : t("navigation.startButton")}
            </Button>
          ) : null}

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
                    const isCompleted = checkpoint.status === "completed" || checkpoint.status === "checked_out";
                    const isInProgress = checkpoint.status === "checked_in" || checkpoint.status === "in_progress";
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
                          <div className="flex min-w-0 items-center gap-1.5">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                            ) : isInProgress ? (
                              <CheckCircle className="h-4 w-4 shrink-0 text-blue-500" />
                            ) : null}
                            <p className="truncate text-sm font-medium">{checkpoint.name}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0">{checkpoint.sequence}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t(statusLabelKey(checkpoint.status))}</p>
                        {((checkpoint.product_interest_count ?? 0) > 0 || (checkpoint.documentation_count ?? 0) > 0) ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(checkpoint.product_interest_count ?? 0) > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                {checkpoint.product_interest_count} {t("checkpoint.products")}
                              </Badge>
                            ) : null}
                            {(checkpoint.documentation_count ?? 0) > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                {checkpoint.documentation_count} {t("checkpoint.photos")}
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}
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
                          <div className="flex items-center gap-1">
                            {liveLocations[route.employee_id]?.navigation_status === "navigating" ? (
                              <Badge variant="default" className="gap-1 text-xs">
                                <Navigation className="h-3 w-3" />
                                {t("navigation.badge")}
                              </Badge>
                            ) : null}
                            <Badge variant="outline">{route.route_type}</Badge>
                          </div>
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
                        const isCompleted = checkpoint.status === "completed" || checkpoint.status === "checked_out";
                        const isInProgress = checkpoint.status === "checked_in" || checkpoint.status === "in_progress";
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
                              <div className="flex min-w-0 items-center gap-1.5">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                ) : isInProgress ? (
                                  <CheckCircle className="h-4 w-4 shrink-0 text-blue-500" />
                                ) : null}
                                <p className="truncate text-sm font-medium">{checkpoint.name}</p>
                              </div>
                              <Badge variant="outline" className="shrink-0">{checkpoint.sequence}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{t(statusLabelKey(checkpoint.status))}</p>
                            {((checkpoint.product_interest_count ?? 0) > 0 || (checkpoint.documentation_count ?? 0) > 0) ? (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {(checkpoint.product_interest_count ?? 0) > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {checkpoint.product_interest_count} {t("checkpoint.products")}
                                  </Badge>
                                ) : null}
                                {(checkpoint.documentation_count ?? 0) > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {checkpoint.documentation_count} {t("checkpoint.photos")}
                                  </Badge>
                                ) : null}
                              </div>
                            ) : null}
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
          )}

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

              <Tabs defaultValue="customers">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="customers" className="cursor-pointer">Customers</TabsTrigger>
                  <TabsTrigger value="pipeline" className="cursor-pointer">Pipeline (Leads &amp; Deals)</TabsTrigger>
                </TabsList>

                <TabsContent value="customers">
                  <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3">
                    {candidateOptions.filter((c) => c.type === "customer").map((candidate) => {
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
                    {candidateOptions.filter((c) => c.type === "customer").length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-4">No customers available</p>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="pipeline">
                  <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3">
                    {candidateOptions.filter((c) => c.type === "lead" || c.type === "deal").map((candidate) => {
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
                    {candidateOptions.filter((c) => c.type === "lead" || c.type === "deal").length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-4">No leads or deals in pipeline</p>
                    ) : null}
                  </div>
                </TabsContent>
              </Tabs>

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

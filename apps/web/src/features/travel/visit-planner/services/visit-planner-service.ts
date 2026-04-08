import { apiClient } from "@/lib/api-client";
import type {
  ActivityTypeOption,
  ActiveVisitRoute,
  ActiveVisitRoutesParams,
  ApiEnvelope,
  CreateVisitPlannerPlanRequest,
  CreateVisitPlannerPlanResponse,
  LocationSocketMessage,
  LocationUpdateEvent,
  LocationUpdateRequest,
  LocationUpdateResponse,
  NavigationStatusEvent,
  NavigationStatusResponse,
  OptimizeNavigationRequest,
  OptimizeNavigationResponse,
  RawActiveVisitRouteCheckpoint,
  RawActiveVisitRouteResponse,
  RawVisitPlannerFormDataResponse,
  RouteStatusEvent,
  StartNavigationRequest,
  StopNavigationRequest,
  VisitOutcomeOption,
  VisitLogRequest,
  VisitLogResponse,
  VisitPlannerFormDataParams,
  VisitPlannerFormDataResponse,
  VisitRouteType,
  VisitRouteTypeOption,
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
const BASE_URL = "/travel";

const DEFAULT_ROUTE_TYPES: VisitRouteTypeOption[] = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "customer", label: "Customer" },
  { value: "mixed", label: "Mixed" },
];

const DEFAULT_OUTCOMES: VisitOutcomeOption[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const DEFAULT_ACTIVITY_TYPES: ActivityTypeOption[] = [
  { value: "visit", label: "Visit" },
  { value: "follow_up", label: "Follow-up" },
  { value: "presentation", label: "Presentation" },
  { value: "negotiation", label: "Negotiation" },
];

function toWebsocketBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim();
  if (normalized.startsWith("https://")) {
    return `wss://${normalized.slice(8)}`;
  }
  if (normalized.startsWith("http://")) {
    return `ws://${normalized.slice(7)}`;
  }
  if (normalized.startsWith("wss://") || normalized.startsWith("ws://")) {
    return normalized;
  }
  return `ws://${normalized}`;
}

function deriveRouteType(checkpoints: RawActiveVisitRouteCheckpoint[]): VisitRouteType {
  const distinctTypes = new Set(checkpoints.map((checkpoint) => checkpoint.type));
  if (distinctTypes.size === 1) {
    return (Array.from(distinctTypes)[0] as VisitRouteType) ?? "customer";
  }
  if (distinctTypes.size > 1) {
    return "mixed";
  }
  return "customer";
}

function mapActiveRoute(rawRoute: RawActiveVisitRouteResponse): ActiveVisitRoute {
  const checkpoints = (rawRoute.checkpoints ?? []).map((checkpoint, index) => {
    const hasCoordinates = typeof checkpoint.lat === "number" && typeof checkpoint.lng === "number";
    const type = checkpoint.type;
    const refID = checkpoint.ref_id ?? undefined;

    return {
      id: checkpoint.checkpoint_id,
      visit_id: checkpoint.visit_id,
      sequence: index + 1,
      type,
      ref_id: checkpoint.ref_id,
      name: checkpoint.label,
      latitude: checkpoint.lat,
      longitude: checkpoint.lng,
      status: checkpoint.status,
      warning: checkpoint.warning,
      can_select: hasCoordinates,
      missing_location_reason: hasCoordinates ? undefined : checkpoint.warning,
      lead_id: type === "lead" ? refID : undefined,
      deal_id: type === "deal" ? refID : undefined,
      customer_id: type === "customer" ? refID : undefined,
    };
  });

  return {
    id: rawRoute.route_id,
    plan_code: rawRoute.plan_code,
    plan_title: rawRoute.plan_title,
    employee_id: rawRoute.employee_id,
    employee_name: rawRoute.employee_name,
    employee_avatar_url: rawRoute.employee_avatar_url,
    checkpoint_total: rawRoute.checkpoint_total,
    completed_total: rawRoute.completed_total,
    in_progress_total: rawRoute.in_progress_total,
    current_eta_s: rawRoute.current_eta_s,
    route_type: deriveRouteType(rawRoute.checkpoints ?? []),
    optimization: {
      polyline: rawRoute.polyline,
    },
    checkpoints,
  };
}

export interface LocationSocketParams {
  employeeIds?: string[];
  areaBBox?: string;
  onMessage: (message: LocationSocketMessage<LocationUpdateEvent | RouteStatusEvent | NavigationStatusEvent>) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export const visitPlannerService = {
  getFormData: async (params?: VisitPlannerFormDataParams): Promise<ApiEnvelope<VisitPlannerFormDataResponse>> => {
    const response = await apiClient.get<ApiEnvelope<RawVisitPlannerFormDataResponse>>(`${BASE_URL}/visit-planner/form-data`, {
      params,
    });

    return {
      ...response.data,
      data: {
        ...(response.data.data ?? {
          employees: [],
          leads: [],
          deals: [],
          customers: [],
          products: [],
          warnings: [],
        }),
        products: response.data.data?.products ?? [],
        route_types: DEFAULT_ROUTE_TYPES,
        outcomes: DEFAULT_OUTCOMES,
        activity_types: DEFAULT_ACTIVITY_TYPES,
      },
    };
  },

  listActiveRoutes: async (params?: ActiveVisitRoutesParams): Promise<ApiEnvelope<ActiveVisitRoute[]>> => {
    const response = await apiClient.get<ApiEnvelope<RawActiveVisitRouteResponse[]>>(`${BASE_URL}/visit-planner/routes`, {
      params,
    });

    const mappedRoutes = (response.data.data ?? []).map((route) => mapActiveRoute(route));
    const filteredRoutes = params?.route_type
      ? mappedRoutes.filter((route) => route.route_type === params.route_type)
      : mappedRoutes;

    return {
      ...response.data,
      data: filteredRoutes,
    };
  },

  optimizeRoute: async (payload: OptimizeNavigationRequest): Promise<ApiEnvelope<OptimizeNavigationResponse>> => {
    const response = await apiClient.post<ApiEnvelope<OptimizeNavigationResponse>>(`${BASE_URL}/navigation/optimize`, payload);
    return response.data;
  },

  submitVisitAction: async (payload: VisitLogRequest): Promise<ApiEnvelope<VisitLogResponse>> => {
    const response = await apiClient.post<ApiEnvelope<VisitLogResponse>>(`${BASE_URL}/visits`, payload);
    return response.data;
  },

  publishLocation: async (payload: LocationUpdateRequest): Promise<ApiEnvelope<LocationUpdateResponse>> => {
    const response = await apiClient.post<ApiEnvelope<LocationUpdateResponse>>(`${BASE_URL}/locations`, payload);
    return response.data;
  },

  uploadImage: async (file: File): Promise<ApiEnvelope<{ url: string; filename: string }>> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ApiEnvelope<{ url: string; filename: string }>>("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  createLocationSocket: (params: LocationSocketParams): WebSocket | null => {
    if (typeof window === "undefined") {
      return null;
    }

    const websocketBase = toWebsocketBaseUrl(API_BASE_URL);
    const url = new URL(`${websocketBase}/ws/travel/locations`);

    if (params.employeeIds && params.employeeIds.length > 0) {
      url.searchParams.set("employee_ids", params.employeeIds.join(","));
    }

    if (params.areaBBox) {
      url.searchParams.set("area_bbox", params.areaBBox);
    }

    const socket = new WebSocket(url.toString());

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as LocationSocketMessage<
          LocationUpdateEvent | RouteStatusEvent | NavigationStatusEvent
        >;
        params.onMessage(parsed);
      } catch {
        // Ignore malformed websocket payloads from transient network/proxy issues.
      }
    };

    if (params.onError) {
      socket.onerror = params.onError;
    }

    if (params.onClose) {
      socket.onclose = params.onClose;
    }

    return socket;
  },

  createPlan: async (
    payload: CreateVisitPlannerPlanRequest,
  ): Promise<ApiEnvelope<CreateVisitPlannerPlanResponse>> => {
    const response = await apiClient.post<ApiEnvelope<CreateVisitPlannerPlanResponse>>(
      `${BASE_URL}/visit-planner/plans`,
      payload,
    );
    return response.data;
  },

  // Broadcasts a navigation_started WebSocket event so scope-visible supervisors
  // see the sales employee begin their route on the live map.
  startNavigation: async (
    payload: StartNavigationRequest,
  ): Promise<ApiEnvelope<NavigationStatusResponse>> => {
    const response = await apiClient.post<ApiEnvelope<NavigationStatusResponse>>(
      `${BASE_URL}/locations/navigation/start`,
      payload,
    );
    return response.data;
  },

  // Broadcasts a navigation_stopped event to clear the live indicator.
  stopNavigation: async (
    payload: StopNavigationRequest,
  ): Promise<ApiEnvelope<NavigationStatusResponse>> => {
    const response = await apiClient.post<ApiEnvelope<NavigationStatusResponse>>(
      `${BASE_URL}/locations/navigation/stop`,
      payload,
    );
    return response.data;
  },
};

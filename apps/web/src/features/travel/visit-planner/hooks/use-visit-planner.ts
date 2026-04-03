"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { visitPlannerService } from "../services/visit-planner-service";
import type {
  ActiveVisitRoutesParams,
  CreateVisitPlannerPlanRequest,
  LocationUpdateEvent,
  LocationUpdateRequest,
  OptimizeNavigationRequest,
  RouteStatusEvent,
  VisitLogRequest,
  VisitPlannerFormDataParams,
} from "../types";

const QUERY_KEY = "travel-visit-planner";

export const visitPlannerKeys = {
  all: [QUERY_KEY] as const,
  formDataBase: () => [...visitPlannerKeys.all, "form-data"] as const,
  formData: (params?: VisitPlannerFormDataParams) => [...visitPlannerKeys.formDataBase(), params ?? {}] as const,
  routesBase: () => [...visitPlannerKeys.all, "routes"] as const,
  routes: (params?: ActiveVisitRoutesParams) => [...visitPlannerKeys.routesBase(), params ?? {}] as const,
};

export function useVisitPlannerFormData(params?: VisitPlannerFormDataParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: visitPlannerKeys.formData(params),
    queryFn: () => visitPlannerService.getFormData(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVisitPlannerRoutes(params?: ActiveVisitRoutesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: visitPlannerKeys.routes(params),
    queryFn: () => visitPlannerService.listActiveRoutes(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useOptimizeVisitNavigation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OptimizeNavigationRequest) => visitPlannerService.optimizeRoute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitPlannerKeys.routesBase() });
    },
  });
}

export function useCreateVisitPlannerPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVisitPlannerPlanRequest) => visitPlannerService.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitPlannerKeys.routesBase() });
      queryClient.invalidateQueries({ queryKey: visitPlannerKeys.formDataBase() });
    },
  });
}

export function useSubmitVisitAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VisitLogRequest) => visitPlannerService.submitVisitAction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitPlannerKeys.routesBase() });
      queryClient.invalidateQueries({ queryKey: visitPlannerKeys.formDataBase() });
    },
  });
}

export function usePublishVisitLocation() {
  return useMutation({
    mutationFn: (payload: LocationUpdateRequest) => visitPlannerService.publishLocation(payload),
  });
}

export function useUploadVisitPlannerImage() {
  return useMutation({
    mutationFn: (file: File) => visitPlannerService.uploadImage(file),
  });
}

export interface UseVisitPlannerRealtimeParams {
  employeeIds?: string[];
  areaBBox?: string;
  enabled?: boolean;
  onLocationUpdate?: (event: LocationUpdateEvent) => void;
  onRouteStatus?: (event: RouteStatusEvent) => void;
}

export function useVisitPlannerRealtime(params: UseVisitPlannerRealtimeParams) {
  const socketRef = useRef<WebSocket | null>(null);
  const onLocationUpdateRef = useRef(params.onLocationUpdate);
  const onRouteStatusRef = useRef(params.onRouteStatus);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const enabled = params.enabled ?? true;

  const employeeIdKey = useMemo(() => {
    return (params.employeeIds ?? []).filter((value) => value.trim().length > 0).join(",");
  }, [params.employeeIds]);

  const areaBBoxKey = useMemo(() => params.areaBBox?.trim() ?? "", [params.areaBBox]);

  useEffect(() => {
    onLocationUpdateRef.current = params.onLocationUpdate;
  }, [params.onLocationUpdate]);

  useEffect(() => {
    onRouteStatusRef.current = params.onRouteStatus;
  }, [params.onRouteStatus]);

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.close(1000, "Visit planner realtime disabled");
        socketRef.current = null;
      }
      return;
    }

    const employeeIds = employeeIdKey.length > 0 ? employeeIdKey.split(",") : undefined;
    const socket = visitPlannerService.createLocationSocket({
      employeeIds,
      areaBBox: areaBBoxKey || undefined,
      onMessage: (message) => {
        setLastMessageAt(new Date().toISOString());
        if (message.type === "location_update") {
          onLocationUpdateRef.current?.(message.data as LocationUpdateEvent);
          return;
        }
        if (message.type === "route_status") {
          onRouteStatusRef.current?.(message.data as RouteStatusEvent);
        }
      },
      onError: () => {
        setConnectionError("Failed to receive realtime location updates.");
      },
      onClose: () => {
        setIsConnected(false);
      },
    });

    if (!socket) {
      return;
    }

    socket.onopen = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, "Visit planner realtime cleanup");
        socketRef.current = null;
      }
    };
  }, [enabled, employeeIdKey, areaBBoxKey]);

  return {
    isConnected: enabled ? isConnected : false,
    connectionError: enabled ? connectionError : null,
    lastMessageAt,
  };
}

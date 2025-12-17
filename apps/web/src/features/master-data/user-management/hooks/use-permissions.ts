"use client";

import { useQuery } from "@tanstack/react-query";
import { permissionService } from "../services/user-service";

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionService.list(),
  });
}

export function usePermission(id: string) {
  return useQuery({
    queryKey: ["permission", id],
    queryFn: () => permissionService.getById(id),
    enabled: !!id,
  });
}


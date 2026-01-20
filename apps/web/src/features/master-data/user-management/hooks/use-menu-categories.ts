"use client";

import { useQuery } from "@tanstack/react-query";
import { permissionService } from "../services/user-service";

export function useMenuCategories() {
  return useQuery({
    queryKey: ["menu-categories"],
    queryFn: () => permissionService.getMenuCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

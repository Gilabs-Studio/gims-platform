"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { menuService } from "../services/menu-service";
import type { CreateMenuFormData, UpdateMenuFormData } from "../schemas/menu.schema";

const QUERY_KEY = ["menus"] as const;

export function useMenus(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, "list", params],
    queryFn: () => menuService.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMenu(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, "detail", id],
    queryFn: () => (id ? menuService.getById(id) : null),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMenuStats() {
  return useQuery({
    queryKey: [...QUERY_KEY, "stats"],
    queryFn: () => menuService.getStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMenuFormData) => menuService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMenuFormData }) => menuService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => menuService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

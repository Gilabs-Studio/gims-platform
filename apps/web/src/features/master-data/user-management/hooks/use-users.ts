"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService, roleService } from "../services/user-service";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useUsers(
  params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    role_id?: string;
  },
  options?: { enabled?: boolean }
) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["users", tenantScope, params],
    queryFn: () => userService.list(params),
    enabled: options?.enabled,
    staleTime: 10 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (might be expected)
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return false;
        }
      }
      return failureCount < 1;
    },
  });
}

export function useUser(id: string) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["users", tenantScope, id],
    queryFn: () => userService.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useMutation({
    mutationFn: (data: CreateUserFormData) => userService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Refresh the limit badge so the count is immediately accurate.
      queryClient.invalidateQueries({ queryKey: ["users", tenantScope, "limit"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserFormData }) =>
      userService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", tenantScope, "limit"] });
    },
  });
}

export function useUserPermissions(userId: string) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["users", tenantScope, userId, "permissions"],
    queryFn: () => userService.getPermissions(userId),
    enabled: !!userId,
  });
}

export function useRoles(options?: { enabled?: boolean }) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["roles", tenantScope],
    queryFn: () => roleService.list(),
    enabled: options?.enabled ?? true,
  });
}

export function useRole(id: string) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["roles", tenantScope, id],
    queryFn: () => roleService.getById(id),
    enabled: !!id,
  });
}


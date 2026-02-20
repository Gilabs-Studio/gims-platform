"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";
import type { Role, ListRolesResponse } from "../types";

export function useRoles(params?: { search?: string }) {
  return useQuery({
    queryKey: ["roles", params],
    queryFn: () => roleService.list(params),
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ["role", id],
    queryFn: () => roleService.getById(id),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleFormData) => roleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleFormData }) =>
      roleService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["roles"] });
      queryClient.setQueriesData({ queryKey: ["roles"] }, (old: ListRolesResponse | undefined) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((item: Role) => item.id === id ? { ...item, ...data } : item) };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["role", variables.id] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useAssignPermissionsToRole() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: ({
      roleId,
      permissionIds,
      assignments,
    }: {
      roleId: string;
      permissionIds: string[];
      assignments?: Array<{ permission_id: string; scope: string }>;
    }) => roleService.assignPermissions(roleId, permissionIds, assignments),
    onSuccess: async (updatedRole, variables) => {
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // If current user's role code matches the updated role, update permissions in auth store
      if (updatedRole?.code === user?.role?.code) {
        // Build permissions map (code -> scope) from updated role
        const permissionsMap: Record<string, string> = {};
        for (const p of updatedRole.permissions ?? []) {
          permissionsMap[p.code] = p.scope ?? "ALL";
        }
        
        setUser({
          ...user!,
          permissions: permissionsMap,
        });
      }
      
      // Invalidate user-permissions query last to trigger menu re-render
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });
}


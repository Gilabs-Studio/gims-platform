"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";
import type { Role, ListRolesResponse, RoleMenuAccessAssignment } from "../types";

export function useRoles(params?: { search?: string }) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["roles", tenantScope, params],
    queryFn: () => roleService.list(params),
  });
}

export function useRole(id: string) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["role", tenantScope, id],
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
      tolerant = false,
      diff,
    }: {
      roleId: string;
      permissionIds: string[];
      assignments?: Array<{ permission_id: string; scope: string }>;
      tolerant?: boolean;
      diff?: {
        added: string[];
        added_with_scope?: Array<{ permission_id: string; scope: string }>;
        removed: string[];
      };
    }) => roleService.assignPermissions(roleId, permissionIds, assignments, tolerant, diff),
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

export function useRoleMenuAccess(roleId: string) {
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  return useQuery({
    queryKey: ["role-menu-access", tenantScope, roleId],
    queryFn: () => roleService.getMenuAccess(roleId),
    enabled: !!roleId,
  });
}

export function useUpdateRoleMenuAccess() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: ({
      roleId,
      assignments,
    }: {
      roleId: string;
      assignments: RoleMenuAccessAssignment[];
    }) => roleService.updateMenuAccess(roleId, assignments),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["role-menu-access", variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });

      // If current user's role code matches the updated role, sync permissions
      if (user?.role?.code) {
        try {
          const updatedRole = await roleService.getById(variables.roleId);
          if (updatedRole?.code === user?.role?.code && updatedRole?.permissions) {
            // Build permissions map from updated role
            const permissionsMap: Record<string, string> = {};
            for (const p of updatedRole.permissions) {
              permissionsMap[p.code] = p.scope ?? "ALL";
            }
            
            setUser({
              ...user,
              permissions: permissionsMap,
            });
          }
        } catch (error) {
          // If role fetch fails, rely on user-permissions refetch to sync
          console.error("Failed to sync role permissions after menu-access update:", error);
        }
      }
    },
  });
}


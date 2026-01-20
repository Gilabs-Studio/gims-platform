"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "../services/user-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.id] });
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
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      roleService.assignPermissions(roleId, permissionIds),
    onSuccess: async (updatedRole, variables) => {
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.roleId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // If current user's role code matches the updated role, update permissions in auth store
      // This enables real-time sidebar update without page refresh
      if (updatedRole?.code === user?.role?.code) {
        // Extract permission codes from updated role
        const permissionCodes = updatedRole.permissions?.map(p => p.code) || [];
        
        // Update user in auth store with new permissions
        setUser({
          ...user!,
          permissions: permissionCodes,
        });
      }
      
      // Invalidate user-permissions query last to trigger menu re-render with new permissions
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
  });
}


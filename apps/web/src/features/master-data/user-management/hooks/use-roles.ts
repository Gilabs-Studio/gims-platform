"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "../services/user-service";
import type { CreateRoleFormData, UpdateRoleFormData } from "../schemas/role.schema";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.list(),
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
    onMutate: async (newRole) => {
      await queryClient.cancelQueries({ queryKey: ["roles"] });
      const previousRoles = queryClient.getQueryData(["roles"]);
      queryClient.setQueryData(["roles"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: [
            { id: `temp-${Date.now()}`, ...newRole, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            ...(old.data || []),
          ],
        };
      });
      return { previousRoles };
    },
    onError: (err, newRole, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(["roles"], context.previousRoles);
      }
    },
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
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["roles"] });
      await queryClient.cancelQueries({ queryKey: ["role", id] });
      const previousRoles = queryClient.getQueryData(["roles"]);
      const previousRole = queryClient.getQueryData(["role", id]);
      queryClient.setQueryData(["roles"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((item: any) =>
            item.id === id ? { ...item, ...updateData, updated_at: new Date().toISOString() } : item
          ),
        };
      });
      queryClient.setQueryData(["role", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousRoles, previousRole };
    },
    onError: (err, variables, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(["roles"], context.previousRoles);
      }
      if (context?.previousRole) {
        queryClient.setQueryData(["role", variables.id], context.previousRole);
      }
    },
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["roles"] });
      const previousRoles = queryClient.getQueryData(["roles"]);
      queryClient.setQueryData(["roles"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== id),
        };
      });
      return { previousRoles };
    },
    onError: (err, id, context) => {
      if (context?.previousRoles) {
        queryClient.setQueryData(["roles"], context.previousRoles);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useAssignPermissionsToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      roleService.assignPermissions(roleId, permissionIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.roleId] });
    },
  });
}


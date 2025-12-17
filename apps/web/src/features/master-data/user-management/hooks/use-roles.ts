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

  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      roleService.assignPermissions(roleId, permissionIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role", variables.roleId] });
    },
  });
}


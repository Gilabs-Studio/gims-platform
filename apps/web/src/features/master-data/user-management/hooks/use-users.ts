"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService, roleService } from "../services/user-service";
import type { CreateUserFormData, UpdateUserFormData } from "../schemas/user.schema";

export function useUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => userService.list(params),
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

export function useUser(id: number | string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => userService.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserFormData) => userService.create(data),
    onMutate: async (newUser) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previousUsers = queryClient.getQueriesData({ queryKey: ["users"] });
      queryClient.setQueriesData({ queryKey: ["users"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: [
            { id: Date.now(), ...newUser, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), is_active: true },
            ...(old.data || []),
          ],
          meta: {
            ...old.meta,
            pagination: { ...old.meta?.pagination, total: (old.meta?.pagination?.total || 0) + 1 },
          },
        };
      });
      return { previousUsers };
    },
    onError: (err, newUser, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateUserFormData }) =>
      userService.update(id, data),
    onMutate: async ({ id, data: updateData }) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      await queryClient.cancelQueries({ queryKey: ["users", id] });
      const previousUsers = queryClient.getQueriesData({ queryKey: ["users"] });
      const previousUser = queryClient.getQueryData(["users", id]);
      queryClient.setQueriesData({ queryKey: ["users"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((item: any) =>
            item.id === id ? { ...item, ...updateData, updated_at: new Date().toISOString() } : item
          ),
        };
      });
      queryClient.setQueryData(["users", id], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...updateData, updated_at: new Date().toISOString() } };
      });
      return { previousUsers, previousUser };
    },
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUser) {
        queryClient.setQueryData(["users", variables.id], context.previousUser);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => userService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previousUsers = queryClient.getQueriesData({ queryKey: ["users"] });
      queryClient.setQueriesData({ queryKey: ["users"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== id),
          meta: {
            ...old.meta,
            pagination: { ...old.meta?.pagination, total: Math.max(0, (old.meta?.pagination?.total || 0) - 1) },
          },
        };
      });
      return { previousUsers };
    },
    onError: (err, id, context) => {
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUserPermissions(userId: number | string) {
  return useQuery({
    queryKey: ["users", userId, "permissions"],
    queryFn: () => userService.getPermissions(userId),
    enabled: !!userId,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => roleService.list(),
  });
}

export function useRole(id: number | string) {
  return useQuery({
    queryKey: ["roles", id],
    queryFn: () => roleService.getById(id),
    enabled: !!id,
  });
}


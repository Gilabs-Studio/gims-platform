"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  evaluationGroupService,
  evaluationCriteriaService,
  employeeEvaluationService,
} from "../services/evaluation-service";
import type {
  ListEvaluationGroupsParams,
  ListEvaluationCriteriaParams,
  ListEmployeeEvaluationsParams,
  CreateEvaluationGroupData,
  UpdateEvaluationGroupData,
  CreateEvaluationCriteriaData,
  UpdateEvaluationCriteriaData,
  CreateEmployeeEvaluationData,
  UpdateEmployeeEvaluationData,
  UpdateEvaluationStatusData,
  EvaluationGroup,
  EvaluationGroupListResponse,
  EmployeeEvaluation,
  EmployeeEvaluationListResponse,
  EvaluationAuditTrailParams,
} from "../types";

// ---- Query Keys ----

export const evaluationGroupKeys = {
  all: ["evaluation-groups"] as const,
  lists: () => [...evaluationGroupKeys.all, "list"] as const,
  list: (params?: ListEvaluationGroupsParams) => [...evaluationGroupKeys.lists(), params] as const,
  details: () => [...evaluationGroupKeys.all, "detail"] as const,
  detail: (id: string) => [...evaluationGroupKeys.details(), id] as const,
  auditTrail: (id: string, params?: EvaluationAuditTrailParams) =>
    [...evaluationGroupKeys.all, "audit-trail", id, params] as const,
};

export const evaluationCriteriaKeys = {
  all: ["evaluation-criteria"] as const,
  lists: () => [...evaluationCriteriaKeys.all, "list"] as const,
  list: (params?: ListEvaluationCriteriaParams) => [...evaluationCriteriaKeys.lists(), params] as const,
  byGroup: (groupId: string, params?: ListEvaluationCriteriaParams) =>
    [...evaluationCriteriaKeys.all, "group", groupId, params] as const,
  details: () => [...evaluationCriteriaKeys.all, "detail"] as const,
  detail: (id: string) => [...evaluationCriteriaKeys.details(), id] as const,
};

export const employeeEvaluationKeys = {
  all: ["employee-evaluations"] as const,
  lists: () => [...employeeEvaluationKeys.all, "list"] as const,
  list: (params?: ListEmployeeEvaluationsParams) => [...employeeEvaluationKeys.lists(), params] as const,
  details: () => [...employeeEvaluationKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeEvaluationKeys.details(), id] as const,
  formData: () => [...employeeEvaluationKeys.all, "form-data"] as const,
  auditTrail: (id: string, params?: EvaluationAuditTrailParams) =>
    [...employeeEvaluationKeys.all, "audit-trail", id, params] as const,
};

// ---- Evaluation Group Hooks ----

export function useEvaluationGroups(params?: ListEvaluationGroupsParams) {
  return useQuery({
    queryKey: evaluationGroupKeys.list(params),
    queryFn: () => evaluationGroupService.list(params),
  });
}

export function useEvaluationGroup(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: evaluationGroupKeys.detail(id),
    queryFn: () => evaluationGroupService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useEvaluationGroupAuditTrail(
  id: string,
  params?: EvaluationAuditTrailParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: evaluationGroupKeys.auditTrail(id, params),
    queryFn: () => evaluationGroupService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateEvaluationGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEvaluationGroupData) => evaluationGroupService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.lists() });
    },
  });
}

export function useUpdateEvaluationGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEvaluationGroupData }) =>
      evaluationGroupService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: evaluationGroupKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: evaluationGroupKeys.lists() },
        (old: EvaluationGroupListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((group: EvaluationGroup) =>
              group.id === id ? { ...group, ...data } : group,
            ),
          };
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.auditTrail(variables.id) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.lists() });
    },
  });
}

export function useDeleteEvaluationGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => evaluationGroupService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.auditTrail(id) });
    },
  });
}

// ---- Evaluation Criteria Hooks ----

export function useEvaluationCriteria(params?: ListEvaluationCriteriaParams) {
  return useQuery({
    queryKey: evaluationCriteriaKeys.list(params),
    queryFn: () => evaluationCriteriaService.list(params),
  });
}

export function useEvaluationCriteriaByGroup(
  groupId: string,
  params?: ListEvaluationCriteriaParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: evaluationCriteriaKeys.byGroup(groupId, params),
    queryFn: () => evaluationCriteriaService.getByGroupId(groupId, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!groupId,
  });
}

export function useCreateEvaluationCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEvaluationCriteriaData) => evaluationCriteriaService.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evaluationCriteriaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evaluationCriteriaKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.auditTrail(variables.evaluation_group_id) });
    },
  });
}

export function useUpdateEvaluationCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEvaluationCriteriaData }) =>
      evaluationCriteriaService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evaluationCriteriaKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: evaluationCriteriaKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: [...evaluationGroupKeys.all, "audit-trail"] });
    },
  });
}

export function useDeleteEvaluationCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => evaluationCriteriaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluationCriteriaKeys.all });
      queryClient.invalidateQueries({ queryKey: evaluationGroupKeys.all });
      queryClient.invalidateQueries({ queryKey: [...evaluationGroupKeys.all, "audit-trail"] });
    },
  });
}

// ---- Employee Evaluation Hooks ----

export function useEmployeeEvaluations(params?: ListEmployeeEvaluationsParams) {
  return useQuery({
    queryKey: employeeEvaluationKeys.list(params),
    queryFn: () => employeeEvaluationService.list(params),
  });
}

export function useEmployeeEvaluation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeEvaluationKeys.detail(id),
    queryFn: () => employeeEvaluationService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useEmployeeEvaluationAuditTrail(
  id: string,
  params?: EvaluationAuditTrailParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: employeeEvaluationKeys.auditTrail(id, params),
    queryFn: () => employeeEvaluationService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useEmployeeEvaluationFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeEvaluationKeys.formData(),
    queryFn: () => employeeEvaluationService.getFormData(),
    enabled: options?.enabled,
  });
}

export function useCreateEmployeeEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEmployeeEvaluationData) => employeeEvaluationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.lists() });
    },
  });
}

export function useUpdateEmployeeEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeEvaluationData }) =>
      employeeEvaluationService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: employeeEvaluationKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: employeeEvaluationKeys.lists() },
        (old: EmployeeEvaluationListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((evaluation: EmployeeEvaluation) =>
              evaluation.id === id ? { ...evaluation, ...data } : evaluation,
            ),
          };
        },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.auditTrail(variables.id) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.lists() });
    },
  });
}

export function useDeleteEmployeeEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeeEvaluationService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.auditTrail(id) });
    },
  });
}

export function useUpdateEmployeeEvaluationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEvaluationStatusData }) =>
      employeeEvaluationService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeEvaluationKeys.auditTrail(variables.id) });
    },
  });
}

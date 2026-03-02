import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { visitReportService } from "../services/visit-report-service";
import type {
  VisitReportListParams,
  VisitReportEmployeeListParams,
  CreateVisitReportData,
  UpdateVisitReportData,
  CheckInData,
  CheckOutData,
  SubmitVisitData,
  ApproveVisitData,
  RejectVisitData,
} from "../types";

const QUERY_KEY = "crm-visit-reports";

export const visitReportKeys = {
  all: [QUERY_KEY] as const,
  lists: () => [...visitReportKeys.all, "list"] as const,
  list: (params: VisitReportListParams) => [...visitReportKeys.lists(), params] as const,
  details: () => [...visitReportKeys.all, "detail"] as const,
  detail: (id: string) => [...visitReportKeys.details(), id] as const,
  formData: () => [...visitReportKeys.all, "form-data"] as const,
  history: (id: string) => [...visitReportKeys.all, "history", id] as const,
  byEmployee: (params: VisitReportEmployeeListParams) => [...visitReportKeys.all, "by-employee", params] as const,
};

export function useVisitReports(params?: VisitReportListParams) {
  return useQuery({
    queryKey: visitReportKeys.list(params ?? {}),
    queryFn: () => visitReportService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVisitReportById(id: string) {
  return useQuery({
    queryKey: visitReportKeys.detail(id),
    queryFn: () => visitReportService.getById(id),
    enabled: !!id,
  });
}

export function useVisitReportFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: visitReportKeys.formData(),
    queryFn: () => visitReportService.getFormData(),
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useVisitReportHistory(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: visitReportKeys.history(id),
    queryFn: () => visitReportService.getProgressHistory(id),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export function useCreateVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVisitReportData) => visitReportService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
    },
  });
}

export function useUpdateVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVisitReportData }) =>
      visitReportService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
    },
  });
}

export function useDeleteVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitReportService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
    },
  });
}

export function useCheckInVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckInData }) =>
      visitReportService.checkIn(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
    },
  });
}

export function useCheckOutVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckOutData }) =>
      visitReportService.checkOut(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
    },
  });
}

export function useSubmitVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: SubmitVisitData }) =>
      visitReportService.submit(id, data),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
      qc.refetchQueries({ queryKey: visitReportKeys.detail(variables.id) });
    },
  });
}

export function useApproveVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveVisitData }) =>
      visitReportService.approve(id, data),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
      // Force refetch the specific detail to ensure UI sync
      qc.refetchQueries({ queryKey: visitReportKeys.detail(variables.id) });
    },
  });
}

export function useRejectVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectVisitData }) =>
      visitReportService.reject(id, data),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: visitReportKeys.all });
      // Force refetch the specific detail to ensure UI sync
      qc.refetchQueries({ queryKey: visitReportKeys.detail(variables.id) });
    },
  });
}

export function useUploadVisitPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, photoUrls }: { id: string; photoUrls: string[] }) =>
      visitReportService.uploadPhotos(id, photoUrls),
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey: visitReportKeys.detail(variables.id) });
    },
  });
}

/** Fetches per-employee visit report metrics for the ALL/DIVISION/AREA team views. */
export function useVisitReportsByEmployee(params?: VisitReportEmployeeListParams) {
  return useQuery({
    queryKey: visitReportKeys.byEmployee(params ?? {}),
    queryFn: () => visitReportService.listByEmployee(params),
    staleTime: 3 * 60 * 1000,
  });
}

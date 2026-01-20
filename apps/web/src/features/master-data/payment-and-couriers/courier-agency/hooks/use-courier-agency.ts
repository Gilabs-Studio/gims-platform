import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courierAgencyService } from "../services/courier-agency-service";
import type {
  CourierAgencyListParams,
  CreateCourierAgencyData,
  UpdateCourierAgencyData,
} from "../types";

const QUERY_KEY = "courier-agencies";

export function useCourierAgencies(params?: CourierAgencyListParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => courierAgencyService.list(params),
  });
}

export function useCourierAgencyById(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => courierAgencyService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCourierAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCourierAgencyData) =>
      courierAgencyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateCourierAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCourierAgencyData }) =>
      courierAgencyService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteCourierAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => courierAgencyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

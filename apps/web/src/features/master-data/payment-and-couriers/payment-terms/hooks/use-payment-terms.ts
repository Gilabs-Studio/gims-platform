import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentTermsService } from "../services/payment-terms-service";
import type {
  PaymentTermsListParams,
  CreatePaymentTermsData,
  UpdatePaymentTermsData,
} from "../types";

const QUERY_KEY = "payment-terms";

export function usePaymentTerms(params?: PaymentTermsListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => paymentTermsService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function usePaymentTermsById(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => paymentTermsService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePaymentTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentTermsData) =>
      paymentTermsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdatePaymentTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentTermsData }) =>
      paymentTermsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeletePaymentTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => paymentTermsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currencyService } from "../services/currency-service";
import type { CreateCurrencyData, CurrencyListParams, UpdateCurrencyData } from "../types";

const QUERY_KEY = "currencies";

export function useCurrencies(params?: CurrencyListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => currencyService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCurrency(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => currencyService.getById(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCurrencyData) => currencyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCurrencyData }) => currencyService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => currencyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
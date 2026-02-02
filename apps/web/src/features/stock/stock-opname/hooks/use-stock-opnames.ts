import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockOpnameService } from "../services/stock-opname.service";
import type {
  StockOpnameFilter,
  CreateStockOpnameRequest,
  UpdateStockOpnameRequest,
  UpdateStockOpnameStatusRequest,
  SaveStockOpnameItemsRequest,
} from "../types";

export const stockOpnameKeys = {
  all: ["stock-opnames"] as const,
  lists: () => [...stockOpnameKeys.all, "list"] as const,
  list: (params?: StockOpnameFilter) => [...stockOpnameKeys.lists(), params] as const,
  details: () => [...stockOpnameKeys.all, "detail"] as const,
  detail: (id: string) => [...stockOpnameKeys.details(), id] as const,
  items: (id: string) => [...stockOpnameKeys.detail(id), "items"] as const,
};

export function useStockOpnames(filters?: StockOpnameFilter) {
  return useQuery({
    queryKey: stockOpnameKeys.list(filters),
    queryFn: () => stockOpnameService.list(filters),
  });
}

export function useStockOpname(id: string | null) {
    return useQuery({
        queryKey: id ? stockOpnameKeys.detail(id) : ["stock-opname-detail-disabled"],
        queryFn: () => id ? stockOpnameService.getById(id) : Promise.reject("No ID"),
        enabled: !!id,
    });
}

export function useStockOpnameItems(id: string | null) {
    return useQuery({
        queryKey: id ? stockOpnameKeys.items(id) : ["stock-opname-items-disabled"],
        queryFn: () => id ? stockOpnameService.getItems(id) : Promise.reject("No ID"),
        enabled: !!id,
    });
}

export function useCreateStockOpname() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateStockOpnameRequest) => stockOpnameService.create(data),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
        }
    });
}

export function useUpdateStockOpname() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: UpdateStockOpnameRequest }) => stockOpnameService.update(id, data),
        onSuccess: (data) => {
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
        }
    });
}

export function useDeleteStockOpname() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => stockOpnameService.delete(id),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
        }
    });
}

export function useUpdateStockOpnameStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: UpdateStockOpnameStatusRequest }) => stockOpnameService.updateStatus(id, data),
        onSuccess: (data) => {
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
        }
    });
}

export function useSaveStockOpnameItems() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: SaveStockOpnameItemsRequest }) => stockOpnameService.saveItems(id, data),
        onSuccess: (data) => {
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
             queryClient.invalidateQueries({ queryKey: stockOpnameKeys.items(data.data.id) });
        }
    });
}

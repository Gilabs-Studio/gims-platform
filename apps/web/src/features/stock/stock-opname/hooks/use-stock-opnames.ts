import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { stockOpnameService } from "../services/stock-opname.service";
import type {
  CreateStockOpnameRequest,
  ProductStockLedgerFilter,
  SaveStockOpnameItemsRequest,
  StockOpnameFilter,
  StockOpnameItem,
  StockOpnameItemsFilter,
  StockOpnameItemsListResponse,
  StockOpnameSingleResponse,
  UpdateStockOpnameRequest,
  UpdateStockOpnameStatusRequest,
} from "../types";

export const stockOpnameKeys = {
  all: ["stock-opnames"] as const,
  lists: () => [...stockOpnameKeys.all, "list"] as const,
  list: (params?: StockOpnameFilter) => [...stockOpnameKeys.lists(), params] as const,
  details: () => [...stockOpnameKeys.all, "detail"] as const,
  detail: (id: string) => [...stockOpnameKeys.details(), id] as const,
  items: (id: string) => [...stockOpnameKeys.detail(id), "items"] as const,
  itemsPaged: (id: string, params?: StockOpnameItemsFilter) => [...stockOpnameKeys.items(id), params] as const,
  ledgers: (productId: string, filters?: ProductStockLedgerFilter) => [...stockOpnameKeys.all, "ledgers", productId, filters] as const,
  stockLevel: (productId: string, warehouseId: string) => [...stockOpnameKeys.all, "stock-level", productId, warehouseId] as const,
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
    queryFn: () => (id ? stockOpnameService.getById(id) : Promise.reject(new Error("No ID"))),
    enabled: !!id,
  });
}

export function useStockOpnameItems(id: string | null, params?: StockOpnameItemsFilter) {
  return useQuery({
    queryKey: id ? stockOpnameKeys.itemsPaged(id, params) : ["stock-opname-items-disabled"],
    queryFn: () => (id ? stockOpnameService.getItems(id, params) : Promise.reject(new Error("No ID"))),
    enabled: !!id,
  });
}

export function useStockOpnameItemsInfinite(id: string | null, perPage = 20) {
  return useInfiniteQuery({
    queryKey: id ? [...stockOpnameKeys.items(id), "infinite", perPage] : ["stock-opname-items-infinite-disabled"],
    queryFn: ({ pageParam = 1 }) =>
      id ? stockOpnameService.getItems(id, { page: pageParam, per_page: perPage }) : Promise.reject(new Error("No ID")),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.meta?.pagination;
      if (!pagination?.has_next) {
        return undefined;
      }
      return pagination.page + 1;
    },
    enabled: !!id,
  });
}

export function useProductStockLedgers(productId: string | null, filters?: ProductStockLedgerFilter) {
  return useQuery({
    queryKey: productId ? stockOpnameKeys.ledgers(productId, filters) : ["stock-opname-ledgers-disabled"],
    queryFn: () => (productId ? stockOpnameService.getProductLedgers(productId, filters) : Promise.reject(new Error("No product ID"))),
    enabled: !!productId,
  });
}

export function useProductStockLevel(productId: string | null, warehouseId: string | null) {
  return useQuery({
    queryKey: productId && warehouseId ? stockOpnameKeys.stockLevel(productId, warehouseId) : ["stock-level-disabled"],
    queryFn: () =>
      productId && warehouseId
        ? stockOpnameService.getProductStockLevel(productId, warehouseId)
        : Promise.reject(new Error("Missing product or warehouse ID")),
    enabled: !!productId && !!warehouseId,
  });
}

export function useCreateStockOpname() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStockOpnameRequest) => stockOpnameService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
    },
  });
}

export function useUpdateStockOpname() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStockOpnameRequest }) => stockOpnameService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
    },
  });
}

export function useDeleteStockOpname() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stockOpnameService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
    },
  });
}

export function useUpdateStockOpnameStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStockOpnameStatusRequest }) => stockOpnameService.updateStatus(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
    },
  });
}

export function useSaveStockOpnameItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveStockOpnameItemsRequest }) => stockOpnameService.saveItems(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.items(data.data.id) });
    },
  });
}

export function useGenerateStockOpnameJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stockOpnameService.generateJournal(id),
    onSuccess: (data) => {
      const opnameId = data.data.id;
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(opnameId) });
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.items(opnameId) });
    },
  });
}

export function useSubmitStockOpnameApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stockOpnameService.submitApproval(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: stockOpnameKeys.lists() });
    },
  });
}

export function useMyOpnameWarehouses() {
  return useQuery({
    queryKey: [...stockOpnameKeys.all, "my-warehouses"],
    queryFn: () => stockOpnameService.getMyWarehouses(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveStockOpnameLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveStockOpnameItemsRequest }) => stockOpnameService.saveItemLines(id, data),
    onMutate: async ({ id, data }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: stockOpnameKeys.detail(id) }),
        queryClient.cancelQueries({ queryKey: stockOpnameKeys.items(id) }),
      ]);

      const previousDetail = queryClient.getQueryData<StockOpnameSingleResponse>(stockOpnameKeys.detail(id));
      const previousItems = queryClient.getQueriesData<InfiniteData<StockOpnameItemsListResponse>>({ queryKey: stockOpnameKeys.items(id) });

      const incomingByProductId = new Map(data.items.map((line) => [line.product_id, line] as const));
      let nextTotalVariance = previousDetail?.data.total_variance_qty ?? 0;
      let nextNegativeVariance = previousDetail?.data.total_negative_variance_qty ?? 0;
      let nextPositiveVariance = previousDetail?.data.total_positive_variance_qty ?? 0;

      queryClient.setQueriesData<InfiniteData<StockOpnameItemsListResponse>>({ queryKey: stockOpnameKeys.items(id) }, (current) => {
        if (!current) return current;

        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((item: StockOpnameItem) => {
              const incoming = incomingByProductId.get(item.product_id);
              if (!incoming) {
                return item;
              }

              const previousVariance = item.variance_qty;
              const physicalQty = incoming.physical_qty ?? null;
              const nextVariance = physicalQty === null ? 0 : physicalQty - item.system_qty;

              nextTotalVariance += nextVariance - previousVariance;
              nextNegativeVariance += (nextVariance < 0 ? nextVariance : 0) - (previousVariance < 0 ? previousVariance : 0);
              nextPositiveVariance += (nextVariance > 0 ? nextVariance : 0) - (previousVariance > 0 ? previousVariance : 0);

              return {
                ...item,
                physical_qty: physicalQty,
                variance_qty: nextVariance,
                notes: incoming.notes ?? item.notes,
              };
            }),
          })),
        };
      });

      if (previousDetail?.data) {
        queryClient.setQueryData(stockOpnameKeys.detail(id), {
          ...previousDetail,
          data: {
            ...previousDetail.data,
            total_variance_qty: nextTotalVariance,
            total_negative_variance_qty: nextNegativeVariance,
            total_positive_variance_qty: nextPositiveVariance,
          },
        });
      }

      return { previousDetail, previousItems };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(stockOpnameKeys.detail(variables.id), context.previousDetail);
      }

      if (context?.previousItems) {
        for (const [queryKey, data] of context.previousItems) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(stockOpnameKeys.detail(data.data.id), data);
    },
  });
}

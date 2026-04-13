"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/product-service";
import type {
  CreateProductData,
  UpdateProductData,
  ApproveProductData,
  ProductListParams,
  RecipeItemRequest,
  CloneRecipeRequest,
} from "../types";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params?: ProductListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  recipe: (id: string) => [...productKeys.detail(id), "recipe"] as const,
  recipeVersions: (id: string) => [...productKeys.detail(id), "recipe-versions"] as const,
  recipeCompare: (id: string, fromVersionId: string, toVersionId: string) =>
    [...productKeys.detail(id), "recipe-compare", fromVersionId, toVersionId] as const,
};

export function useProducts(params?: ProductListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.list(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useProduct(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.getById(id),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductData) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      productService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useSubmitProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveProductData }) =>
      productService.approve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

export function useProductRecipe(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productKeys.recipe(id),
    queryFn: () => productService.getRecipe(id),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export function useUpdateProductRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: RecipeItemRequest[] }) =>
      productService.updateRecipe(id, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.recipe(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.recipeVersions(variables.id) });
    },
  });
}

export function useProductRecipeVersions(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productKeys.recipeVersions(id),
    queryFn: () => productService.getRecipeVersions(id),
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export function useCloneProductRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CloneRecipeRequest }) =>
      productService.cloneRecipeFromVersion(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.recipe(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.recipeVersions(variables.id) });
    },
  });
}

export function useCompareProductRecipeVersions(
  id: string,
  fromVersionId: string,
  toVersionId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: productKeys.recipeCompare(id, fromVersionId, toVersionId),
    queryFn: () => productService.compareRecipeVersions(id, fromVersionId, toVersionId),
    enabled: (options?.enabled ?? true) && !!id && !!fromVersionId && !!toVersionId,
  });
}

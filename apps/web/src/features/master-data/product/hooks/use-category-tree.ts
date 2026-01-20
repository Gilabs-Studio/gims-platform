"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { productCategoryService } from "../services/product-service";
import type { CategoryTreeNode, CategoryTreeParams } from "../types";

// Query keys for category tree
export const categoryTreeKeys = {
  all: ["category-tree"] as const,
  tree: (params?: CategoryTreeParams) => [...categoryTreeKeys.all, "tree", params] as const,
  children: (parentId: string) => [...categoryTreeKeys.all, "children", parentId] as const,
};

/**
 * Hook to fetch the full category tree
 */
export function useCategoryTree(params?: CategoryTreeParams) {
  return useQuery({
    queryKey: categoryTreeKeys.tree(params),
    queryFn: () => productCategoryService.getTree(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

/**
 * Hook to fetch children of a specific category (for lazy loading)
 */
export function useCategoryChildren(parentId: string, enabled = true) {
  return useQuery({
    queryKey: categoryTreeKeys.children(parentId),
    queryFn: () => productCategoryService.getChildren(parentId, { include_count: true }),
    enabled: enabled && !!parentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to manage category tree expansion state
 * Provides local state management for expanded nodes
 */
export function useCategoryTreeState() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const expandNode = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(categoryId);
      return next;
    });
  }, []);

  const collapseNode = useCallback((categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  }, []);

  const expandAll = useCallback((nodes: CategoryTreeNode[]) => {
    const collectIds = (items: CategoryTreeNode[]): string[] => {
      return items.flatMap((item) => [
        item.id,
        ...(item.children?.length ? collectIds(item.children) : []),
      ]);
    };
    setExpandedIds(new Set(collectIds(nodes)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedId(categoryId);
  }, []);

  const isExpanded = useCallback(
    (categoryId: string) => expandedIds.has(categoryId),
    [expandedIds]
  );

  // Prefetch children when hovering over a node
  const prefetchChildren = useCallback(
    (categoryId: string) => {
      queryClient.prefetchQuery({
        queryKey: categoryTreeKeys.children(categoryId),
        queryFn: () => productCategoryService.getChildren(categoryId, { include_count: true }),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return {
    expandedIds,
    selectedId,
    toggleExpanded,
    expandNode,
    collapseNode,
    expandAll,
    collapseAll,
    selectCategory,
    isExpanded,
    prefetchChildren,
  };
}

/**
 * Helper function to find a category in the tree by ID
 */
export function findCategoryInTree(
  nodes: CategoryTreeNode[],
  targetId: string
): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children?.length) {
      const found = findCategoryInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Helper function to get the path to a category (for breadcrumb)
 */
export function getCategoryPath(
  nodes: CategoryTreeNode[],
  targetId: string,
  path: CategoryTreeNode[] = []
): CategoryTreeNode[] | null {
  for (const node of nodes) {
    const newPath = [...path, node];
    if (node.id === targetId) {
      return newPath;
    }
    if (node.children?.length) {
      const found = getCategoryPath(node.children, targetId, newPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Helper function to count total products in a category including children
 */
export function getTotalProductCount(node: CategoryTreeNode): number {
  let count = node.product_count;
  if (node.children?.length) {
    for (const child of node.children) {
      count += getTotalProductCount(child);
    }
  }
  return count;
}

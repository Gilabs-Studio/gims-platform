import { useState, useMemo } from "react";
import type { AssetItem, AssetCategory, AssetItemStatus } from "../types";
import { INITIAL_ASSETS } from "../services/mock-data";

export function useAssets() {
  const [assets, setAssets] = useState<AssetItem[]>(INITIAL_ASSETS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<AssetItemStatus | "all">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        search === "" ||
        asset.name.toLowerCase().includes(search.toLowerCase()) ||
        asset.code.toLowerCase().includes(search.toLowerCase()) ||
        asset.finance_asset_code.toLowerCase().includes(search.toLowerCase()) ||
        asset.serial_number.toLowerCase().includes(search.toLowerCase()) ||
        asset.location.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || asset.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || asset.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, search, categoryFilter, statusFilter]);

  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, page, pageSize]);

  const statistics = useMemo(() => {
    const total = assets.length;
    const available = assets.filter((a) => a.status === "available").length;
    const borrowed = assets.filter((a) => a.status === "borrowed").length;
    const maintenance = assets.filter((a) => a.status === "maintenance").length;
    return { total, available, borrowed, maintenance };
  }, [assets]);

  const getAssetById = (id: string): AssetItem | undefined => {
    return assets.find((a) => a.id === id);
  };

  return {
    assets: paginatedAssets,
    rawAssets: assets,
    totalCount: filteredAssets.length,
    search,
    setSearch: (val: string) => {
      setSearch(val);
      setPage(1);
    },
    categoryFilter,
    setCategoryFilter: (val: AssetCategory | "all") => {
      setCategoryFilter(val);
      setPage(1);
    },
    statusFilter,
    setStatusFilter: (val: AssetItemStatus | "all") => {
      setStatusFilter(val);
      setPage(1);
    },
    page,
    setPage,
    pageSize,
    setPageSize,
    statistics,
    getAssetById,
  };
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/use-debounce";
import { useActivities } from "./use-activities";
import { useUserPermission } from "@/hooks/use-user-permission";

export function useActivityList() {
  const t = useTranslations("crmActivity");
  const tCommon = useTranslations("common");

  const canCreate = useUserPermission("crm_activity.create");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useActivities({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    type: typeFilter || undefined,
  });

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  return {
    state: { search, debouncedSearch, page, pageSize, typeFilter, dialogOpen },
    actions: { setSearch, setPage, setPageSize, setTypeFilter, handleCreate, handleDialogClose },
    data: { items, pagination, isLoading, isError, refetch },
    permissions: { canCreate },
    translations: { t, tCommon },
  };
}

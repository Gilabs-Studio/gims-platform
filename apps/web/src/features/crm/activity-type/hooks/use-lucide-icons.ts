import { useQuery } from "@tanstack/react-query";
import { lucideIconService, type LucideIconListParams } from "../services/lucide-icon-service";

const QUERY_KEY = "lucide-icon-catalog";

export function useLucideIcons(params?: LucideIconListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => lucideIconService.list(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

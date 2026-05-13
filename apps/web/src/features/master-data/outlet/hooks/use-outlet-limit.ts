import { useQuery } from "@tanstack/react-query";
import { outletService } from "../services/outlet-service";

export function useOutletLimit() {
  return useQuery({
    queryKey: ["outlets", "limit"],
    queryFn: () => outletService.getLimit(),
    staleTime: 10 * 1000,
  });
}

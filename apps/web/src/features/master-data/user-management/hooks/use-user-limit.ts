"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/user-service";

export function useUserLimit() {
  return useQuery({
    queryKey: ["users", "limit"],
    queryFn: () => userService.getLimit(),
    staleTime: 30 * 1000,
  });
}

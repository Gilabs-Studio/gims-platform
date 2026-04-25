import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "../services/onboarding-service";

const ONBOARDING_KEY = ["onboarding"] as const;

export function useOnboardingState(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ONBOARDING_KEY,
    queryFn: () => onboardingService.getState(),
    // Keep onboarding state fresh so checklist updates immediately
    // after setup actions performed on other pages.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: options?.enabled ?? true,
  });
}

export function useSetBusinessType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessType: string) =>
      onboardingService.setBusinessType(businessType),
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_KEY, data);
    },
  });
}

export function useMarkOnboardingComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => onboardingService.markComplete(),
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_KEY, data);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "../services/onboarding-service";

const ONBOARDING_KEY = ["onboarding"] as const;

export function useOnboardingState(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ONBOARDING_KEY,
    queryFn: () => onboardingService.getState(),
    // Keep the completed state cached so the dashboard does not refetch
    // onboarding on every mount once setup has already finished.
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

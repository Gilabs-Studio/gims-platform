import { useMutation } from "@tanstack/react-query";
import { reverseGeocodeService } from "../services/geographic-service";
import type { ReverseGeocodeParams, ReverseGeocodeResult } from "../types";

/**
 * Hook for reverse geocoding coordinates to administrative boundaries.
 * Uses mutation (not query) since it is triggered on-demand by map interaction,
 * not by component mount or reactive dependencies.
 */
export function useReverseGeocode() {
  return useMutation<ReverseGeocodeResult, Error, ReverseGeocodeParams>({
    mutationFn: async (params) => {
      const response = await reverseGeocodeService.reverseGeocode(params);
      return response.data;
    },
  });
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes - cache time (formerly cacheTime)
            refetchOnWindowFocus: false,
            refetchOnMount: true, // Refetch on mount if data is stale
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              // Don't retry on network errors
              if (error && typeof error === "object" && "code" in error) {
                const code = (error as { code?: string }).code;
                if (code === "ERR_NETWORK" || code === "ECONNABORTED") {
                  return false;
                }
              }
              return failureCount < 1;
            },
          },
          mutations: {
            retry: (failureCount, error) => {
              // Don't retry on network errors
              if (error && typeof error === "object" && "code" in error) {
                const code = (error as { code?: string }).code;
                if (code === "ERR_NETWORK" || code === "ECONNABORTED") {
                  return false;
                }
              }
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

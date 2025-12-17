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
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
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

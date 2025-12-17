"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthGuard } from "../hooks/use-auth-guard";

interface AuthGuardProps {
  readonly children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthGuard();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const segments = pathname.split("/").filter(Boolean);
      const locale = segments[0] ?? "en";
      router.push(`/${locale}/login`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthGuard } from "../hooks/use-auth-guard";

// Permission checking utilities
export type CurrentUserLike = {
  id: string;
  role?: {
    is_owner?: boolean;
  } | null;
} | null | undefined;

export type TargetUserLike = {
  id: string;
  role?: {
    is_protected?: boolean;
  } | null;
} | null | undefined;

export function canOwnerManageUser(
  currentUser: CurrentUserLike,
  targetUser: TargetUserLike
): boolean {
  if (!currentUser || !targetUser) {
    return false;
  }

  if (!currentUser.role?.is_owner) {
    return true;
  }

  if (currentUser.id === targetUser.id) {
    return false;
  }

  return !targetUser.role?.is_protected;
}

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
      <div className="flex min-h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-center">
            <div className="relative h-12 w-12 text-primary">
              <svg className="h-full w-full animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-20"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                />
                <path
                  className="opacity-80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  d="M12 2a10 10 0 0 1 10 10"
                />
              </svg>
            </div>
          </div>
          <div className="text-sm font-medium tracking-tight text-muted-foreground/80 animate-pulse">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

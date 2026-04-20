"use client";

import type { ReactNode } from "react";
import { useSystemAdminGuard } from "../hooks/use-system-admin-guard";
import { ButtonLoading } from "@/components/loading";

interface SystemAdminAuthGuardProps {
  readonly children: ReactNode;
}

export function SystemAdminAuthGuard({
  children,
}: SystemAdminAuthGuardProps) {
  const { isLoading, isAuthenticated } = useSystemAdminGuard();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ButtonLoading />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

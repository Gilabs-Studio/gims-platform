"use client";

import { SystemAdminAuthGuard } from "@/features/system-admin/components/system-admin-auth-guard";
import { SystemAdminLayout } from "@/features/system-admin/components/system-admin-layout";

export default function SystemAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SystemAdminAuthGuard>
      <SystemAdminLayout>{children}</SystemAdminLayout>
    </SystemAdminAuthGuard>
  );
}

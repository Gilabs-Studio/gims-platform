import { SystemAdminAuthGuard } from "@/features/system-admin/components/system-admin-auth-guard";
import { SystemAdminLayout } from "@/features/system-admin/components/system-admin-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

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

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

// Lazy load list component for code splitting
const VisitList = dynamic(
  () =>
    import("@/features/sales/visit/components/visit-list").then((mod) => ({
      default: mod.VisitList,
    })),
  {
    loading: () => null, // Use route-level loading.tsx
  }
);

export default function SalesVisitsPage() {
  return (
    <PageMotion>
      <PermissionGuard requiredPermission="sales_visit.read">
        <Suspense fallback={null}>
          <VisitList />
        </Suspense>
      </PermissionGuard>
    </PageMotion>
  );
}

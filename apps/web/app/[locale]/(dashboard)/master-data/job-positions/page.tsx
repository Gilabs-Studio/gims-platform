import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const JobPositionList = dynamic(
  () =>
    import("@/features/master-data/organization/components/job-position").then(
      (mod) => ({ default: mod.JobPositionList }),
    ),
  {
    loading: () => null,
  },
);

import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function JobPositionsPage() {
  return (
    <PermissionGuard requiredPermission="job_position.read">
      <PageMotion>
        <Suspense fallback={null}>
          <JobPositionList />
        </Suspense>
      </PageMotion>
    </PermissionGuard>
  );
}

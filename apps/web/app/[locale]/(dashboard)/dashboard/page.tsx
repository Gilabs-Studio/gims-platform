import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { DashboardPageClient } from "./dashboard-page-client";

export default function DashboardPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <DashboardPageClient />
      </Suspense>
    </PageMotion>
  );
}


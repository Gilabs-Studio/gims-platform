import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { CompanyList } from "@/features/master-data/company-management/components/company-list";

export default function CompanyPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <CompanyList />
      </Suspense>
    </PageMotion>
  );
}


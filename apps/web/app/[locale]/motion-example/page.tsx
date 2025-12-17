import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { MerchandisePageClient } from "./merchandise-page-client";

export default function MerchandisePage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <MerchandisePageClient />
      </Suspense>
    </PageMotion>
  );
}

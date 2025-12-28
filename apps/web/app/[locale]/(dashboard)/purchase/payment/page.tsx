import { Suspense } from "react";
import { PageMotion } from "@/components/motion";
import { PaymentPOList } from "@/features/purchase/payment-po/components/payment-po-list";

export default function PaymentPOPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <PaymentPOList />
      </Suspense>
    </PageMotion>
  );
}





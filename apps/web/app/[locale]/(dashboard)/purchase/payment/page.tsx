import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const PaymentPOList = dynamic(
  () =>
    import("@/features/purchase/payment-po/components/payment-po-list").then(
      (mod) => ({ default: mod.PaymentPOList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function PaymentPOPage() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PaymentPOList />
      </Suspense>
    </PageMotion>
  );
}





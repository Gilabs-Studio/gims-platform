import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
export const PaymentTermsList = dynamic(
  () =>
    import("./payment-terms-list").then(
      (mod) => ({ default: mod.PaymentTermsList }),
    ),
  {
    loading: () => null,
  },
);

export function PaymentTermsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PaymentTermsList />
      </Suspense>
    </PageMotion>
  );
}

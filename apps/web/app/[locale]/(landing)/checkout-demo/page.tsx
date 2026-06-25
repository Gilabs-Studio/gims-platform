import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CheckoutDemoClient } from "@/components/landing/checkout-demo-client";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isId = locale === "id";

  const title = isId
    ? "Simulasi Checkout & Pembayaran Langganan | SalesView"
    : "Checkout & Subscription Payment Simulation | SalesView";
  const description = isId
    ? "Selesaikan transaksi simulasi Anda untuk mengaktifkan lisensi modul ERP, CRM, POS, dan Finance dari SalesView."
    : "Complete your simulation transaction to activate the SalesView ERP, CRM, POS, and Finance module license.";

  return buildLandingMetadata({
    locale,
    path: "/checkout-demo",
    title,
    description,
    keywords: isId
      ? ["checkout salesview", "pembayaran salesview", "simulasi transaksi erp", "salesview sandbox"]
      : ["salesview checkout", "salesview payment", "erp transaction simulation", "salesview sandbox"],
    imageAlt: "SalesView checkout page",
  });
}

export default async function CheckoutDemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative z-10 overflow-x-hidden pt-16">
      <CheckoutDemoClient locale={locale} />
    </div>
  );
}

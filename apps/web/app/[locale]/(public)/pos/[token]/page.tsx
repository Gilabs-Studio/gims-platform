import type { Metadata } from "next";
import { SelfOrderPageClient } from "@/features/pos/self-order/components/self-order-page-client";

export const metadata: Metadata = {
  title: "Pesan di Meja",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function SelfOrderPage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-background">
      <SelfOrderPageClient token={token} />
    </main>
  );
}

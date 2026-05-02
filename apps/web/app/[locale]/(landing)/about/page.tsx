import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PageMotion } from "@/components/motion/page-motion";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isId = locale === "id";

  return buildLandingMetadata({
    locale,
    path: "/about",
    title: isId ? "Tentang SalesView | Platform Bisnis Terintegrasi" : "About SalesView | Integrated Business Platform",
    description: isId
      ? "Kenali SalesView, platform all-in-one untuk ERP, CRM, HRIS, POS, dan Finance yang membantu bisnis bertumbuh lebih cepat."
      : "Learn about SalesView, an all-in-one platform for ERP, CRM, HRIS, POS, and Finance that helps businesses scale faster.",
    keywords: isId
      ? ["tentang salesview", "profil salesview", "platform bisnis indonesia", "software bisnis terintegrasi"]
      : ["about salesview", "salesview company", "integrated business software", "erp crm hris pos"],
    imageAlt: "About SalesView",
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isId = locale === "id";

  return (
    <PageMotion className="min-h-screen bg-background pt-20">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          SalesView
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
          {isId ? "Tentang Kami" : "About Us"}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {isId
            ? "SalesView dibangun untuk menyatukan operasional bisnis ke dalam satu sistem: dari penjualan, pembelian, inventaris, SDM, hingga laporan keuangan."
            : "SalesView is built to unify business operations in one system: from sales, procurement, and inventory to HR and finance reporting."}
        </p>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{isId ? "Misi" : "Mission"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {isId
                ? "Membantu tim bisnis bergerak lebih cepat dengan data yang akurat dan proses yang otomatis."
                : "Help business teams move faster with accurate data and automated processes."}
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{isId ? "Fokus" : "Focus"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {isId
                ? "Menyediakan pengalaman kerja yang konsisten untuk tim sales, finance, HR, dan operasional."
                : "Provide a consistent workflow experience for sales, finance, HR, and operations teams."}
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{isId ? "Nilai" : "Value"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {isId
                ? "Transparansi, kecepatan eksekusi, dan pertumbuhan berkelanjutan untuk setiap pelanggan."
                : "Transparency, execution speed, and sustainable growth for every customer."}
            </p>
          </article>
        </section>

        <div className="mt-12">
          <Link
            href="/pricing"
            className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isId ? "Lihat Harga" : "View Pricing"}
          </Link>
        </div>
      </main>
    </PageMotion>
  );
}

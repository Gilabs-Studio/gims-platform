import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
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
    path: "/terms",
    title: isId ? "Ketentuan Layanan | SalesView" : "Terms of Service | SalesView",
    description: isId
      ? "Ketentuan dan syarat penggunaan platform SalesView ERP, CRM, HRIS, POS & Finance."
      : "Terms and conditions for using the SalesView ERP, CRM, HRIS, POS & Finance platform.",
    keywords: isId
      ? [
          "syarat dan ketentuan penggunaan salesview",
          "perjanjian lisensi software erp crm",
          "hak kewajiban pengguna gims platform",
          "aturan langganan software cloud",
          "salesview terms",
        ]
      : [
          "salesview terms of service agreement",
          "erp crm software license agreement",
          "user rights and obligations gims",
          "salesview terms",
        ],
    imageAlt: "SalesView Terms of Service",
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isId = locale === "id";

  return (
    <PageMotion className="min-h-screen bg-background pt-24 pb-16">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {isId ? "LEGALITAS & SYARAT" : "LEGAL & TERMS"}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {isId ? "Ketentuan Layanan" : "Terms of Service"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isId ? "Terakhir diperbarui: 27 Mei 2026" : "Last updated: May 27, 2026"}
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "1. Penerimaan Ketentuan" : "1. Acceptance of Terms"}
            </h2>
            <p className="mt-3">
              {isId
                ? ""
                : ""}
            </p>
          </section>

          {/* Account & Registration */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "2. Akun Pengguna & Pendaftaran" : "2. User Accounts & Registration"}
            </h2>
            <p className="mt-3">
              {isId
                ? "Untuk menggunakan platform kami, Anda harus membuat akun dengan memberikan informasi yang akurat dan lengkap. Anda bertanggung jawab penuh atas keamanan kata sandi Anda dan setiap aktivitas yang terjadi di bawah akun Anda."
                : "To use our platform, you must create an account providing accurate and complete information. You are solely responsible for safeguarding your password and for any activity that occurs under your account."}
            </p>
          </section>

          {/* SLA (Service Level Agreement) */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "3. Komitmen SLA (Service Level Agreement)" : "3. SLA (Service Level Agreement) Commitment"}
            </h2>
            <p className="mt-3">
              {isId
                ? "SalesView berkomitmen untuk menyediakan ketersediaan layanan (uptime) rata-rata bulanan sebesar 99.9%. Komitmen ini tidak mencakup pemeliharaan terjadwal yang diumumkan sebelumnya atau gangguan akibat keadaan kahar (force majeure)."
                : "SalesView is committed to providing a monthly average service availability (uptime) of 99.9%. This commitment excludes pre-announced scheduled maintenance or outages caused by force majeure events."}
            </p>
          </section>

          {/* Subscriptions & Payments */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "4. Berlangganan & Pembayaran" : "4. Subscriptions & Payments"}
            </h2>
            <p className="mt-3">
              {isId
                ? "Layanan kami disediakan berdasarkan skema berlangganan berbayar (SaaS). Biaya penagihan dilakukan secara berkala (bulanan atau tahunan) dan akan didebit secara otomatis melalui metode pembayaran yang Anda daftarkan kecuali Anda membatalkan langganan sebelum tanggal jatuh tempo."
                : "Our services are provided on a paid subscription basis (SaaS). Billing fees are charged periodically (monthly or annually) and will be auto-debited using your registered payment method unless you cancel the subscription before the renewal date."}
            </p>
          </section>

          {/* Soft & Hard Deletion Policy */}
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              {isId ? "5. Kebijakan Penghapusan Data (Soft & Hard Delete)" : "5. Data Deletion Policy (Soft & Hard Delete)"}
            </h2>
            <p className="mt-3 text-sm">
              {isId
                ? "Jika Anda memutuskan untuk menghapus atau menonaktifkan akun penyewa (tenant) Anda, SalesView menerapkan masa tenggang perlindungan data:"
                : "If you decide to delete or deactivate your tenant account, SalesView applies a data protection grace period:"}
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>
                <strong>{isId ? "Soft Delete (30 Hari):" : "Soft Delete (30 Days):"}</strong>{" "}
                {isId
                  ? "Data penyewa Anda akan dinonaktifkan secara aman dan disembunyikan dari operasional harian selama 30 hari. Anda dapat memulihkan akun beserta datanya kapan saja dalam periode ini melalui dashboard admin sistem."
                  : "Your tenant data will be safely deactivated and hidden from daily operations for 30 days. You can restore the account and its data at any time during this period via the system admin dashboard."}
              </li>
              <li>
                <strong>{isId ? "Hard Delete (Permanen):" : "Hard Delete (Permanent):"}</strong>{" "}
                {isId
                  ? "Setelah 30 hari masa tenggang soft delete berakhir tanpa adanya pemulihan, sistem akan menghapus seluruh data Anda secara permanen dari server aktif dan basis data utama. Data yang sudah dihapus secara permanen tidak dapat dipulihkan kembali."
                  : "After the 30-day soft delete grace period expires without restoration, the system will permanently purge all your data from active servers and main databases. Permanently deleted data cannot be recovered."}
              </li>
            </ul>
          </section>

          {/* Liability Limitations */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "6. Batasan Tanggung Jawab" : "6. Limitation of Liability"}
            </h2>
            <p className="mt-3">
              {isId
                ? ""
                : ""}
            </p>
          </section>
        </div>
      </main>
    </PageMotion>
  );
}

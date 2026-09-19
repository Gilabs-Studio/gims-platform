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
    path: "/privacy",
    title: isId ? "Kebijakan Privasi | SalesView" : "Privacy Policy | SalesView",
    description: isId
      ? "Bagaimana platform SalesView mengumpulkan, menggunakan, dan melindungi data pribadi Anda."
      : "How the SalesView platform collects, uses, and protects your personal data.",
    keywords: isId
      ? [
          "kebijakan privasi data pengguna salesview",
          "perlindungan informasi bisnis perusahaan",
          "sistem keamanan database cloud gims",
          "syarat perlindungan data pribadi",
          "salesview privacy",
        ]
      : [
          "salesview user data privacy policy",
          "corporate business info protection",
          "secure database cloud architecture system",
          "salesview privacy",
        ],
    imageAlt: "SalesView Privacy Policy",
  });
}

export default async function PrivacyPage({
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
            {isId ? "PERLINDUNGAN DATA & PRIVASI" : "DATA PROTECTION & PRIVACY"}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {isId ? "Kebijakan Privasi" : "Privacy Policy"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isId ? "Terakhir diperbarui: 27 Mei 2026" : "Last updated: May 27, 2026"}
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* Information Collection */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "1. Informasi yang Kami Kumpulkan" : "1. Information We Collect"}
            </h2>
            <p className="mt-3">
              {isId
                ? "Kami mengumpulkan informasi yang Anda berikan secara langsung saat pendaftaran akun, seperti nama Anda, alamat email, nama perusahaan, serta informasi pembayaran. Kami juga mencatat alamat IP dan User-Agent perangkat Anda untuk mencatat riwayat persetujuan (consent log) demi kepentingan audit keamanan."
                : "We collect information you provide directly during account registration, such as your name, email address, company name, and payment information. We also log your IP address and device User-Agent to record consent history for security audit logs."}
            </p>
          </section>

          {/* Consent Logs */}
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              {isId ? "2. Pencatatan Persetujuan (Consent Logs)" : "2. Consent Logging & Compliance"}
            </h2>
            <p className="mt-3 text-sm">
              {isId
                ? "Berdasarkan peraturan perlindungan data, kami menyimpan bukti persetujuan aktif Anda terhadap Ketentuan Layanan dan Kebijakan Privasi. Riwayat persetujuan ini disimpan dalam tabel aman (`consent_logs`) di server kami yang memuat:"
                : "In accordance with data protection regulations, we maintain proof of your active consent to our Terms of Service and Privacy Policy. This consent history is stored securely in our `consent_logs` table containing:"}
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>{isId ? "ID Pengguna Anda" : "Your User ID"}</li>
              <li>{isId ? "Jenis persetujuan (tos, marketing, cookie)" : "Type of consent (tos, marketing, cookie)"}</li>
              <li>{isId ? "Versi kebijakan hukum yang disetujui" : "The legal policy version agreed to"}</li>
              <li>{isId ? "Alamat IP dan data string User-Agent perangkat Anda" : "IP Address and device User-Agent details"}</li>
            </ul>
          </section>

          {/* Security Standards */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "3. Keamanan Data & Isolasi Multi-Tenant" : "3. Data Security & Multi-Tenant Isolation"}
            </h2>
            <p className="mt-3">
              {isId
                ? "SalesView menerapkan arsitektur isolasi penyewa (multi-tenant isolation) yang ketat pada tingkat basis data untuk mencegah kebocoran data antar perusahaan. Semua transmisi data dilindungi dengan enkripsi SSL/TLS, otentikasi JWT menggunakan cookie HttpOnly, serta perlindungan CSRF Double-Submit Cookie."
                : "SalesView implements strict multi-tenant isolation architectures at the database level to prevent cross-company data leaks. All data transmissions are secured with SSL/TLS encryption, JWT authentication via HttpOnly cookies, and Double-Submit Cookie CSRF protection."}
            </p>
          </section>

          {/* Data Retention & Deactivation */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "4. Kebijakan Penghapusan Data (Soft & Hard Delete)" : "4. Data Retention & Deletion Policy"}
            </h2>
            <p className="mt-3">
              {isId
                ? "Kami menghormati hak Anda atas data pribadi Anda. Saat Anda meminta penghapusan akun penyewa (tenant), kami menerapkan sistem penghapusan dua fase:"
                : "We respect your rights over your personal data. When you request the deletion of your tenant account, we apply a two-phase deletion flow:"}
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>
                <strong>{isId ? "Soft Delete (30 Hari):" : "Soft Delete (30 Days):"}</strong>{" "}
                {isId
                  ? "Seluruh data operasional Anda akan dinonaktifkan secara aman dan disembunyikan. Data tidak akan diakses atau diolah untuk operasional apa pun. Dalam 30 hari ini, Anda dapat memulihkan akun Anda kapan saja."
                  : "All of your operational data will be securely deactivated and hidden. No active operations will read or write to this data. Within these 30 days, you can restore your account at any time."}
              </li>
              <li>
                <strong>{isId ? "Hard Delete:" : "Hard Delete:"}</strong>{" "}
                {isId
                  ? "Jika akun tidak dipulihkan dalam waktu 30 hari, penghapusan permanen (hard delete) otomatis dijalankan oleh background worker sistem kami untuk menghapus seluruh data secara permanen dari server aktif dan basis data utama kami."
                  : "If the account is not restored within 30 days, an automatic permanent purge (hard delete) is executed by our system background worker to permanently erase all data from our active servers and main databases."}
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "5. Hubungi Kami" : "5. Contact Us"}
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

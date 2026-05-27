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
    path: "/cookies",
    title: isId ? "Kebijakan Cookie | SalesView" : "Cookie Policy | SalesView",
    description: isId
      ? "Bagaimana platform SalesView menggunakan cookie untuk otentikasi aman dan pencegahan CSRF."
      : "How the SalesView platform uses cookies for secure authentication and CSRF prevention.",
    keywords: isId
      ? ["kebijakan cookie", "cookie salesview", "cookie aman", "salesview hukum"]
      : ["cookie policy", "salesview cookies", "secure cookies", "salesview legal"],
    imageAlt: "SalesView Cookie Policy",
  });
}

export default async function CookiesPage({
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
            {isId ? "TEKNOLOGI & PELACAKAN" : "TECHNOLOGY & TRACKING"}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {isId ? "Kebijakan Cookie" : "Cookie Policy"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isId ? "Terakhir diperbarui: 27 Mei 2026" : "Last updated: May 27, 2026"}
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
          {/* What are Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "1. Apa itu Cookie?" : "1. What are Cookies?"}
            </h2>
            <p className="mt-3">
              {isId
                ? "Cookie adalah berkas teks kecil yang disimpan di komputer atau perangkat seluler Anda ketika Anda mengunjungi sebuah situs web. Cookie membantu kami mengenali perangkat Anda dan mengingat preferensi navigasi Anda untuk sesi berikutnya."
                : "Cookies are small text files stored on your computer or mobile device when you visit a website. They help us recognize your device and remember your navigation preferences for subsequent sessions."}
            </p>
          </section>

          {/* Secure Technical Cookies */}
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              {isId ? "2. Cookie Teknis & Keamanan yang Kami Gunakan" : "2. Technical & Security Cookies We Use"}
            </h2>
            <p className="mt-3 text-sm">
              {isId
                ? "SalesView tidak menggunakan cookie pelacakan pihak ketiga untuk iklan bertarget. Kami hanya menggunakan cookie teknis kelas-industri yang sangat penting untuk operasional dan keamanan aplikasi:"
                : "SalesView does not use third-party tracking cookies for targeted ads. We only use industry-standard technical cookies essential for application operation and security:"}
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <strong>gims_access_token & gims_refresh_token:</strong>{" "}
                {isId
                  ? "Cookie HttpOnly yang aman untuk otentikasi sesi Anda. Diproteksi agar tidak dapat diakses oleh skrip berbahaya di sisi klien (XSS)."
                  : "Secure HttpOnly cookies used to authenticate your session. Protected from access by client-side scripts (XSS)."}
              </li>
              <li>
                <strong>gims_sys_access_token:</strong>{" "}
                {isId
                  ? "Cookie HttpOnly khusus sesi sistem admin untuk memisahkan kredensial admin platform dari pengguna penyewa biasa."
                  : "HttpOnly cookie dedicated to system admin sessions to segregate platform admin credentials from regular tenant users."}
              </li>
              <li>
                <strong>X-CSRF-Token:</strong>{" "}
                {isId
                  ? "Cookie pelindung dari serangan Cross-Site Request Forgery (CSRF). Digunakan untuk validasi Double-Submit Cookie di setiap transaksi penulisan data."
                  : "Cookie used to prevent Cross-Site Request Forgery (CSRF) attacks. Validated via the Double-Submit Cookie technique on every state-mutating request."}
              </li>
              <li>
                <strong>NEXT_LOCALE:</strong>{" "}
                {isId
                  ? "Cookie untuk mengingat preferensi bahasa (Inggris atau Indonesia) yang Anda pilih."
                  : "Cookie used to remember your preferred interface language (English or Indonesian)."}
              </li>
            </ul>
          </section>

          {/* Managing Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              {isId ? "3. Cara Mengelola Cookie" : "3. Managing Your Cookies"}
            </h2>
            <p className="mt-3">
              {isId
                ? "Anda dapat memilih untuk menolak atau menghapus cookie melalui pengaturan browser Anda. Namun, harap dicatat bahwa jika Anda menonaktifkan cookie otentikasi dan keamanan kami (`gims_access_token` dan `X-CSRF-Token`), Anda tidak akan dapat masuk ke dalam dashboard SalesView atau menggunakan layanan kami."
                : "You can choose to reject or delete cookies via your browser settings. However, please note that if you disable our authentication and security cookies (`gims_access_token` and `X-CSRF-Token`), you will not be able to log in to the SalesView dashboard or use our services."}
            </p>
          </section>
        </div>
      </main>
    </PageMotion>
  );
}

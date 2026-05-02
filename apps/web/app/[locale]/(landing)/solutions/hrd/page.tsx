import { Metadata } from "next";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Software HRIS & Payroll Terbaik | SalesView` 
    : `Best HRIS & Payroll Software | SalesView`;
    
  const desc = locale === 'id'
    ? `Manajemen SDM dan Payroll otomatis tanpa sakit kepala. Kelola kehadiran, cuti, dan evaluasi dalam satu platform sentral.`
    : `Automated HR and Payroll management without the headaches. Handle attendance, leave drops, and evaluations centrally.`;

  return buildLandingMetadata({
    locale,
    path: "/solutions/hrd",
    title,
    description: desc,
    keywords: [
      `Aplikasi HRIS Terbaik`, 
      `Sistem Payroll Indonesia`, 
      `Software Absensi Karyawan`,
      `HR Management Software`
    ],
    imageAlt: "SalesView HRIS and payroll overview",
  });
}

export default async function HrdLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://salesview.id/${locale}/solutions/hrd#business`,
    "name": locale === 'id' ? "Sistem HRIS Terbaik" : "Best HRIS System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Aplikasi manajemen HR komprehensif dari absensi hingga evaluasi.`
      : `Comprehensive HR management app from attendance to evaluations.`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Semarang",
      "addressRegion": "Jawa Tengah",
      "addressCountry": "ID"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -7.005145,
      "longitude": 110.438125
    },
    "url": `https://salesview.id/${locale}/solutions/hrd`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            SalesView HRD
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Sumber Daya Manusia,` : `Human Resources,`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Luar Biasa.` : `Exceptional.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Tinggalkan tumpukan kertas. Pusat kendali untuk melacak absensi, evaluasi KPI, dan mengelola rekrutmen dalam satu tempat.`
              : `Leave the paperwork behind. A command center to track time off, evaluate KPIs, and manage hiring centrally.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isId ? "Mulai HR Modern" : "Start Modern HR"}
            </Link>
          </div>
        </section>

        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row">
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  {isId ? "Talenta yang Terkelola" : "Talent Managed Properly"}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {isId 
                    ? `Buat evaluasi karyawan menjadi interaksi yang berdampak, bukan formalitas yang memberatkan. Terintegrasi langsung dengan absensi bulanan.`
                    : `Make employee evaluations impactful interactions, not bloated formalities. Linked directly to monthly attendances.`
                  }
                </p>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-background border border-border flex items-center justify-center p-8 shadow-sm">
                   <div className="w-full space-y-4">
                     {[1,2,3].map(i => (
                       <div key={i} className="flex gap-4 items-center border border-border/40 p-4 rounded-xl shadow-sm">
                         <div className="w-12 h-12 bg-secondary rounded-full" />
                         <div className="flex-1 space-y-2">
                           <div className="w-1/3 h-2 bg-foreground/20 rounded" />
                           <div className="w-full h-1 bg-muted rounded">
                             <div className={`h-full bg-primary rounded w-${i === 1 ? '4/5' : i === 2 ? '1/2' : 'full'}`} />
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageMotion>
    </>
  );
}

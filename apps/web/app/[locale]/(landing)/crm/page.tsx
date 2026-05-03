import { Metadata } from "next";
import Image from "next/image";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
// ArrowRight not used — removed
import { Link } from "@/i18n/routing";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Aplikasi CRM Terbaik | SalesView` 
    : `Best CRM Software | SalesView`;
    
  const desc = locale === 'id'
    ? `CRM yang AI native untuk melacak lead, mendapatkan forecast yang akurat, dan close lebih banyak peluang.`
    : `AI native CRM to track leads, secure accurate forecasts, and close more opportunities in real-time.`;

  return buildLandingMetadata({
    locale,
    path: "/crm",
    title,
    description: desc,
    keywords: [
      `Aplikasi CRM Terbaik`, 
      `Sistem CRM Indonesia`, 
      `Software CRM Perusahaan`,
      `Aplikasi Sales dan Marketing`,
      `CRM B2B`
    ],
    imageAlt: "SalesView CRM overview",
  });
}

export default async function CrmLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // LocalBusiness & SoftwareApplication tailored SEO Schema
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://salesview.id/${locale}/crm#business`,
    "name": locale === 'id' ? "Sistem CRM Terbaik Terintegrasi" : "Best Integrated CRM System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Aplikasi CRM enterprise terbaik. Bebas, tanpa batasan pengguna, untuk penjualan yang lebih modern.`
      : `Best enterprise CRM application. Seamless, without limits, designed for modern sales.`,
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
    "url": `https://salesview.id/${locale}/crm`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        
        {/* APPLE-LIKE HERO (Super Minimalist) */}
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            SalesView CRM
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Customer Relationship` : `Customer Relationship`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Magic.` : `Magic.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `CRM yang AI native untuk melacak lead, mendapatkan forecast yang akurat, dan close lebih banyak peluang.`
              : `AI native CRM to track leads, secure accurate forecasts, and close more opportunities in real-time.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 shadow-sm"
            >
              {isId ? "Mulai sekarang - Gratis" : "Start now - Free"}
            </Link>
            <Link 
              href="/login"
              className="rounded-full bg-secondary text-secondary-foreground px-8 py-4 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {isId ? "Ketahui lebih lanjut" : "Learn more"}
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {isId ? "Bebas, selamanya, tanpa batasan pengguna." : "Free, forever, absolutely no user limits."}
          </p>
        </section>
        
        {/* HERO IMAGE SHOWCASE (Clean no heavy borders) */}
        <section className="px-6 max-w-7xl mx-auto w-full pb-24">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-border/40 bg-card">
            {/* Using abstract Apple-like minimalist representation or screenshot if available */}
            <div className="absolute inset-0 bg-linear-to-tr from-background to-secondary/30" />
            <Image 
              src="/screenshot/pipeline.webp" 
              alt="CRM Interface" 
              fill 
              className="object-cover object-top"
              priority
            />
          </div>
        </section>

        {/* FEATURE INTRODUCTION GRID */}
        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-20 md:mb-32 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-6">
                {isId ? "Pantau kesuksesan dalam satu genggaman!" : "Keep opportunities within view"}
              </h2>
              <p className="text-xl text-muted-foreground font-light">
                {isId ? "Pipeline Anda dalam sekilas lirikan." : "Your pipeline at a single glance."}
              </p>
            </div>

            <div className="space-y-32">
              
              {/* Feature 1 */}
              <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row">
                <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                  <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                    {isId ? "Semua tertata rapi dan efisien" : "Neatly organized and efficient"}
                  </h3>
                  <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                    {isId 
                      ? `Tampilan kanban mengatur opportunity berdasarkan tahap mereka. Tarik dan lepas kartu di pipeline untuk menggerakkanya dari tahap ke tahap.`
                      : `The kanban view organizes opportunities by their stage. Drag and drop cards in your pipeline to easily move them from stage to stage.`
                    }
                  </p>
                </div>
                
                <div className="lg:w-1/2 w-full">
                  <div className="relative aspect-square md:aspect-4/3 rounded-3xl overflow-hidden bg-background border border-border shadow-sm flex items-center justify-center p-8">
                    <div className="w-full h-full flex gap-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex-1 bg-secondary/50 rounded-lg p-2 space-y-3">
                          <div className="w-full h-2 bg-muted rounded" />
                          <div className="w-full h-20 bg-card rounded shadow-sm border border-border/50" />
                          {i !== 3 && <div className="w-full h-20 bg-card rounded shadow-sm border border-border/50 opacity-60" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

               {/* Feature 2 */}
              <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row-reverse">
                <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                  <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                    {isId ? "Tidak pernah lagi lupa follow-up" : "Never forget a follow-up"}
                  </h3>
                  <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                    {isId 
                      ? `Jadwalkan panggilan, rapat, email, atau penawaran, dan SalesView AI secara otomatis merencanakan aktivitas Anda berikutnya.`
                      : `Schedule calls, meetings, mailings, or quotations, and SalesView AI automatically plans your next activity.`
                    }
                  </p>
                  <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                    {isId 
                      ? `Komunikasi adalah kunci untuk meningkatkan hubungan pelanggan. Semua masuk ke satu tempat agar mudah diakses.`
                      : `Communication is key to building customer relationships. All touchpoints merge in one place for easy access.`
                    }
                  </p>
                </div>
                
                <div className="lg:w-1/2 w-full">
                  <div className="relative aspect-square md:aspect-4/3 rounded-3xl overflow-hidden bg-background border border-border shadow-sm flex items-center justify-center p-8">
                    <div className="w-full max-w-xs space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0" />
                        <div className="flex-1 bg-secondary rounded-2xl rounded-tl-none p-3 shadow-sm border border-border/50">
                          <div className="w-3/4 h-2 bg-muted rounded mb-2" />
                          <div className="w-1/2 h-2 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="flex items-start gap-4 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 shrink-0" />
                        <div className="flex-1 bg-primary text-primary-foreground rounded-2xl rounded-tr-none p-3 shadow-sm">
                          <div className="w-full h-2 bg-white/40 rounded mb-2" />
                          <div className="w-2/3 h-2 bg-white/40 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

               {/* Feature 3 */}
              <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row">
                <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                  <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                    {isId ? "Penawaran menarik dalam dua klik" : "Attractive quotes in two clicks"}
                  </h3>
                  <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                    {isId 
                      ? `Buat penawaran yang tampak profesional dalam sekejap dengan antarmuka yang ramah pengguna dari alat sales kami. Cukup pilih produk dari katalog, dan SalesView yang akan menangani sisanya.`
                      : `Create professional-looking quotations in an instant with our user-friendly sales interface. Simply pick products from your catalog, and let SalesView handle the rest.`
                    }
                  </p>
                </div>
                
                <div className="lg:w-1/2 w-full">
                  <div className="relative aspect-square md:aspect-4/3 rounded-3xl overflow-hidden bg-background border border-border shadow-sm flex items-center justify-center p-8">
                     <div className="w-full h-full border border-border/50 rounded-xl bg-card shadow-sm flex flex-col overflow-hidden relative">
                        <div className="h-10 bg-secondary border-b border-border/50 flex items-center px-4" />
                        <div className="flex-1 p-6 space-y-4">
                           <div className="w-1/3 h-4 bg-muted rounded" />
                           <div className="w-full h-px bg-border my-4" />
                           <div className="w-full h-8 bg-secondary/50 rounded flex items-center justify-between px-4">
                             <div className="w-1/4 h-2 bg-muted rounded" />
                             <div className="w-1/4 h-2 bg-muted rounded" />
                           </div>
                           <div className="w-full h-8 bg-secondary/50 rounded flex items-center justify-between px-4">
                             <div className="w-1/3 h-2 bg-muted rounded" />
                             <div className="w-1/5 h-2 bg-muted rounded" />
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            {isId ? "Semua fitur dirancang dengan tepat." : "Every feature crafted precisely."}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-left mt-16 max-w-3xl mx-auto">
             <div>
                <h4 className="font-semibold text-lg mb-2">{isId ? "Aktifkan otomatisasi" : "Enable automation"}</h4>
                <p className="text-muted-foreground">{isId ? "Otomatiskan pembuatan lead, penugasan tim dan jadwal kegiatan agar lebih fokus pada yang penting." : "Automate lead creation, team assignment, and activities to focus on what matters."}</p>
             </div>
             <div>
                <h4 className="font-semibold text-lg mb-2">{isId ? "Lead scoring bertenaga AI" : "AI-Powered Lead Scoring"}</h4>
                <p className="text-muted-foreground">{isId ? "Terlalu banyak lead? AI kami menilai lead agar Anda selalu bekerja pada prioritas yang tepat." : "Too many leads? Our AI scores leads so you always work on the right priorities."}</p>
             </div>
          </div>
          <div className="pt-12">
            <Link 
              href="/register"
              className="rounded-full bg-foreground px-8 py-4 text-sm font-medium text-background hover:bg-foreground/90 transition-transform hover:scale-105 inline-flex shadow-xl"
            >
              {isId ? "Lihat semua fitur CRM" : "See all CRM features"}
            </Link>
          </div>
        </section>
      </PageMotion>
    </>
  );
}

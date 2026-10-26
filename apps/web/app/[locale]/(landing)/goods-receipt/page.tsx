import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/goods-receipt",
    title:
      locale === "id"
        ? "Sistem Penerimaan Barang (Goods Receipt) | Terhubung PO & Supplier Invoice | SalesView"
        : "Goods Receipt System | Linked to PO & Supplier Invoice | SalesView",
    description:
      locale === "id"
        ? "Catat penerimaan barang per purchase order, validasi kuantitas, lacak audit trail, dan teruskan ke faktur supplier dalam satu alur goods receipt yang akurat dan siap diaudit."
        : "Record goods receipt per purchase order, validate quantities, track audit trails, and pass to supplier invoice in one accurate, audit-ready goods receipt workflow.",
    keywords:
      locale === "id"
        ? [
            "aplikasi penerimaan barang gudang online",
            "software qc masuk barang inventory",
            "sistem verifikasi surat jalan supplier",
            "aplikasi pencatatan mutasi barang masuk",
            "salesview goods receipt",
          ]
        : [
            "warehouse goods receipt management software",
            "incoming inventory inspection tracking tool",
            "supplier delivery note matching system",
            "salesview goods receipt",
          ],
    imageAlt: "SalesView goods receipt management overview",
  });
}

export default async function GoodsReceiptLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/goods-receipt#product`,
    name: "SalesView Goods Receipt",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Sistem penerimaan barang gudang yang terhubung ke purchase order, audit trail, dan konversi faktur supplier."
      : "Warehouse goods receipt system linked to purchase orders, audit trails, and supplier invoice conversion.",
    url: `https://salesview.id/${locale}/goods-receipt`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Goods Receipt"
        heroTitle={isId ? "Penerimaan Barang &" : "Goods Receipt &"}
        heroAccent={isId ? "Verifikasi Surat Jalan Gudang" : "Warehouse Inbound Verification"}
        heroDescription={
          isId
            ? "Catat kedatangan barang per purchase order, verifikasi kuantitas fisik, dan teruskan ke faktur supplier tanpa selisih."
            : "Record inbound shipments per PO, verify physical quantities, and bridge to supplier invoices without discrepancies."
        }
        heroImageAlt={isId ? "Tampilan penerimaan barang SalesView" : "SalesView goods receipt interface"}
        heroImageKey="goodsReceiptHero"
        introTitle={isId ? "Verifikasi barang masuk langsung di pintu gudang" : "Verify incoming goods right at the receiving dock"}
        introDescription={
          isId
            ? "Pastikan kuantitas dan kualitas barang yang diterima sesuai dengan pesanan pembelian sebelum masuk ke inventaris aktif."
            : "Ensure received quantities and item conditions match purchase orders before items enter active stock."
        }
        featureBlocks={[
          {
            title: isId ? "Pencocokan presisi dengan purchase order" : "Precise purchase order matching",
            description: isId
              ? "Pilih nomor PO yang telah disetujui, input jumlah fisik yang diterima, dan simpan berita acara penerimaan barang."
              : "Select approved PO numbers, record physical received quantities, and generate formal receiving reports.",
            descriptionSecondary: isId
              ? "Sistem memvalidasi setiap baris agar tidak terjadi penerimaan melebihi kuantitas yang dipesan."
              : "System validates item quantities to prevent unauthorized over-receiving beyond original PO limits.",
            screenshotKey: "goodsReceiptPO",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Jejak audit status penerimaan lengkap" : "Complete status lifecycle audit trail",
            description: isId
              ? "Setiap tahapan status draft, submitted, approved, rejected, dan closed tercatat lengkap beserta identitas staf gudang."
              : "Every stage from draft, submission, approval, rejection to closure logs precise timestamps and warehouse staff IDs.",
            screenshotKey: "goodsReceiptAudit",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Konversi otomatis ke faktur tagihan supplier" : "Direct conversion to supplier invoice",
            description: isId
              ? "Setelah penerimaan disetujui, konversi dokumen menjadi faktur supplier dalam satu klik dengan kuantitas yang terverifikasi."
              : "Once receiving is approved, convert records into vendor invoices with pre-validated quantities and unit costs.",
            screenshotKey: "goodsReceiptToInvoice",
            placeholder: "invoiceFlow",
          },
        ]}
        finalTitle={isId ? "Kendalikan ketepatan penerimaan logistik gudang Anda" : "Elevate your warehouse receiving accuracy today"}
        finalPoints={[
          {
            title: isId ? "Akurasi penerimaan instan" : "Instant receiving precision",
            description: isId
              ? "Cegah selisih barang dan klaim supplier sejak pertama kali kargo tiba di dermaga bongkar."
              : "Prevent item discrepancies and vendor disputes as soon as shipments arrive at the loading bay.",
          },
          {
            title: isId ? "Ketelusuran dokumen siap audit" : "Audit-ready traceability",
            description: isId
              ? "Dokumen surat jalan, bukti foto kedatangan, dan persetujuan staf tersimpan rapi selamanya."
              : "Delivery manifests, inspection photo evidence, and staff approvals stay archived permanently.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}

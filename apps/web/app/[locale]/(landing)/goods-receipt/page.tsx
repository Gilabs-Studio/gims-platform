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
        ? "Catat penerimaan barang per purchase order, validasi kuantitas, lacak audit trail, dan teruskan ke faktur supplier — semua dalam satu alur goods receipt yang akurat dan siap diaudit."
        : "Record goods receipt per purchase order, validate quantities, track audit trails, and pass to supplier invoice — all in one accurate, audit-ready goods receipt workflow.",
    keywords:
      locale === "id"
        ? [
            "penerimaan barang",
            "goods receipt",
            "validasi barang masuk",
            "purchase order matching",
            "barang masuk gudang",
            "audit trail penerimaan",
            "konversi faktur supplier",
            "salesview goods receipt",
          ]
        : [
            "goods receipt",
            "inbound receiving",
            "purchase order matching",
            "warehouse receiving",
            "receipt audit trail",
            "supplier invoice conversion",
            "goods receipt software",
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
        heroTitle={isId ? "Penerimaan Barang yang" : "Goods Receipt that"}
        heroAccent={isId ? "Lebih Akurat." : "Stays Accurate."}
        heroDescription={
          isId
            ? "Catat barang masuk per purchase order, validasi kuantitas, dan teruskan ke faktur supplier — semua dalam satu alur yang siap diaudit."
            : "Record inbound goods per purchase order, validate quantities, and pass to supplier invoice — all in one audit-ready workflow."
        }
        heroImageAlt={isId ? "Tampilan penerimaan barang SalesView" : "SalesView goods receipt interface"}
        heroImageKey="goodsReceiptHero"
        introTitle={isId ? "Kurangi kesalahan stok masuk" : "Reduce inbound stock mistakes"}
        introDescription={
          isId
            ? "Goods receipt dirancang agar tim gudang mencatat barang masuk dengan langkah yang konsisten dan jejak data yang lengkap."
            : "Goods receipt is designed so warehouse teams record inbound items with consistent steps and a complete data trail."
        }
        featureBlocks={[
          {
            title: isId ? "Catat barang per purchase order" : "Record items per purchase order",
            description: isId
              ? "Hubungkan setiap penerimaan barang ke purchase order — pilih PO yang sudah approved, isi kuantitas per item, dan simpan dalam satu langkah."
              : "Link every goods receipt to a purchase order — select an approved PO, fill in quantities per item, and save in one step.",
            descriptionSecondary: isId
              ? "Setiap item divalidasi agar quantity received > 0 sebelum bisa disimpan."
              : "Each item is validated so quantity received > 0 before saving.",
            screenshotKey: "goodsReceiptPO",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Jejak audit dari draft sampai closed" : "Audit trail from draft to closed",
            description: isId
              ? "Setiap status — DRAFT, SUBMITTED, APPROVED, REJECTED, CLOSED — tercatat dengan timestamp dan user yang melakukan aksi."
              : "Every status — DRAFT, SUBMITTED, APPROVED, REJECTED, CLOSED — is logged with a timestamp and the user who performed the action.",
            screenshotKey: "goodsReceiptAudit",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Teruskan ke faktur supplier" : "Pass to supplier invoice",
            description: isId
              ? "Begitu barang diterima dan disetujui, konversi goods receipt ke supplier invoice dalam satu klik — data quantity dan harga langsung terbawa."
              : "Once goods are received and approved, convert the goods receipt to a supplier invoice in one click — quantity and cost data carry over automatically.",
            screenshotKey: "goodsReceiptToInvoice",
            placeholder: "invoiceFlow",
          },
        ]}
        finalTitle={isId ? "Gudang bekerja dengan data yang lebih presisi" : "Warehouses operate with more precise data"}
        finalPoints={[
          {
            title: isId ? "Terhubung PO" : "PO-linked",
            description: isId
              ? "Setiap penerimaan merujuk ke purchase order yang sah."
              : "Every receipt references a valid purchase order.",
          },
          {
            title: isId ? "Siap audit" : "Audit-ready",
            description: isId
              ? "Audit trail lengkap dari draft sampai closed."
              : "Full audit trail from draft to closed.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Goods Receipt" : "Start Goods Receipt"}
      />
    </>
  );
}

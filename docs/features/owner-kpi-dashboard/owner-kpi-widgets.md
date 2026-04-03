# Owner KPI Dashboard

## Ringkasan Fitur
Owner KPI Dashboard dirancang khusus untuk memfasilitasi pengambilan keputusan strategis oleh pemilik bisnis (Owner). Dashboard ini tidak hanya menyajikan angka-angka raw, melainkan merangkum kesehatan bisnis melalui 14 widget metrik kritikal, dan menggunakan layer kecerdasan otomatis (Owner Intelligence) untuk menyoroti bottleneck utama bisnis.

## Status Implementasi & Catatan (PENTING)
Secara frontend, **14 widget baru sudah terimplementasi sepenuhnya (100%)**. Namun yang perlu Anda perhatikan ada di layer **Backend API**.

### Pesan Error `400 Bad Request` (`scope=owner-kpi`)
Ketika pertama kali membuka dashboard, network di browser Anda mungkin menangkap log error ini:
```
GET http://localhost:8087/api/v1/general/dashboard/overview?year=2026&scope=owner-kpi
```
**Mengapa ini terjadi?**
Backend (Golang) belum mengenali "scope" bernama `owner-kpi`. API secara eksplisit me-reject request tersebut sebagai bad request karena belum diimplementasikan di handler.

**Apakah UI Rusak?**
**TIDAK.** Frontend telah dirancang dengan mekanisme fallback "Graceful Degradation". Hook di `useOwnerKpi` akan mendeteksi apabila server belum siap menyajikan data `owner-kpi`, lalu *secara diam-diam akan mengambil ulang* data dashboard general (scope `kpi`, `costs`, `invoices`, `warehouse`, `delivery`), lalu meracik data-data mentah tersebut secara matematis di browser (Client-Side Derivation) untuk mem-bypass ketidaksiapan backend.

**Apa yang perlu dilakukan ke depannya?**
Sebaiknya tambahkan logic di backend Go: `apps/api/internal/general/presentation/handler/dashboard_handler.go` agar bisa melayani scope `owner-kpi` secara terpusat dan native ke database. Fallback client-side yang ada sekarang bagus untuk development, namun bisa jadi lambat jika datanya sudah raksasa (dan akurasinya masih *approximate* dibanding query SQL sungguhan dari ERP).

---

## 14 Widget Baru

Secara visual, UI ini dilabeli dengan icon tooltips khusus (`?`) agar user lebih memahami formula dan tujuan masing-masing metrik tanpa dokumentasi terpisah. Keseluruhan UI dirancang *semantic-consistent* dengan theme globals (`text-success`, `text-warning`, `text-destructive`).

### 1. Owner Intelligence (Kategori: Intelligence)
Fitur unggulan. Secara otomatis membaca status semua parameter bisnis lalu mengeluarkan rangkuman "Business Sehat/Waspada/Kritis", mendeteksi Primary Bottleneck (Misal: Inventory terlalu lama mengendap), dan menyediakan Insight / Rekomendasi (Actionable list).

### 2. Kategori: Cashflow (Tier 1 - Paling Kritis)
- **CCC (Cash Conversion Cycle):** `DIO + DSO - DPO`. Metrik paling telanjang untuk mengetahui berapa lama uang terikat dalam siklus operasional bisnis.
- **AR Days / DSO (Days Sales Outstanding):** Rata-rata hari pelanggan membayar hutangnya. 
- **AP Days / DPO (Days Payable Outstanding):** Rata-rata hari perusahaan menunda pembayaran ke supplier. DPO yang lebih tinggi dalam batas toleransi itu bagus untuk me-leverage cashflow.

### 3. Kategori: Inventory (Kritis)
- **DIO (Days Inventory Outstanding):** Berapa hari rata-rata stok tertahan di gudang sebelum dikonversi menjadi penjualan. Membantu owner menekan inventori mati.
- **Inventory Turnover:** Berapa kali inventori bisnis ini laku terjual dan diganti dalam setahun (`COGS / Average Inventory`). Semakin tinggi perputaran, semakin sehat likuiditas.

### 4. Kategori: Profitability (Tier 2)
- **ROE (Return on Equity):** Laba Bersih dibandingkan Ekuitas modal sendiri. Seberapa kuat uang investasi milik owner berkembang.
- **Net Profit Margin:** Laba Bersih dibagi Pendapatan. Target standar min 10%.
- **Gross Profit Margin:** Laba Kotor dibagi Pendapatan. Menunjukkan seberapa kuat kemampuan *pricing* dan tekanan COGS dari hulu.

### 5. Kategori: Asset (Tier 2)
- **ROA (Return on Assets):** Efisiensi total aset di neraca perusahaan di dalam mendulang keuntungan bersih.
- **Asset Turnover:** Penjualan / Pendapatan dibandingkan total aset.

### 6. Kategori: Logistics (Tier 3)
- **OTD Rate (On-Time Delivery):** Persentase keberhasilan armada pengiriman tiba tepat waktu di lokasi pelanggan.
- **Utilization Rate:** Rasio seberapa sering atau padat jadwal *fleet* / aset kita berkapasitas dipakai vs non-dipakai.
- **Cost / Delivery:** Total operasional logistik di-breakdown per ritase pengiriman.

### 7. Cost Structure (Opex vs Capex)
Widget visual *stacked bar* yang memecah komponen OPEX (Sewa gudang, Gaji) berhadapan dengan CAPEX (Pembelian Truck, Mesin dll), beserta simulasi Depresiasi nilainya.

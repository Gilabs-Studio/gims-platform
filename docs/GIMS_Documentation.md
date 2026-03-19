# GIMS Product Documentation

Dokumen ini menjelaskan produk GIMS dari perspektif pengguna. Tujuannya adalah menjadi panduan yang praktis, mudah dipindai, dan cukup detail untuk membantu pengguna memahami apa yang bisa dilakukan di setiap menu.

Dokumentasi ini disusun dengan pendekatan product documentation seperti yang umum dipakai dalam knowledge base produk:
- menjadi source of truth untuk memahami fitur
- ditulis berdasarkan kebutuhan pengguna, bukan hanya struktur teknis
- menjelaskan fungsi, alur kerja, dan hasil yang diharapkan
- bersifat living document dan akan terus diperbarui saat produk berkembang

## Siapa yang menggunakan dokumen ini
- Pengguna operasional yang ingin tahu cara kerja fitur
- Admin atau supervisor yang mengatur proses kerja
- Tim internal yang butuh gambaran produk secara cepat
- Stakeholder yang ingin memahami value tiap menu

## Cara membaca dokumen
- Ikuti urutan menu sesuai navigation config
- Baca bagian tujuan fitur untuk memahami konteks penggunaan
- Lihat alur penggunaan untuk mengetahui langkah yang dilakukan pengguna
- Perhatikan output atau hasil akhir agar ekspektasi pengguna jelas

## Urutan Menu
1. Dashboard
2. Master Data
3. Sales
4. Purchase
5. Stock
6. Finance
7. HRD
8. CRM
9. Reports
10. AI Assistant

---

# 1. Dashboard

Dashboard adalah halaman utama setelah login. Halaman ini dirancang agar pengguna langsung mendapatkan gambaran kondisi bisnis, aktivitas terbaru, dan akses cepat ke menu yang sering dipakai.

## Tujuan Dashboard
- Memberikan ringkasan cepat tanpa harus masuk ke banyak halaman
- Menampilkan informasi yang paling relevan untuk peran pengguna
- Menjadi pusat kontrol yang bisa disesuaikan sesuai kebutuhan kerja

## Fungsi Utama
- Menampilkan widget ringkasan data
- Menampilkan aktivitas atau notifikasi penting
- Menyediakan akses cepat ke menu operasional
- Memungkinkan pengguna menata tampilan dashboard sendiri

## Kemampuan Kustomisasi
Dashboard tidak bersifat statis. Pengguna dapat menyesuaikan isi sesuai kebutuhan kerja.

### Yang bisa dilakukan pengguna
- Menambahkan widget baru ke dashboard
- Menghapus widget yang tidak diperlukan
- Memindahkan posisi widget dengan drag and drop
- Mengubah urutan tampilan widget
- Menyesuaikan ukuran widget bila tersedia
- Menyimpan layout agar tampilan tetap konsisten saat login berikutnya
- Mengembalikan dashboard ke tampilan default jika diperlukan

### Contoh widget yang umum
- Ringkasan transaksi hari ini
- Penjualan bulan berjalan
- Piutang atau hutang yang masih terbuka
- Aktivitas approval terbaru
- Stok minimum atau stok kritis
- Agenda atau reminder penting
- KPI tim atau departemen

## Alur Penggunaan
1. Pengguna login ke sistem.
2. Sistem menampilkan dashboard sesuai role atau permission.
3. Pengguna melihat widget yang paling relevan.
4. Jika diperlukan, pengguna masuk ke mode edit dashboard.
5. Pengguna menambah, menghapus, atau memindahkan widget.
6. Layout disimpan agar bisa dipakai kembali.

## Output yang Diharapkan
- Pengguna memahami kondisi kerja secara cepat
- Pengguna bisa fokus ke informasi yang penting untuk perannya
- Pengguna tidak perlu membuka banyak menu untuk melihat ringkasan operasional

---

# 2. Master Data

Master Data adalah pusat pengelolaan data referensi yang dipakai oleh modul lain. Semua transaksi besar di GIMS bergantung pada data di sini, sehingga kualitas data master akan mempengaruhi akurasi proses lain.

## Tujuan Master Data
- Menjaga konsistensi data lintas modul
- Menjadi sumber referensi saat mengisi form transaksi
- Memastikan struktur data perusahaan rapi dan mudah dipakai ulang

## Prinsip Penggunaan
- Data master diisi lebih dulu sebelum transaksi berjalan
- Satu entitas data dapat dipakai di banyak modul
- Perubahan di master data akan memengaruhi proses lain yang bergantung padanya

## 2.1 Geographic

### Tujuan
Mengelola informasi wilayah, area, atau pembagian geografis yang dipakai untuk operasional dan analisis bisnis.

### Fungsi untuk pengguna
- Melihat daftar wilayah
- Menambah area atau wilayah baru
- Mengubah nama atau status wilayah
- Menyesuaikan pembagian area kerja

### Manfaat
- Memudahkan pengelompokan customer atau cabang berdasarkan lokasi
- Membantu analisis performa per wilayah
- Menjadi dasar pemetaan distribusi atau kunjungan

## 2.2 Organization

### Tujuan
Mengatur struktur organisasi perusahaan dari level paling dasar sampai unit kerja yang lebih spesifik.

### 2.2.1 Company
- Menyimpan identitas perusahaan
- Digunakan sebagai data utama untuk operasional sistem
- Menjadi referensi untuk aset, karyawan, dan laporan perusahaan

### 2.2.2 Divisions
- Mengelola pembagian divisi
- Memudahkan pengelompokan karyawan dan tanggung jawab kerja
- Dipakai dalam approval, reporting, dan struktur organisasi

### 2.2.3 Job Positions
- Mengelola jabatan atau posisi kerja
- Digunakan pada data karyawan dan proses persetujuan
- Membantu penyusunan struktur organisasi yang formal

### 2.2.4 Business Units
- Mengelola unit bisnis
- Membantu memisahkan operasi berdasarkan lini usaha
- Berguna untuk pelaporan per unit kerja

### 2.2.5 Business Types
- Mengelola jenis bisnis atau tipe perusahaan
- Mempermudah klasifikasi entitas bisnis
- Berguna saat analisis portofolio usaha

### 2.2.6 Areas
- Mengelola area operasional
- Dipakai untuk pembagian wilayah kerja
- Berguna untuk tim lapangan, sales, dan distribusi

### Alur penggunaan Organization
1. Admin membuka menu Organization.
2. Admin memilih data yang ingin dikelola.
3. Admin menambah atau mengubah data struktur organisasi.
4. Data digunakan kembali oleh modul lain seperti HRD, CRM, dan Finance.

## 2.3 Employees

### Tujuan
Menyimpan data karyawan sebagai identitas inti untuk proses HRD, payroll, approval, dan operasional bisnis.

### Fungsi untuk pengguna
- Melihat daftar karyawan
- Melihat detail profil karyawan
- Menambah data karyawan baru
- Memperbarui informasi kerja karyawan

### Informasi yang biasanya ada
- Nama karyawan
- Kode karyawan
- Divisi
- Jabatan
- Status aktif atau nonaktif
- Relasi ke user account jika ada

### Manfaat
- Menjadi dasar pengajuan cuti, evaluasi, dan rekrutmen
- Dipakai untuk pengelolaan user dan hak akses
- Mendukung pelaporan HR dan manajemen

## 2.4 Supplier

### Tujuan
Mengelola data pemasok atau vendor yang menjadi mitra pengadaan barang dan jasa.

### 2.4.1 Suppliers
- Menyimpan daftar supplier
- Dipakai saat membuat purchase order, invoice supplier, atau pembayaran
- Menjadi referensi vendor utama dalam proses pembelian

### 2.4.2 Supplier Types
- Mengelompokkan supplier berdasarkan kategori
- Membantu pengguna menyaring vendor sesuai kebutuhan
- Berguna untuk analisis vendor dan segmentasi pengadaan

### 2.4.3 Banks
- Menyimpan data bank yang terkait supplier
- Dipakai untuk pembayaran dan validasi rekening
- Membantu proses transfer ke vendor

### Alur penggunaan Supplier
1. Pengguna membuka daftar supplier.
2. Pengguna memilih supplier yang akan dipakai pada transaksi.
3. Jika supplier baru belum ada, admin menambah data supplier terlebih dulu.
4. Data supplier digunakan oleh Purchase dan Finance.

## 2.5 Customer

### Tujuan
Menyimpan data pelanggan sebagai dasar transaksi penjualan dan aktivitas CRM.

### 2.5.1 Customers
- Menyimpan daftar pelanggan
- Dipakai pada quotation, sales order, invoice, dan analisis pelanggan
- Menjadi identitas utama pihak pembeli

### 2.5.2 Customer Types
- Mengelompokkan pelanggan berdasarkan tipe
- Membantu segmentasi pasar dan strategi penjualan
- Memudahkan pelaporan berdasarkan kategori customer

### Alur penggunaan Customer
1. Pengguna memilih customer saat membuat transaksi penjualan.
2. Sistem menampilkan data customer yang sudah tersimpan.
3. Jika customer belum ada, data ditambahkan ke master data.
4. Customer menjadi acuan untuk seluruh proses penjualan.

## 2.6 Product

### Tujuan
Mengelola seluruh referensi barang atau produk yang dipakai dalam transaksi penjualan, pembelian, dan stok.

### 2.6.1 Products
- Menyimpan daftar produk utama
- Digunakan di sales, purchase, stock, dan reporting
- Menjadi entitas paling penting untuk transaksi barang

### 2.6.2 Categories
- Mengelompokkan produk ke dalam kategori
- Memudahkan pencarian dan analisis
- Berguna untuk katalog dan laporan produk

### 2.6.3 Brands
- Mengatur merek produk
- Memudahkan klasifikasi produk yang berasal dari brand tertentu

### 2.6.4 Segments
- Mengatur segmen produk
- Berguna untuk strategi pemasaran dan analisis penjualan

### 2.6.5 Types
- Mengelompokkan produk berdasarkan tipe
- Membantu standardisasi data produk

### 2.6.6 Packaging
- Mengelola jenis kemasan
- Dipakai saat transaksi dan distribusi barang
- Berguna untuk perhitungan unit logistik

### 2.6.7 Unit of Measure
- Mengelola satuan ukuran
- Digunakan saat pengguna memasukkan jumlah barang
- Membantu konsistensi quantity di seluruh modul

### 2.6.8 Procurement Types
- Mengelola jenis pengadaan
- Membantu menentukan cara barang dibeli atau disiapkan
- Berguna dalam perencanaan stok dan pembelian

### Alur penggunaan Product
1. Admin menyiapkan data produk dasar.
2. Pengguna memilih produk saat membuat transaksi.
3. Sistem memakai master product untuk perhitungan, stok, dan laporan.
4. Perubahan data produk akan berpengaruh ke banyak transaksi.

## 2.7 Warehouses

### Tujuan
Mengelola gudang atau lokasi penyimpanan barang.

### Fungsi untuk pengguna
- Melihat daftar gudang
- Menambah gudang baru
- Mengatur lokasi penyimpanan barang
- Memakai gudang sebagai tujuan atau sumber stok

### Manfaat
- Memudahkan pengendalian stok per lokasi
- Membantu proses stock movement
- Berguna untuk distribusi barang

## 2.8 Payment & Courier

### Tujuan
Menyimpan referensi yang berkaitan dengan pembayaran dan pengiriman.

### 2.8.1 Currencies
- Mengelola mata uang transaksi
- Dipakai jika perusahaan bertransaksi multi-currency

### 2.8.2 Payment Terms
- Mengelola termin pembayaran
- Dipakai di sales dan purchase
- Membantu mengatur tempo pembayaran

### 2.8.3 Courier Agencies
- Mengelola jasa kurir atau ekspedisi
- Dipakai saat pengiriman barang
- Membantu pelacakan pengiriman

### 2.8.4 SO Sources
- Menyimpan sumber sales order
- Membantu analisis asal pesanan
- Berguna untuk evaluasi channel penjualan

## 2.9 Leave Types

### Tujuan
Mengelola jenis cuti yang tersedia di perusahaan.

### Fungsi untuk pengguna
- Melihat daftar jenis cuti
- Mengatur kategori cuti
- Memakai jenis cuti saat pengajuan leave request

### Manfaat
- Menjaga aturan cuti tetap jelas
- Membantu HRD membedakan cuti tahunan, sakit, dan jenis lainnya

## 2.10 Users

### Tujuan
Mengelola akun pengguna yang masuk ke sistem.

### Fungsi untuk pengguna
- Melihat daftar user
- Menambah user baru
- Menghubungkan user dengan karyawan
- Mengatur role dan permission

### Manfaat
- Menentukan siapa yang bisa mengakses menu tertentu
- Menjaga keamanan sistem
- Membantu pembagian tugas antar peran

---

# 3. Sales

Sales dipakai untuk mengelola proses penjualan end-to-end, mulai dari penawaran sampai pembayaran.

## Tujuan Sales
- Mencatat proses penjualan secara rapi
- Menghubungkan customer, barang, pengiriman, invoice, dan pembayaran
- Memberikan visibilitas atas progress transaksi

## Alur Besar Sales
Quotation → Sales Order → Delivery Order → Customer Invoice → Payment

## 3.1 Quotations

### Tujuan
Membuat penawaran harga kepada customer sebelum menjadi pesanan resmi.

### Yang bisa dilakukan pengguna
- Membuat quotation baru
- Memilih customer dan item produk
- Mengatur harga, diskon, dan termin
- Mengirim quotation untuk persetujuan atau tindak lanjut
- Melihat status quotation

### Hasil yang diharapkan
- Customer menerima penawaran yang jelas
- Tim sales memiliki jejak negosiasi yang rapi
- Penawaran bisa dilanjutkan menjadi order jika disetujui

## 3.2 Sales Orders

### Tujuan
Mengubah penawaran yang disetujui menjadi pesanan resmi.

### Yang bisa dilakukan pengguna
- Membuat sales order dari quotation
- Memeriksa kembali item dan jumlah barang
- Menetapkan tanggal dan catatan penting
- Menyimpan pesanan sebagai dasar proses berikutnya

### Hasil yang diharapkan
- Order resmi tercatat dalam sistem
- Gudang dan invoice punya referensi yang sama
- Proses pengiriman dapat dimulai

## 3.3 Delivery Orders

### Tujuan
Mengatur barang yang keluar dari gudang menuju customer.

### Yang bisa dilakukan pengguna
- Memilih order yang siap dikirim
- Mengecek jumlah item yang akan dikirim
- Menentukan pengiriman per alamat atau per tujuan
- Melihat status pengiriman

### Hasil yang diharapkan
- Barang yang dikirim sesuai pesanan
- Status order berpindah ke tahap berikutnya
- Gudang punya catatan barang keluar yang akurat

## 3.4 Customer Invoices

### Tujuan
Membuat tagihan atas barang atau jasa yang sudah dikirim atau disepakati.

### Yang bisa dilakukan pengguna
- Membuat invoice dari order atau delivery
- Memeriksa perhitungan nilai tagihan
- Menyertakan pajak, diskon, atau biaya lain bila ada
- Mengirim invoice ke customer

### Hasil yang diharapkan
- Tagihan tercatat jelas
- Piutang customer bisa dipantau
- Finance dapat memakai data ini untuk pencatatan lanjutan

## 3.5 Customer Invoices DP

### Tujuan
Mengelola pembayaran uang muka dari customer.

### Yang bisa dilakukan pengguna
- Membuat invoice down payment
- Mencatat pembayaran awal
- Mengurangi DP saat invoice final dibuat

### Hasil yang diharapkan
- Uang muka customer tercatat rapi
- Invoice final lebih akurat
- Proses penagihan lebih jelas

## 3.6 Returns

### Tujuan
Mengelola retur barang dari customer.

### Yang bisa dilakukan pengguna
- Membuat retur berdasarkan transaksi terkait
- Mengisi alasan retur
- Menyesuaikan jumlah barang yang dikembalikan
- Melihat dampak retur terhadap stok atau nilai transaksi

### Hasil yang diharapkan
- Barang yang kembali tercatat
- Data transaksi tidak salah hitung
- Stok dan laporan tetap konsisten

## 3.7 Payments

### Tujuan
Mencatat pembayaran customer atas invoice yang ada.

### Yang bisa dilakukan pengguna
- Memilih invoice yang akan dibayar
- Mengisi nominal pembayaran
- Menentukan metode bayar
- Melihat invoice yang masih terbuka

### Hasil yang diharapkan
- Piutang berkurang sesuai pembayaran
- Status invoice ter-update
- Rekap pembayaran mudah dipantau

## 3.8 Receivables Recap

### Tujuan
Memberikan rekap piutang customer.

### Yang bisa dilakukan pengguna
- Melihat piutang yang masih aktif
- Memantau tagihan yang belum lunas
- Mengidentifikasi customer dengan saldo terbuka

### Manfaat
- Membantu follow-up penagihan
- Menjadi dasar kontrol cash flow
- Memberikan gambaran kesehatan piutang

## 3.9 Sales Target

### Tujuan
Mengelola target penjualan untuk individu atau tim.

### Yang bisa dilakukan pengguna
- Mengisi target periode tertentu
- Membandingkan target vs realisasi
- Memantau progres pencapaian

### Manfaat
- Memudahkan evaluasi kinerja sales
- Membantu manajemen mengambil keputusan
- Menjadikan aktivitas penjualan lebih terukur

---

# 4. Purchase

Purchase digunakan untuk mengatur proses pembelian dari kebutuhan awal sampai pembayaran ke supplier.

## Tujuan Purchase
- Mengelola permintaan pembelian internal
- Membuat pembelian yang terkontrol
- Menjaga kesesuaian antara order, barang datang, invoice, dan pembayaran

## Alur Besar Purchase
Requisition → Purchase Order → Goods Receipt → Supplier Invoice → Payment

## 4.1 Requisitions

### Tujuan
Mencatat permintaan pembelian dari unit kerja.

### Yang bisa dilakukan pengguna
- Mengajukan kebutuhan barang atau jasa
- Menulis alasan permintaan
- Menyertakan item dan jumlah yang dibutuhkan
- Mengirim requisition untuk approval

### Hasil yang diharapkan
- Kebutuhan pembelian terdokumentasi
- Tidak ada pembelian yang muncul tanpa dasar
- Tim pembelian punya acuan yang jelas

## 4.2 Purchase Orders

### Tujuan
Membuat pesanan resmi ke supplier.

### Yang bisa dilakukan pengguna
- Memilih requisition yang disetujui
- Menentukan supplier
- Menentukan item, harga, dan termin
- Menyimpan purchase order
- Mengirim PO ke supplier

### Hasil yang diharapkan
- Supplier menerima dokumen order yang valid
- Tim pembelian punya kontrol harga dan kuantitas
- Proses penerimaan barang bisa dilanjutkan

## 4.3 Goods Receipt

### Tujuan
Mencatat barang yang benar-benar diterima dari supplier.

### Yang bisa dilakukan pengguna
- Membuka PO yang akan diterima
- Memeriksa barang datang
- Mencatat jumlah yang diterima
- Menyimpan penerimaan barang ke sistem

### Hasil yang diharapkan
- Stok bertambah sesuai barang masuk
- Ada jejak barang diterima atau ditolak
- Finance dan gudang punya referensi yang sama

## 4.4 Supplier Invoices

### Tujuan
Mencatat tagihan dari supplier.

### Yang bisa dilakukan pengguna
- Input invoice supplier
- Memeriksa kesesuaian dengan PO atau goods receipt
- Menyimpan invoice sebagai hutang
- Menyiapkan data untuk pembayaran

### Hasil yang diharapkan
- Hutang supplier tercatat
- Perhitungan tagihan lebih akurat
- Pembayaran dapat diproses sesuai jadwal

## 4.5 Supplier Invoices DP

### Tujuan
Mencatat down payment pada pembelian.

### Yang bisa dilakukan pengguna
- Mencatat pembayaran awal ke supplier
- Menyimpan data DP untuk pembelian tertentu
- Mengurangi nilai tagihan final jika DP dipakai

### Manfaat
- Memudahkan transaksi yang membutuhkan pembayaran awal
- Menjaga pencatatan keuangan tetap benar

## 4.6 Returns

### Tujuan
Mengelola barang yang dikembalikan ke supplier.

### Yang bisa dilakukan pengguna
- Membuat retur berdasarkan penerimaan atau pembelian
- Menentukan item yang diretur
- Menulis alasan retur
- Melihat dampak retur terhadap stok dan hutang

## 4.7 Payments

### Tujuan
Mencatat pembayaran kepada supplier.

### Yang bisa dilakukan pengguna
- Memilih invoice supplier
- Mengisi nominal pembayaran
- Menentukan metode bayar
- Menyimpan transaksi pembayaran

### Hasil yang diharapkan
- Hutang berkurang
- Rekap pembayaran lebih jelas
- Proses audit keuangan lebih mudah

## 4.8 Payable Recap

### Tujuan
Menampilkan ringkasan hutang kepada supplier.

### Yang bisa dilakukan pengguna
- Melihat hutang yang masih terbuka
- Mengecek invoice yang belum dibayar
- Memantau jatuh tempo pembayaran

### Manfaat
- Membantu kontrol cash out
- Menjadi dasar prioritas pembayaran
- Memudahkan monitoring kewajiban perusahaan

---

# 5. Stock

Stock dipakai untuk memantau dan mengendalikan persediaan barang secara real time.

## Tujuan Stock
- Mengetahui posisi stok dengan cepat
- Mencatat perpindahan barang
- Menjamin hasil stock opname sesuai kondisi fisik

## 5.1 Inventory

### Tujuan
Menampilkan ketersediaan barang yang ada di gudang atau lokasi tertentu.

### Yang bisa dilakukan pengguna
- Melihat stok per item
- Melihat stok per gudang
- Mengecek barang yang menipis
- Memantau ketersediaan sebelum transaksi dibuat

### Manfaat
- Mengurangi risiko stok kosong
- Membantu keputusan pembelian atau transfer barang
- Mempercepat pengecekan ketersediaan barang

## 5.2 Stock Movement

### Tujuan
Mencatat perpindahan stok antar lokasi, gudang, atau proses operasional.

### Yang bisa dilakukan pengguna
- Membuat mutasi stok
- Menentukan sumber dan tujuan stok
- Mencatat alasan perpindahan
- Melihat histori movement

### Hasil yang diharapkan
- Barang berpindah dengan jejak yang jelas
- Tidak ada perpindahan stok tanpa catatan
- Audit stok menjadi lebih mudah

## 5.3 Stock Opname

### Tujuan
Mencocokkan stok sistem dengan stok fisik di lapangan.

### Yang bisa dilakukan pengguna
- Melakukan penghitungan fisik
- Membandingkan hasil hitung dengan sistem
- Menyimpan selisih stok
- Melakukan koreksi bila dibutuhkan

### Hasil yang diharapkan
- Data stok menjadi lebih akurat
- Selisih fisik dan sistem bisa dianalisis
- Proses audit persediaan lebih terkendali

---

# 6. Finance

Finance digunakan untuk mengelola aktivitas keuangan, akuntansi, kas bank, budget, aset, gaji, dan laporan keuangan.

## Tujuan Finance
- Menyediakan pencatatan keuangan yang terstruktur
- Menghubungkan transaksi operasional ke akuntansi
- Memberikan kontrol atas budget dan aset

## 6.1 Accounting

### Tujuan
Mengelola inti proses akuntansi perusahaan.

### Fungsi untuk pengguna
- Mengelola Chart of Accounts
- Melihat jurnal transaksi
- Meninjau jurnal penyesuaian
- Melakukan financial closing

### 6.1.1 Chart of Accounts
- Menyimpan daftar akun akuntansi
- Dipakai sebagai struktur pencatatan keuangan
- Menjadi dasar pengelompokan debit dan kredit

### 6.1.2 Journal
- Menyimpan berbagai jurnal transaksi
- Menjadi pusat review pencatatan akuntansi

#### Journal Entries
- Menampilkan jurnal umum
- Digunakan untuk inspeksi transaksi

#### Sales Journal
- Menampilkan jurnal dari transaksi penjualan

#### Purchase Journal
- Menampilkan jurnal dari transaksi pembelian

#### Adjustment Journal
- Menampilkan jurnal penyesuaian
- Dipakai saat koreksi atau penyesuaian periode

#### Journal Valuation
- Mengelola penilaian tertentu yang memengaruhi jurnal

#### Cash & Bank Journal
- Mencatat transaksi kas dan bank
- Dipakai untuk transaksi masuk dan keluar uang

#### Journal Lines
- Menampilkan detail baris jurnal
- Berguna saat audit atau pelacakan detail transaksi

### 6.1.3 Financial Closing
- Menutup periode keuangan
- Digunakan saat akhir bulan atau akhir tahun
- Membantu menjaga data laporan agar tidak berubah sembarangan

## 6.2 Banking & Payments

### Tujuan
Mengelola rekening bank dan transaksi pembayaran yang lewat kas atau bank.

### 6.2.1 Bank Accounts
- Menyimpan daftar rekening perusahaan
- Dipakai saat transaksi pembayaran atau penerimaan

### 6.2.2 Payments
- Menyimpan transaksi pembayaran
- Digunakan untuk kontrol kas keluar dan masuk

### 6.2.3 Cash Bank Journal
- Mencatat perpindahan kas dan bank
- Berguna untuk rekonsiliasi dan pembukuan

## 6.3 Receivables & Payables

### Tujuan
Mengelola piutang dan hutang non dagang.

### 6.3.1 Non-Trade Payables
- Mengelola hutang di luar transaksi dagang utama
- Berguna untuk biaya operasional dan kewajiban lain

### 6.3.2 Tax Invoices
- Mengelola faktur pajak
- Dipakai untuk kebutuhan administrasi perpajakan

### 6.3.3 Aging Reports
- Menampilkan umur piutang atau hutang
- Membantu melihat keterlambatan pembayaran

## 6.4 Budgeting & Cost

### Tujuan
Mengontrol biaya dan memastikan pengeluaran tidak melebihi anggaran.

### 6.4.1 Budget
- Menetapkan budget per periode
- Dipakai untuk kontrol departemen atau cost center

### 6.4.2 Salary
- Mengelola pembebanan biaya gaji
- Membantu akuntansi payroll

### 6.4.3 Up Country Cost
- Mencatat biaya operasional di luar kota atau luar area utama
- Cocok untuk perjalanan dinas, project site, atau biaya lapangan

## 6.5 Asset Management

### Tujuan
Mengelola aset tetap perusahaan dari sisi data, kategori, dan lokasi.

### 6.5.1 Assets
- Menyimpan daftar aset
- Dipakai untuk monitoring dan depresiasi

### 6.5.2 Asset Categories
- Mengelompokkan aset berdasarkan kategori
- Memudahkan klasifikasi aset

### 6.5.3 Asset Locations
- Mengatur lokasi aset
- Membantu pelacakan aset secara fisik

### 6.5.4 Asset Budgets
- Mengatur anggaran aset
- Dipakai untuk perencanaan dan pengendalian pembelian aset

## 6.6 Financial Statements

### Tujuan
Menampilkan laporan keuangan utama untuk analisis dan pengambilan keputusan.

### 6.6.1 General Ledger
- Menampilkan buku besar
- Memudahkan penelusuran akun dan transaksi

### 6.6.2 Balance Sheet
- Menampilkan neraca
- Memberi gambaran posisi aset, kewajiban, dan ekuitas

### 6.6.3 Profit & Loss
- Menampilkan laba rugi
- Digunakan untuk membaca hasil kinerja perusahaan

---

# 7. HRD

HRD digunakan untuk mengelola aktivitas sumber daya manusia seperti absensi, cuti, evaluasi, rekrutmen, jadwal kerja, dan hari libur.

## Tujuan HRD
- Mengatur data dan proses karyawan secara lebih tertib
- Menyediakan informasi yang dibutuhkan untuk keputusan HR
- Menjaga disiplin dan dokumentasi tenaga kerja

## 7.1 Attendance

### Tujuan
Mencatat kehadiran karyawan.

### Fungsi untuk pengguna
- Melihat daftar absensi
- Memeriksa keterlambatan atau ketidakhadiran
- Menganalisis kehadiran untuk payroll atau evaluasi

### Manfaat
- Memudahkan monitoring disiplin kerja
- Menjadi dasar penghitungan lembur atau potongan
- Mendukung laporan HRD

## 7.2 Leave Requests

### Tujuan
Mengelola pengajuan cuti karyawan.

### Fungsi untuk pengguna
- Membuat pengajuan cuti untuk karyawan
- Memilih jenis cuti dan tanggal
- Melihat status approval
- Memantau saldo cuti

### Informasi yang perlu dilihat pengguna
- Nama karyawan
- Jenis cuti
- Tanggal mulai dan selesai
- Durasi cuti
- Status pengajuan
- Catatan approval atau penolakan

### Manfaat
- Cuti tercatat lebih rapi
- Approval lebih mudah dipantau
- Perhitungan saldo cuti lebih akurat

## 7.3 Evaluation

### Tujuan
Menyimpan dan mengelola evaluasi kinerja karyawan.

### Fungsi untuk pengguna
- Menilai performa periodik
- Melihat hasil evaluasi sebelumnya
- Menggunakan evaluasi sebagai dasar keputusan HR

## 7.4 Recruitment

### Tujuan
Membantu proses rekrutmen kandidat dari awal hingga tahap seleksi.

### Fungsi untuk pengguna
- Menyimpan kandidat
- Melihat tahapan seleksi
- Mengelola jadwal interview
- Mencatat status kandidat

## 7.5 Work Schedule

### Tujuan
Mengatur jadwal kerja, shift, atau pola kerja karyawan.

### Fungsi untuk pengguna
- Menyusun jadwal kerja tim
- Menentukan shift atau jam kerja
- Menyesuaikan jadwal dengan kebutuhan operasional

## 7.6 Holidays

### Tujuan
Mengelola hari libur yang dipakai dalam perhitungan absensi dan cuti.

### Fungsi untuk pengguna
- Melihat daftar hari libur
- Menambahkan hari libur baru
- Memastikan kalender kerja sesuai kebijakan perusahaan

---

# 8. CRM

CRM dipakai untuk mengelola hubungan dengan prospek, pelanggan, dan aktivitas penjualan lapangan.

## Tujuan CRM
- Mengatur pipeline prospek dan deal
- Mencatat aktivitas lapangan dan follow-up
- Memberi visibilitas atas performa tim sales dan customer engagement

## 8.1 Leads

### Tujuan
Menyimpan prospek awal sebelum menjadi peluang penjualan yang lebih matang.

### Fungsi untuk pengguna
- Menambahkan lead baru
- Mencatat sumber lead
- Melihat status tindak lanjut
- Menentukan lead mana yang perlu dihubungi lagi

## 8.2 Pipeline

### Tujuan
Memantau tahapan proses deal atau peluang penjualan.

### Fungsi untuk pengguna
- Melihat posisi setiap peluang
- Memindahkan deal antar tahap
- Mengetahui peluang yang hampir closing

## 8.3 Tasks

### Tujuan
Menyimpan tugas harian tim CRM.

### Fungsi untuk pengguna
- Membuat tugas follow-up
- Menentukan prioritas pekerjaan
- Memantau tugas yang belum selesai

## 8.4 Visit Reports

### Tujuan
Mencatat hasil kunjungan ke customer atau lokasi lapangan.

### Fungsi untuk pengguna
- Merekam hasil visit
- Menulis catatan kunjungan
- Menyimpan tindak lanjut yang harus dilakukan

## 8.5 Area Mapping

### Tujuan
Membagi area kerja customer atau tim sales.

### Fungsi untuk pengguna
- Mengelompokkan area kunjungan
- Memastikan cakupan wilayah lebih teratur
- Menghindari tumpang tindih penugasan

## 8.6 Route Optimization

### Tujuan
Menyusun rute kunjungan yang lebih efisien.

### Fungsi untuk pengguna
- Menentukan urutan visit
- Meminimalkan waktu tempuh
- Memaksimalkan produktivitas lapangan

## 8.7 Sales Performance

### Tujuan
Menampilkan performa penjualan tim atau individu.

### Fungsi untuk pengguna
- Melihat pencapaian sales
- Membandingkan target dan realisasi
- Mengevaluasi performa berdasarkan periode

## 8.8 Sales Target

### Tujuan
Mengelola target penjualan di CRM.

### Fungsi untuk pengguna
- Mengatur target tim atau individu
- Memantau progres pencapaian
- Mengukur efektivitas kerja sales

## 8.9 Product Analytics

### Tujuan
Menganalisis performa produk dari sisi CRM dan aktivitas pasar.

### Fungsi untuk pengguna
- Melihat produk yang paling aktif
- Memahami pola penjualan per produk
- Mendukung keputusan promosi dan stok

## 8.10 CRM Targets

### Tujuan
Mengelola target khusus di modul CRM.

### Fungsi untuk pengguna
- Membuat target yang lebih spesifik
- Mengawasi pencapaian berdasarkan parameter tertentu

## 8.11 CRM Settings

### Tujuan
Mengelola referensi dan konfigurasi CRM.

### Sub Menu CRM Settings

#### Pipeline Stages
- Mengatur tahapan pipeline
- Dipakai saat menggeser status deal

#### Lead Sources
- Mengelola sumber lead
- Berguna untuk analisis asal prospek

#### Lead Statuses
- Mengelola status lead
- Membantu klasifikasi tindak lanjut

#### Contact Roles
- Mengelola peran kontak
- Berguna saat ada lebih dari satu kontak di satu customer

#### Activity Types
- Mengelola jenis aktivitas CRM
- Dipakai untuk mencatat panggilan, visit, follow-up, dan aktivitas lain

---

# 9. Reports

Reports digunakan untuk melihat hasil analisis dan ringkasan bisnis dari berbagai modul.

## Tujuan Reports
- Menyediakan data ringkas untuk keputusan manajemen
- Menggabungkan informasi dari banyak modul
- Memudahkan pembacaan performa bisnis

## 9.1 Sales Overview

### Tujuan
Menampilkan ringkasan penjualan.

### Fungsi untuk pengguna
- Melihat penjualan secara umum
- Membaca tren performa penjualan
- Memahami kondisi sales dalam periode tertentu

## 9.2 Top Product

### Tujuan
Menampilkan produk yang paling sering terjual atau paling berkontribusi.

### Fungsi untuk pengguna
- Melihat produk unggulan
- Menentukan produk yang perlu diprioritaskan
- Membantu strategi stok dan promosi

## 9.3 Geo Performance

### Tujuan
Menampilkan performa berdasarkan wilayah.

### Fungsi untuk pengguna
- Membandingkan performa antar area
- Melihat wilayah dengan pertumbuhan terbaik
- Membantu strategi distribusi dan sales territory

## 9.4 Customer Research

### Tujuan
Menyajikan wawasan tentang customer.

### Fungsi untuk pengguna
- Memahami pola pembelian pelanggan
- Melihat segmentasi customer
- Mendukung strategi relasi pelanggan

## 9.5 Supplier Research

### Tujuan
Menyajikan analisis supplier.

### Fungsi untuk pengguna
- Melihat performa supplier
- Membandingkan histori kerja sama
- Membantu evaluasi vendor

---

# 10. AI Assistant

AI Assistant adalah menu bantuan cerdas yang mendukung pengguna saat bekerja di sistem.

## Tujuan AI Assistant
- Memberikan bantuan cepat kepada pengguna
- Menjadi asisten untuk pertanyaan operasional
- Membantu pengguna menemukan informasi dengan lebih cepat

## 10.1 Chatbot

### Tujuan
Memberikan interaksi percakapan untuk membantu pengguna.

### Fungsi untuk pengguna
- Mengajukan pertanyaan secara natural
- Meminta bantuan terkait fitur atau proses kerja
- Mendapat jawaban cepat tanpa harus mencari manual

## 10.2 Settings

### Tujuan
Mengatur perilaku dan konfigurasi AI Assistant.

### Fungsi untuk pengguna
- Menyesuaikan pengaturan asisten
- Mengelola preferensi penggunaan AI

---

# Ringkasan Value Produk

GIMS dirancang sebagai sistem kerja yang terintegrasi. Nilai utamanya bukan hanya pada daftar fitur, tetapi pada bagaimana setiap menu saling terhubung.

## Nilai utama untuk pengguna
- Data diinput sekali dan dipakai lintas modul
- Proses kerja menjadi lebih terstruktur
- Pengguna bisa melacak status pekerjaan dengan lebih mudah
- Manajemen mendapatkan gambaran bisnis yang lebih jelas
- Dashboard dan laporan membantu pengambilan keputusan lebih cepat

## Prinsip dokumentasi yang dipakai
- Fokus pada kebutuhan pengguna
- Menjelaskan apa yang dapat dilakukan di setiap menu
- Menjelaskan alur penggunaan, bukan hanya daftar fitur
- Menyusun dokumentasi sesuai urutan produk yang dilihat pengguna
- Menjadikannya referensi yang mudah dibaca dan mudah diperbarui

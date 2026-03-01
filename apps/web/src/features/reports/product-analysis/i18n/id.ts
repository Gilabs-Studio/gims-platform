export const productAnalysisReportId = {
  productAnalysisReport: {
    title: "Analisis Produk",
    description:
      "Analisis performa penjualan produk dan tren di seluruh produk",
    performance_list: "Daftar Performa Produk",
    performance_list_desc: "Performa produk lengkap dengan filter",

    // Chart
    chart: {
      title: "Penjualan Produk Bulanan",
      description: "Tren pendapatan, kuantitas, dan pesanan dari waktu ke waktu",
      filter: {
        year: "Tahunan",
        customRange: "Rentang Kustom",
      },
      noData: "Tidak ada data untuk periode yang dipilih",
      metrics: {
        revenue: "Pendapatan",
        qty: "Jumlah Terjual",
        orders: "Pesanan",
      },
    },

    // Table
    table: {
      rank: "Peringkat",
      product: "Produk",
      category: "Kategori",
      revenue: "Pendapatan",
      qty: "Jml Terjual",
      orders: "Pesanan",
      avgPrice: "Harga Rata-rata",
      actions: "Aksi",
      searchPlaceholder: "Cari berdasarkan nama, kode, atau SKU...",
      noData: "Data performa produk tidak ditemukan",
      viewDetail: "Lihat Detail",
    },

    // Detail Page
    detail: {
      back: "Kembali",
      notFound: "Produk tidak ditemukan",
      totalRevenue: "Total Pendapatan",
      totalQty: "Jumlah Terjual",
      totalOrders: "Total Pesanan",
      avgPrice: "Harga Rata-rata",
      tabsTitle: "Data Produk",
      tabsDescription:
        "Pelanggan teratas, perwakilan penjualan, dan tren bulanan",
      productInfo: "Informasi Produk",
      productName: "Nama Produk",
      category: "Kategori",
      pricingStock: "Harga & Stok",
      sellingPrice: "Harga Jual",
      costPrice: "Harga Pokok",
      currentStock: "Stok Saat Ini",
      tabCustomers: "Pelanggan Teratas",
      tabSalesReps: "Sales Rep Teratas",
      tabTrend: "Tren Bulanan",
      customerName: "Pelanggan",
      customerType: "Tipe",
      city: "Kota",
      revenue: "Pendapatan",
      qty: "Jml",
      orders: "Pesanan",
      salesRepName: "Sales Rep",
      position: "Jabatan",
      noData: "Tidak ada data untuk periode yang dipilih",
    },

    // Analysis Mode Toggle
    toggle: {
      byProduct: "Per Produk",
      byCategory: "Per Kategori",
      bySegment: "Per Segmen",
      byType: "Per Tipe",
      byPackaging: "Per Kemasan",
      byProcurementType: "Per Tipe Pengadaan",
    },

    // Generic Dimension Performance Table
    dimensionTable: {
      segment: "Segmen",
      type: "Tipe Produk",
      packaging: "Kemasan",
      procurementType: "Tipe Pengadaan",
      productCount: "Produk",
      searchPlaceholder: "Cari berdasarkan nama...",
      noData: "Data tidak ditemukan untuk periode yang dipilih",
    },

    // Category Performance Table
    categoryTable: {
      title: "Performa Kategori",
      description: "Performa penjualan dirangkum berdasarkan kategori produk",
      category: "Kategori",
      productCount: "Produk",
      searchPlaceholder: "Cari berdasarkan nama kategori...",
      noData: "Data performa kategori tidak ditemukan",
    },
  },
};

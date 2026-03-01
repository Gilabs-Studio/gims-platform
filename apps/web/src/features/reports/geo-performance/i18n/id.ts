export const geoPerformanceReportId = {
  geoPerformanceReport: {
    title: "Laporan Performa Geografis",
    description:
      "Visualisasikan distribusi revenue dan pesanan di berbagai wilayah menggunakan peta interaktif.",
    filters: {
      dateRange: "Rentang Tanggal",
      startDate: "Tanggal Mulai",
      endDate: "Tanggal Selesai",
      mode: "Sumber Data",
      modeOptions: {
        sales_order: "Sales Order (Demand)",
        paid_invoice: "Invoice Terbayar (Revenue)",
      },
      level: "Level Agregasi",
      levelOptions: {
        province: "Provinsi",
        city: "Kota / Kabupaten",
      },
      salesRep: "Sales Representative",
      allSalesReps: "Semua Sales",
      metric: "Warna Berdasarkan",
      metricOptions: {
        revenue: "Revenue",
        frequency: "Frekuensi Order",
      },
      apply: "Terapkan Filter",
      reset: "Reset",
    },
    map: {
      loading: "Memuat data peta...",
      noData: "Tidak ada data untuk filter yang dipilih.",
      noDataHint:
        "Coba ubah rentang tanggal, sumber data, atau filter sales representative.",
    },
    tooltip: {
      areaName: "Wilayah",
      totalRevenue: "Total Revenue",
      totalOrders: "Total Pesanan",
      avgOrderValue: "Rata-rata Nilai Order",
      province: "Provinsi",
    },
    summary: {
      totalRevenue: "Total Revenue",
      totalOrders: "Total Pesanan",
      avgOrderValue: "Rata-rata Nilai Order",
      areasWithData: "Wilayah Aktif",
    },
    table: {
      title: "Peringkat Performa Wilayah",
      rank: "#",
      areaName: "Wilayah",
      totalRevenue: "Revenue",
      totalOrders: "Pesanan",
      avgOrderValue: "Rata-rata Order",
      noData: "Tidak ada data wilayah ditemukan.",
    },
    mapStyle: {
      auto: "Otomatis",
      light: "Terang",
      dark: "Gelap",
      satellite: "Satelit",
    },
  },
};

export const customerResearchReportId = {
  customerResearchReport: {
    title: "Riset Pelanggan",
    description:
      "Analisis aktivitas pelanggan, pola pendapatan, dan kualitas relasi pelanggan.",
    kpis: {
      total_customers: "Total Pelanggan",
      active_customers: "Pelanggan Aktif",
      inactive_customers: "Pelanggan Tidak Aktif",
      total_revenue: "Total Pendapatan",
      average_order_value: "Rata-rata Nilai Order",
    },
    chart: {
      title: "Tren Pendapatan",
      description: "Tren pendapatan berdasarkan interval dan rentang tanggal.",
      total_revenue: "Total Pendapatan",
      revenue_by_customer: "Pendapatan per Pelanggan",
      revenue_by_customer_desc: "Pelanggan teratas berdasarkan total pendapatan.",
      purchase_frequency: "Frekuensi Pembelian Pelanggan",
      purchase_frequency_desc: "Pelanggan teratas berdasarkan total order.",
      no_data: "Tidak ada data tren untuk periode yang dipilih.",
      interval: {
        daily: "Harian",
        weekly: "Mingguan",
        monthly: "Bulanan",
      },
    },
    table: {
      title: "Tabel Insight Pelanggan",
      description: "Data pelanggan teratas, tidak aktif, dan perilaku pembayaran.",
      search_placeholder: "Cari pelanggan berdasarkan nama atau kode...",
      tabs: {
        top: "Pelanggan Teratas",
        inactive: "Pelanggan Tidak Aktif",
        payment_behavior: "Perilaku Pembayaran",
      },
      columns: {
        customer: "Pelanggan",
        total_revenue: "Total Pendapatan",
        total_orders: "Total Order",
        average_order_value: "Rata-rata Nilai Order",
        last_order_date: "Tanggal Order Terakhir",
      },
      empty: {
        default: "Tidak ada data pelanggan untuk filter yang dipilih.",
        payment_behavior:
          "Tidak ada data perilaku pembayaran untuk filter yang dipilih.",
      },
    },
    detail: {
      title: "Detail Pelanggan",
      description: "Metrik detail pelanggan untuk periode terpilih.",
      not_found: "Detail pelanggan tidak ditemukan.",
      total_revenue: "Total Pendapatan",
      total_orders: "Total Order",
      average_order_value: "Rata-rata Nilai Order",
      last_order_date: "Tanggal Order Terakhir"
    },
  },
};

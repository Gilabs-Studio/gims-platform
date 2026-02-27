export const inventoryId = {
  inventory: {
    title: "Stok Inventaris",
    subtitle: "Pantau tingkat stok real-time di semua gudang",
    searchPlaceholder: "Cari nama atau kode produk...",
    status: {
      ok: "OK",
      lowStock: "Stok Rendah",
      outOfStock: "Stok Habis",
      overstock: "Berlebih",
      expiring: "Hampir Kadaluarsa",
      expired: "Kedaluwarsa"
    },
    filter: {
      warehouse: "Gudang",
      allWarehouses: "Semua Gudang",
      showLowStockOnly: "Tampilkan Stok Rendah",
      showAll: "Tampilkan Semua"
    },
    table: {
      product: "Produk",
      warehouse: "Gudang",
      onHand: "Fisik",
      reserved: "Dipesan",
      available: "Tersedia",
      range: "Min - Max",
      status: "Status"
    },
    common: {
      loading: "Memuat inventaris...",
      noData: "Tidak ada item inventaris yang sesuai kriteria",
      error: "Gagal memuat data inventaris",
      page: "Halaman",
      of: "dari",
      previous: "Sebelumnya",
      next: "Selanjutnya",
      noWarehouse: "Tanpa Gudang"
    }
  },
  stock_movement: {
    title: "Pergerakan Stok",
    description: "Buku besar pusat untuk semua perubahan inventaris (GR, DO, Penyesuaian)",
    filters: {
      warehouse: "Semua Gudang",
      product: "Semua Produk",
      type: "Semua Tipe",
      search: "Cari nomor referensi..."
    },
    table: {
      date: "Tanggal",
      type: "Tipe",
      ref_no: "No Ref",
      source: "Sumber / Tujuan",
      in: "MASUK",
      out: "KELUAR",
      balance: "Saldo",
      cost: "Biaya",
      user: "Pengguna"
    },
    dialog: {
      title: "Detail Pergerakan",
      refInfo: "Informasi Referensi",
      productInfo: "Informasi Produk",
      movementInfo: "Informasi Pergerakan",
      financials: "Keuangan",
      qtyIn: "Jumlah Masuk",
      qtyOut: "Jumlah Keluar",
      balanceAfter: "Saldo Akhir",
      unitCost: "Biaya Satuan",
      totalValue: "Total Nilai"
    }
  }
};

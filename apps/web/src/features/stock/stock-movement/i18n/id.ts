export const stockMovementId = {
  stock_movement: {
    title: "Pergerakan Stok",
    description: "Lacak semua pergerakan inventaris di seluruh gudang",
    filters: {
      warehouse: "Semua Gudang",
      product: "Semua Produk",
      type: "Semua Tipe",
      search: "Cari berdasarkan nomor referensi...",
    },
    table: {
      date: "Tanggal",
      type: "Tipe",
      ref_no: "No. Ref.",
      source: "Sumber",
      in: "Qty Masuk",
      out: "Qty Keluar",
      balance: "Saldo",
      cost: "Biaya Satuan",
      user: "Pengguna",
    },
    dialog: {
      title: "Detail Pergerakan",
      refInfo: "Info Referensi",
      movementInfo: "Info Pergerakan",
      qtyIn: "Qty Masuk",
      qtyOut: "Qty Keluar",
      balanceAfter: "Saldo Setelah",
      unitCost: "Biaya Satuan",
      totalValue: "Total Nilai",
    },
  },
};

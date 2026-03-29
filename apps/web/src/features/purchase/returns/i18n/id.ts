export const purchaseReturnsId = {
  purchaseReturns: {
    title: "Retur Pembelian",
    subtitle: "Kelola pengembalian barang ke supplier",
    add: "Buat Retur",
    search: "Cari nomor retur atau alasan",
    empty: "Belum ada data retur pembelian",
    columns: {
      code: "Nomor Retur",
      goodsReceipt: "Goods Receipt",
      action: "Aksi",
      status: "Status",
      createdAt: "Dibuat",
      amount: "Nilai",
    },
    common: {
      add: "Buat Retur",
      updated: "Retur pembelian berhasil diperbarui",
      deleted: "Retur pembelian berhasil dihapus",
      deleteConfirmation: "Apakah Anda yakin ingin menghapus retur pembelian ini?",
      error: "Terjadi kesalahan",
    },
    validation: {
      duplicateItem: "Produk duplikat tidak diperbolehkan pada item retur.",
      qtyExceeds: "Qty melebihi kuantitas retur yang tersedia untuk {product}. Diminta: {requested}, Diterima: {received}, Sudah diretur: {returned}, Tersedia: {available}",
    },
    status: {
      draft: "Draft",
      submitted: "Diajukan",
      approved: "Disetujui",
      rejected: "Ditolak",
    },
    tabs: {
      general: "Umum",
      auditTrail: "Audit Trail",
    },
    auditTrail: {
      title: "Audit Trail",
      empty: "Belum ada audit trail",
      columns: {
        action: "Aksi",
        user: "User",
        time: "Waktu",
        details: "Detail",
      },
    },
    actions: {
      view: "Lihat",
      submit: "Ajukan",
      approve: "Setujui",
      reject: "Tolak",
      delete: "Hapus",
    },
    detail: {
      title: "Detail Retur Pembelian",
      status: "Status",
      goodsReceipt: "Goods Receipt",
      supplier: "Supplier",
      action: "Aksi",
      amount: "Nilai",
      createdAt: "Dibuat",
    },
  },
};

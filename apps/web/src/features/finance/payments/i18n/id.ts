export const financePaymentsId = {
  title: "Pembayaran",
  description: "Catat pembayaran dan alokasi.",
  search: "Cari pembayaran...",
  fields: {
    paymentDate: "Tanggal Pembayaran",
    description: "Deskripsi",
    bankAccount: "Rekening Bank",
    totalAmount: "Total",
    status: "Status",
    amount: "Jumlah",
    account: "Chart of Account",
    memo: "Catatan",
  },
  status: {
    draft: "Draft",
    posted: "Diposting",
  },
  actions: {
    create: "Buat",
    edit: "Ubah",
    approve: "Setujui",
    delete: "Hapus",
  },
  form: {
    createTitle: "Buat Pembayaran",
    editTitle: "Ubah Pembayaran",
    submit: "Simpan",
    cancel: "Batal",
    addAllocation: "Tambah Alokasi",
  },
  placeholders: {
    select: "Pilih...",
  },
  toast: {
    created: "Pembayaran dibuat",
    updated: "Pembayaran diperbarui",
    approved: "Pembayaran disetujui",
    deleted: "Pembayaran dihapus",
    failed: "Aksi gagal",
  },
};

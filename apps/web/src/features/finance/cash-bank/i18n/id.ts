export const financeCashBankId = {
  title: "Jurnal Kas/Bank",
  description: "Kelola jurnal kas dan bank.",
  search: "Cari entri...",
  fields: {
    transactionDate: "Tanggal Transaksi",
    type: "Tipe",
    description: "Deskripsi",
    bankAccount: "Rekening Bank",
    totalAmount: "Total",
    status: "Status",
    amount: "Jumlah",
    account: "Chart of Account",
    memo: "Catatan",
  },
  type: {
    cash_in: "Kas Masuk",
    cash_out: "Kas Keluar",
  },
  status: {
    draft: "Draft",
    posted: "Diposting",
  },
  actions: {
    create: "Buat",
    edit: "Ubah",
    post: "Posting",
    delete: "Hapus",
  },
  form: {
    createTitle: "Buat Entri",
    editTitle: "Ubah Entri",
    submit: "Simpan",
    cancel: "Batal",
    addLine: "Tambah Baris",
  },
  placeholders: {
    select: "Pilih...",
  },
  toast: {
    created: "Entri dibuat",
    updated: "Entri diperbarui",
    posted: "Entri diposting",
    deleted: "Entri dihapus",
    failed: "Aksi gagal",
  },
};


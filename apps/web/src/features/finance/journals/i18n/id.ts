export const financeJournalsId = {
  title: "Journal Entries",
  description: "Kelola jurnal.",
  salesTitle: "Jurnal Penjualan",
  salesDescription:
    "Daftar jurnal read-only dari transaksi penjualan (draft dan posted).",
  purchaseTitle: "Jurnal Pembelian",
  purchaseDescription:
    "Jurnal read-only dari transaksi pembelian (Penerimaan Barang, Faktur Supplier, Pembayaran Pembelian).",
  adjustmentTitle: "Jurnal Penyesuaian",
  adjustmentDescription:
    "Jurnal koreksi manual yang dikontrol oleh Finance. Mendukung buat, posting, dan pembalikan.",
  valuationTitle: "Valuasi Jurnal",
  valuationDescription:
    "Jurnal dari proses valuasi: valuasi inventaris, revaluasi mata uang, dan penyesuaian biaya.",
  cashBankTitle: "Jurnal Kas & Bank",
  cashBankDescription:
    "Tampilan monitoring read-only untuk jurnal transaksi kas dan bank.",
  search: "Cari deskripsi...",
  toast: {
    created: "Jurnal dibuat",
    updated: "Jurnal diperbarui",
    deleted: "Jurnal dihapus",
    posted: "Jurnal diposting",
    reversed: "Jurnal dibalik",
    failed: "Terjadi kesalahan",
    unbalanced: "Jurnal harus seimbang (debit = kredit)",
  },
  actions: {
    create: "Buat",
    export: "Ekspor",
    edit: "Ubah",
    delete: "Hapus",
    post: "Posting",
    reverse: "Balik",
    view: "Lihat",
    trialBalance: "Neraca Saldo",
  },
  fields: {
    entryDate: "Tanggal",
    description: "Deskripsi",
    status: "Status",
    debit: "Debit",
    credit: "Kredit",
    memo: "Memo",
    account: "Akun",
    startDate: "Tanggal Mulai",
    endDate: "Tanggal Selesai",
    code: "Kode",
    name: "Nama",
    balance: "Saldo",
    referenceType: "Tipe Referensi",
  },
  status: {
    draft: "Draft",
    posted: "Diposting",
    reversed: "Dibalik",
  },
  form: {
    createTitle: "Buat Jurnal",
    editTitle: "Ubah Jurnal",
    submit: "Simpan",
    cancel: "Batal",
    addLine: "Tambah baris",
  },
  placeholders: {
    select: "Pilih...",
  },
};

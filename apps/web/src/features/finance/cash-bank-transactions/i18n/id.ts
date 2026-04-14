export const financeCashBankTransactionsId = {
  title: "Transaksi Kas-Bank",
  description: "Buat, pantau, dan reverse transaksi kas-bank dengan posting jurnal otomatis.",
  search: "Cari transaksi...",
  fields: {
    referenceNumber: "Nomor Referensi",
    company: "Perusahaan",
    bankAccount: "Akun Bank",
    type: "Tipe",
    date: "Tanggal",
    amount: "Jumlah",
    status: "Status",
    journal: "Jurnal",
    reference: "Referensi",
    description: "Deskripsi",
    contraAccount: "Akun Lawan",
    reason: "Alasan",
  },
  status: {
    draft: "Draft",
    posted: "Posted",
    reversed: "Reversed",
  },
  types: {
    payment_in: "Uang Masuk",
    payment_out: "Uang Keluar",
  },
  actions: {
    create: "Buat",
    reverse: "Reverse",
    reversing: "Memproses reverse...",
  },
  form: {
    createTitle: "Buat Transaksi Kas-Bank",
    submit: "Simpan",
    cancel: "Batal",
  },
  reverse: {
    title: "Reverse Transaksi",
    description: "Membuat jurnal reversal untuk transaksi terpilih.",
  },
  toast: {
    created: "Transaksi berhasil dibuat",
    reversed: "Transaksi berhasil direverse",
    failed: "Aksi gagal",
  },
};

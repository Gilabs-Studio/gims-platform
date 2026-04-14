export const financeBankTransferId = {
  title: "Transfer Bank",
  description: "Kelola transfer antar bank dan status posting.",
  search: "Cari transfer...",
  fields: {
    transferNumber: "Nomor Transfer",
    date: "Tanggal",
    amount: "Jumlah",
    status: "Status",
    journal: "Jurnal",
    fromBankAccount: "Dari Akun Bank",
    toBankAccount: "Ke Akun Bank",
    company: "Perusahaan",
    reference: "Referensi",
    description: "Deskripsi",
    reason: "Alasan",
  },
  status: {
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  actions: {
    create: "Buat",
    complete: "Selesaikan",
    cancel: "Batalkan",
  },
  form: {
    createTitle: "Buat Transfer Bank",
    submit: "Simpan",
    cancel: "Batal",
  },
  toast: {
    created: "Transfer berhasil dibuat",
    completed: "Transfer berhasil diselesaikan",
    cancelled: "Transfer berhasil dibatalkan",
    failed: "Aksi gagal",
  },
};

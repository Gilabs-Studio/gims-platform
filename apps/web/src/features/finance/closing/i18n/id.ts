export const financeClosingId = {
  title: "Tutup Buku",
  description: "Buat dan setujui penutupan periode.",
  fields: {
    periodEndDate: "Akhir periode",
    status: "Status",
    notes: "Catatan",
    approvedAt: "Disetujui pada",
    fiscalYear: "Tahun Fiskal",
  },
  status: {
    draft: "Draf",
    approved: "Disetujui",
  },
  actions: {
    create: "Buat",
    approve: "Setujui",
    reopen: "Buka Kembali",
    yearEndClose: "Tutup Akhir Tahun",
    view: "Lihat Detail",
  },
  detail_title: "Detail Analisis Penutupan",
  analysis: {
    account_name: "Nama Akun",
    closing_balance: "Saldo Akhir Akun",
    opening_balance: "Saldo Awal Tahun",
    difference: "Selisih",
  },
  form: {
    createTitle: "Buat Tutup Buku",
    submit: "Simpan",
    cancel: "Batal",
  },
  toast: {
    created: "Tutup buku dibuat",
    approved: "Tutup buku disetujui",
    reopened: "Tutup buku dibuka kembali",
    yearEndClosed: "Penutupan akhir tahun selesai",
    failed: "Aksi gagal",
  },
};

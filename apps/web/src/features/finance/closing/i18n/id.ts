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
    delete: "Hapus",
    runWizard: "Jalankan Wizard Tutup Buku",
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
    back: "Kembali",
    next: "Lanjut",
    close: "Tutup",
  },
  snapshot: {
    title: "Snapshot",
    netProfit: "Laba Bersih",
    retainedEarnings: "Laba Ditahan",
  },
  validation: {
    title: "Validasi",
  },
  wizard: {
    title: "Wizard Penutupan Keuangan",
    steps: {
      precheck: "Pre-Check",
      review: "Tinjau",
      execute: "Jalankan",
      complete: "Selesai",
    },
    precheck: {
      title: "Validasi Pre-Check",
      description: "Verifikasi semua data sudah benar sebelum melanjutkan",
      accountCount: "Akun Termasuk",
      totalClosingBalance: "Total Saldo Akhir",
      totalDifference: "Total Selisih",
      warning: "Peringatan",
      differenceWarning:
        "Terdapat selisih antara saldo awal dan saldo akhir. Silakan tinjau neraca saldo.",
      openTrialBalance: "Buka Neraca Saldo",
    },
    review: {
      title: "Tinjau Neraca Saldo",
      description: "Tinjau saldo akun untuk periode ini",
      openTrialBalance: "Buka Neraca Saldo",
      showDifferencesOnly: "Tampilkan Hanya Selisih",
      showAll: "Tampilkan Semua",
    },
    execute: {
      title: "Siap Tutup?",
      description: "Klik setujui untuk mengunci periode penutupan keuangan",
      warning: "Penting",
      warningText:
        "Setelah disetujui, periode ini akan dikunci. Tidak ada penyesuaian lebih lanjut yang dapat dilakukan.",
      processing: "Memproses...",
    },
    complete: {
      title: "Penutupan Disetujui",
      description: "Periode penutupan keuangan berhasil dikunci",
      runYearEnd: "Juga jalankan penutupan akhir tahun",
      yearEndInfo:
        "Ini akan menutup akun dan mempersiapkan tahun fiskal berikutnya",
    },
  },
  toast: {
    created: "Tutup buku dibuat",
    approved: "Tutup buku disetujui",
    reopened: "Tutup buku dibuka kembali",
    yearEndClosed: "Penutupan akhir tahun selesai",
    deleted: "Tutup buku dihapus",
    failed: "Aksi gagal",
  },
};

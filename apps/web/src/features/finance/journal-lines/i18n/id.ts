export const journalLinesId = {
  journalLines: {
    title: "Baris Jurnal",
    description: "Lihat semua baris jurnal lintas akun dengan saldo berjalan.",
    search: "Cari kode COA, nama, atau memo...",
    empty: "Tidak ada baris jurnal ditemukan. Sesuaikan filter atau rentang tanggal.",
    error: "Gagal memuat baris jurnal. Silakan coba lagi.",
    totals: "Total Halaman",
    runningBalanceInfo:
      "Saldo berjalan ditampilkan karena satu akun dipilih. Saldo dihitung secara kronologis.",

    columns: {
      entryDate: "Tanggal",
      journalDescription: "Deskripsi Jurnal",
      refType: "Tipe Ref",
      coaCode: "Kode COA",
      coaName: "Nama Akun",
      memo: "Memo",
      debit: "Debit",
      credit: "Kredit",
      runningBalance: "Saldo Berjalan",
      status: "Status",
    },

    filters: {
      selectCoa: "Pilih Akun",
      allAccounts: "Semua Akun",
      accountType: "Tipe Akun",
      allTypes: "Semua Tipe",
      journalStatus: "Status Jurnal",
      allStatuses: "Semua Status",
      referenceType: "Tipe Referensi",
      allReferences: "Semua Referensi",
      startDate: "Tanggal Mulai",
      endDate: "Tanggal Selesai",
    },

    status: {
      draft: "Draft",
      posted: "Diposting",
    },

    actions: {
      export: "Ekspor CSV",
      resetFilters: "Reset Filter",
    },

    toast: {
      exportSuccess: "Baris jurnal berhasil diekspor",
    },
  },
};

export const visitI18nId = {
  visit: {
    title: "Kunjungan Sales",
    description: "Kelola jadwal dan laporan kunjungan pelanggan",

    // Table headers
    code: "Kode",
    visitDate: "Tanggal Kunjungan",
    scheduledTime: "Jadwal",
    employee: "Sales",
    company: "Perusahaan",
    contactPerson: "Kontak",
    purpose: "Tujuan",
    status: "Status",
    actions: "Aksi",

    // Status
    statusPlanned: "Dijadwalkan",
    statusInProgress: "Sedang Berlangsung",
    statusCompleted: "Selesai",
    statusCancelled: "Dibatalkan",

    // Actions
    create: "Kunjungan Baru",
    edit: "Edit",
    delete: "Hapus",
    view: "Lihat Detail",
    cancel: "Batalkan Kunjungan",
    checkIn: "Check In",
    checkOut: "Check Out",

    // Form labels
    form: {
      visitDate: "Tanggal Kunjungan",
      scheduledTime: "Jadwal",
      employee: "Sales Representative",
      company: "Perusahaan",
      contactPerson: "Nama Kontak",
      contactPhone: "No. Telepon Kontak",
      address: "Alamat Kunjungan",
      village: "Kelurahan",
      purpose: "Tujuan",
      notes: "Catatan",
      result: "Hasil",
      products: "Produk yang Dibahas",
      interestLevel: "Tingkat Ketertarikan",
      quantity: "Jumlah",
      price: "Harga",
      interestSurvey: "Survei Ketertarikan",
      noInterestSurvey: "Tidak ada pertanyaan skrining.",
      calculatedFromSurvey: "Dihitung dari survei",
    },

    // Dialogs
    createTitle: "Buat Kunjungan Baru",
    editTitle: "Edit Kunjungan",
    deleteTitle: "Hapus Kunjungan",
    deleteConfirm: "Anda yakin ingin menghapus kunjungan ini?",
    deleteDescription: "Tindakan ini tidak dapat dibatalkan.",
    cancelTitle: "Batalkan Kunjungan",
    cancelConfirm: "Anda yakin ingin membatalkan kunjungan ini?",
    cancelNotes: "Catatan Pembatalan",
    checkInTitle: "Check In",
    checkInConfirm: "Konfirmasi check in ke lokasi kunjungan?",
    checkOutTitle: "Check Out",
    checkOutResult: "Ringkasan Hasil Kunjungan",

    // Detail modal
    detailTitle: "Detail Kunjungan",
    tabOverview: "Ringkasan",
    tabProducts: "Produk",
    tabHistory: "Riwayat",
    noProducts: "Belum ada produk yang dibahas",
    noHistory: "Belum ada riwayat",

    // Empty state
    empty: "Tidak ada kunjungan",
    emptyDescription: "Buat kunjungan baru untuk memulai",

    // Filters
    filterByStatus: "Filter status",
    filterByEmployee: "Filter sales",
    filterByCompany: "Filter perusahaan",
    filterByDate: "Filter rentang tanggal",
    allStatuses: "Semua status",
    search: "Cari kunjungan...",

    // Validation
    validation: {
      required: "Field ini wajib diisi",
      invalidId: "ID tidak valid",
      interestLevelMin: "Tingkat ketertarikan tidak boleh negatif",
      interestLevelMax: "Tingkat ketertarikan maksimal 5",
      quantityMin: "Jumlah tidak boleh negatif",
      priceMin: "Harga tidak boleh negatif",
    },

    // Success messages
    createSuccess: "Kunjungan berhasil dibuat",
    updateSuccess: "Kunjungan berhasil diperbarui",
    deleteSuccess: "Kunjungan berhasil dihapus",
    cancelSuccess: "Kunjungan berhasil dibatalkan",
    checkInSuccess: "Berhasil check in",
    checkOutSuccess: "Berhasil check out",

    // Error messages
    fetchError: "Gagal memuat kunjungan",
    createError: "Gagal membuat kunjungan",
    updateError: "Gagal memperbarui kunjungan",
    deleteError: "Gagal menghapus kunjungan",

    // Calendar
    moreVisits: "{count} lagi",
    newVisit: "Kunjungan Baru",
    noVisitsToday: "Tidak ada jadwal",
  },
};

export const recruitmentId = {
  recruitment: {
    // Common
    common: {
      status: "Status",
      actions: "Aksi",
      search: "Cari...",
      filterBy: "Filter berdasarkan",
      noResults: "Tidak ada hasil ditemukan",
      error: "Gagal memuat data",
      loading: "Memuat...",
      save: "Simpan",
      cancel: "Batal",
      delete: "Hapus",
      update: "Perbarui",
      create: "Buat",
      saving: "Menyimpan...",
      edit: "Ubah",
      view: "Lihat",
      select: "Pilih",
      selectDate: "Pilih tanggal",
      all: "Semua",
      confirmDelete: "Apakah Anda yakin ingin menghapus permintaan rekrutmen ini?",
      deleteWarning: "Tindakan ini tidak dapat dibatalkan.",
      page: "Halaman",
      of: "dari",
      total: "total",
      previous: "Sebelumnya",
      next: "Selanjutnya",
      basicInfo: "Informasi Dasar",
      requirements: "Persyaratan",
      workflow: "Alur Kerja",
    },

    // Page
    title: "Permintaan Rekrutmen",
    subtitle: "Kelola permintaan rekrutmen dan lacak progres perekrutan",

    // Status
    status: {
      draft: "Draft",
      pending: "Menunggu",
      approved: "Disetujui",
      rejected: "Ditolak",
      open: "Dibuka",
      closed: "Ditutup",
      cancelled: "Dibatalkan",
    },

    // Priority
    priority: {
      label: "Prioritas",
      low: "Rendah",
      medium: "Sedang",
      high: "Tinggi",
      urgent: "Mendesak",
    },

    // Employment Type
    employmentType: {
      label: "Tipe Pekerjaan",
      fullTime: "Penuh Waktu",
      partTime: "Paruh Waktu",
      contract: "Kontrak",
      intern: "Magang",
    },

    // Fields
    requestCode: "Kode Permintaan",
    requestDate: "Tanggal Permintaan",
    requestedBy: "Diajukan Oleh",
    division: "Divisi",
    position: "Posisi",
    requiredCount: "Jumlah Dibutuhkan",
    filledCount: "Jumlah Terisi",
    openPositions: "Posisi Terbuka",
    expectedStartDate: "Tanggal Mulai Diharapkan",
    salaryRange: "Rentang Gaji",
    salaryRangeMin: "Gaji Minimum",
    salaryRangeMax: "Gaji Maksimum",
    jobDescription: "Deskripsi Pekerjaan",
    qualifications: "Kualifikasi",
    notes: "Catatan",
    approvedBy: "Disetujui Oleh",
    approvedAt: "Disetujui Pada",
    rejectedAt: "Ditolak Pada",
    rejectionNotes: "Catatan Penolakan",
    closedAt: "Ditutup Pada",

    // Search
    search: "Cari permintaan rekrutmen...",

    // CRUD
    add: "Tambah Permintaan",
    edit: "Ubah Permintaan",
    delete: "Hapus Permintaan",
    detail: "Detail Permintaan",
    notFound: "Tidak ada permintaan rekrutmen ditemukan",
    created: "Permintaan rekrutmen berhasil dibuat",
    updated: "Permintaan rekrutmen berhasil diperbarui",
    deleted: "Permintaan rekrutmen berhasil dihapus",
    statusUpdated: "Status permintaan rekrutmen berhasil diperbarui",
    filledCountUpdated: "Jumlah terisi berhasil diperbarui",
    deleteDesc:
      "Apakah Anda yakin ingin menghapus permintaan rekrutmen ini? Tindakan ini tidak dapat dibatalkan. Hanya permintaan draft yang dapat dihapus.",

    // Actions
    actions: {
      submit: "Ajukan Persetujuan",
      approve: "Setujui",
      reject: "Tolak",
      open: "Buka untuk Perekrutan",
      close: "Tutup",
      cancelRequest: "Batalkan Permintaan",
      updateFilled: "Perbarui Jumlah Terisi",
    },

    // Tabs
    tabs: {
      general: "Umum",
      requirements: "Persyaratan",
      workflow: "Alur Kerja",
    },

    // Validation
    validation: {
      required: "Kolom ini wajib diisi",
      invalidId: "Pilihan tidak valid",
      requiredCountPositive: "Jumlah dibutuhkan harus lebih besar dari 0",
      requiredCountMin: "Minimal 1 posisi dibutuhkan",
      mustBeInteger: "Harus berupa bilangan bulat",
      salaryMin: "Gaji tidak boleh negatif",
      maxLength: "Panjang maksimum terlampaui",
    },
  },
};

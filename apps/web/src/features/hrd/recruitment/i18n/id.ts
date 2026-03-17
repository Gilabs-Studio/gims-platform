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

    // Detail Page
    detailInfo: "Detail Informasi",

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
      // Uppercase variants (from backend enum)
      FULL_TIME: "Penuh Waktu",
      PART_TIME: "Paruh Waktu",
      CONTRACT: "Kontrak",
      INTERN: "Magang",
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
    progressLabel: "Progres",
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
      resubmit: "Ajukan Ulang untuk Persetujuan",
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
      info: "Informasi",
      applicants: "Pelamar",
    },

    // Views
    views: {
      card: "Kartu",
      list: "Daftar",
    },

    // Card
    card: {
      clickToView: "Klik untuk melihat detail",
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
      invalidEmail: "Alamat email tidak valid",
      invalidUrl: "URL tidak valid",
    },

    // Navigation
    backToList: "Kembali ke Daftar",
    requestNotFound: "Permintaan rekrutmen yang diminta tidak ditemukan",

    // Applicants
    applicants: {
      title: "Pelamar",
      add: "Tambah Pelamar",
      edit: "Ubah Pelamar",
      delete: "Hapus Pelamar",
      detail: "Detail Pelamar",
      empty: "Tidak ada pelamar di tahap ini",
      noStages: "Tidak ada tahapan pipeline yang dikonfigurasi",
      singular: "Pelamar",
      dragHelp: "Seret pelamar untuk memindahkan antar tahapan",
      noResume: "Tidak ada CV",
      hasResume: "CV",
      contactInfo: "Informasi Kontak",
      applicationDetails: "Detail Lamaran",
      activityHistory: "Riwayat Aktivitas",
      noActivities: "Belum ada aktivitas yang tercatat",
      viewResume: "Lihat Resume",
      appliedAt: "Melamar",
      notes: "Catatan",
      addDescription: "Tambahkan pelamar baru ke permintaan rekrutmen ini",
      editDescription: "Perbarui informasi pelamar",
      deleteDesc: "Apakah Anda yakin ingin menghapus pelamar ini? Tindakan ini tidak dapat dibatalkan.",
      created: "Pelamar berhasil ditambahkan",
      updated: "Pelamar berhasil diperbarui",
      deleted: "Pelamar berhasil dihapus",

      fields: {
        fullName: "Nama Lengkap",
        email: "Email",
        phone: "Telepon",
        resume: "URL Resume/CV",
        source: "Sumber",
        rating: "Penilaian",
        appliedAt: "Tanggal Melamar",
        stage: "Tahapan",
        notes: "Catatan",
      },

      placeholders: {
        fullName: "Masukkan nama lengkap",
        email: "Masukkan alamat email",
        phone: "Masukkan nomor telepon",
        resume: "Unggah CV/Resume (PDF, DOC, DOCX)",
        notes: "Tambahkan catatan tentang pelamar...",
      },

      sources: {
        linkedin: "LinkedIn",
        jobstreet: "JobStreet",
        glints: "Glints",
        referral: "Referral",
        direct: "Lamaran Langsung",
        other: "Lainnya",
      },
      selectSource: "Pilih sumber",

      actions: {
        moveStage: "Pindah Tahapan",
        scheduleInterview: "Jadwalkan Wawancara",
        sendOffer: "Kirim Penawaran",
        hire: "Rekrut",
        reject: "Tolak",
      },

      moveStage: {
        title: "Pindahkan Pelamar",
        description: "Pindahkan {name} ke {stage}?",
        fromStage: "Tahapan Saat Ini",
        toStage: "Tahapan Tujuan",
        reason: "Alasan",
        reasonPlaceholder: "Masukkan alasan perpindahan tahapan (wajib untuk penolakan)...",
        notes: "Catatan Tambahan",
        notesPlaceholder: "Tambahkan catatan tambahan...",
        confirm: "Pindahkan Pelamar",
      },
    },
  },
};

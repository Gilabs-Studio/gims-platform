export const evaluationId = {
  evaluation: {
    // Common
    common: {
      status: "Status",
      actions: "Aksi",
      search: "Cari...",
      filterBy: "Filter berdasarkan",
      error: "Gagal memuat data",
      loading: "Memuat...",
      save: "Simpan",
      cancel: "Batal",
      delete: "Hapus",
      update: "Perbarui",
      create: "Buat",
      edit: "Ubah",
      view: "Lihat",
      select: "Pilih",
      selectDate: "Pilih tanggal",
      all: "Semua",
      active: "Aktif",
      inactive: "Tidak Aktif",
    },

    // Page
    title: "Evaluasi Karyawan",
    subtitle: "Kelola grup evaluasi, kriteria, dan penilaian kinerja karyawan",

    // Tabs
    tabs: {
      evaluations: "Evaluasi",
      groups: "Grup Evaluasi",
    },

    // Status
    status: {
      draft: "Draft",
      submitted: "Diajukan",
      reviewed: "Ditinjau",
      finalized: "Selesai",
    },

    // Evaluation Type
    evaluationType: {
      self: "Penilaian Diri",
      manager: "Penilaian Atasan",
    },

    // Actions
    actions: {
      submit: "Ajukan",
      review: "Tandai Ditinjau",
      finalize: "Selesaikan",
    },

    // Evaluation Group
    group: {
      title: "Grup Evaluasi",
      label: "Grup Evaluasi",
      name: "Nama",
      namePlaceholder: "Masukkan nama grup",
      description: "Deskripsi",
      descriptionPlaceholder: "Masukkan deskripsi grup",
      isActive: "Aktif",
      totalWeight: "Total Bobot",
      search: "Cari grup evaluasi...",
      add: "Tambah Grup",
      edit: "Ubah Grup",
      delete: "Hapus Grup",
      deleted: "Grup evaluasi berhasil dihapus",
      created: "Grup evaluasi berhasil dibuat",
      updated: "Grup evaluasi berhasil diperbarui",
      notFound: "Tidak ada grup evaluasi ditemukan",
      deleteDesc:
        "Apakah Anda yakin ingin menghapus grup evaluasi ini? Semua kriteria terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.",
    },

    // Evaluation Criteria
    criteria: {
      title: "Kriteria",
      label: "Kriteria",
      name: "Nama",
      namePlaceholder: "Masukkan nama kriteria",
      description: "Deskripsi",
      descriptionPlaceholder: "Masukkan deskripsi kriteria",
      evaluationGroup: "Grup Evaluasi",
      weight: "Bobot",
      maxScore: "Skor Maksimal",
      sortOrder: "Urutan",
      search: "Cari kriteria...",
      add: "Tambah Kriteria",
      edit: "Ubah Kriteria",
      delete: "Hapus Kriteria",
      deleted: "Kriteria berhasil dihapus",
      created: "Kriteria berhasil dibuat",
      updated: "Kriteria berhasil diperbarui",
      notFound: "Tidak ada kriteria ditemukan",
      unknown: "Kriteria Tidak Dikenal",
      deleteDesc:
        "Apakah Anda yakin ingin menghapus kriteria ini? Tindakan ini tidak dapat dibatalkan.",
    },

    // Employee Evaluation
    evaluation: {
      title: "Evaluasi Karyawan",
      label: "Evaluasi",
      detail: "Detail Evaluasi",
      employee: "Karyawan",
      evaluator: "Penilai",
      evaluationGroup: "Grup Evaluasi",
      type: "Tipe",
      period: "Periode",
      periodStart: "Mulai Periode",
      periodEnd: "Akhir Periode",
      score: "Skor",
      overallScore: "Skor Keseluruhan",
      weightedScore: "Skor Terbobot",
      criteriaScores: "Skor Kriteria",
      notes: "Catatan",
      notesPlaceholder: "Masukkan catatan...",
      scoreNotes: "Catatan skor...",
      noScores: "Belum ada skor kriteria yang tercatat",
      search: "Cari evaluasi...",
      add: "Tambah Evaluasi",
      edit: "Ubah Evaluasi",
      delete: "Hapus Evaluasi",
      deleted: "Evaluasi berhasil dihapus",
      created: "Evaluasi berhasil dibuat",
      updated: "Evaluasi berhasil diperbarui",
      statusUpdated: "Status evaluasi berhasil diperbarui",
      notFound: "Tidak ada evaluasi ditemukan",
      deleteDesc:
        "Apakah Anda yakin ingin menghapus evaluasi ini? Tindakan ini tidak dapat dibatalkan. Hanya evaluasi draft yang dapat dihapus.",
    },

    // Validation
    validation: {
      required: "Field ini wajib diisi",
      maxLength: "Panjang maksimal terlampaui",
      invalidId: "Pilihan tidak valid",
      weightPositive: "Bobot harus lebih dari 0",
      weightMax: "Bobot tidak boleh lebih dari 100",
      maxScorePositive: "Skor maksimal harus lebih dari 0",
      scoreMin: "Skor tidak boleh negatif",
    },
  },
};

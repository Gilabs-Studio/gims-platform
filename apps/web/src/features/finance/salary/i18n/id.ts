export const financeSalaryId = {
  title: "Gaji Pokok",
  description: "Kelola gaji pokok karyawan dan lacak riwayat gaji.",
  empty: "Tidak ada data gaji.",
  searchPlaceholder: "Cari berdasarkan nama karyawan...",

  stats: {
    overview: "Ikhtisar",
    salaryStats: "Statistik Gaji",
    salaryTrend: "Tren Gaji",
    total: "Total",
    active: "Aktif",
    draft: "Draft Pending",
    inactive: "Tidak Aktif",
    average: "Rata-rata Gaji",
    min: "Gaji Minimum",
    max: "Gaji Maksimum",
  },

  fields: {
    employee: "Karyawan",
    effectiveDate: "Tanggal Efektif",
    basicSalary: "Gaji Pokok",
    notes: "Catatan",
    status: "Status",
    historyCount: "Riwayat",
    createdAt: "Dibuat",
    updatedAt: "Diperbarui",
  },

  status: {
    draft: "Draft",
    active: "Aktif",
    inactive: "Tidak Aktif",
  },

  form: {
    createTitle: "Tambah Gaji Pokok Baru",
    editTitle: "Edit Gaji Pokok",
    description: "Tambah catatan gaji pokok baru untuk karyawan.",
    editDescription: "Perbarui informasi gaji pokok.",
    sections: {
      employee: "Informasi Karyawan",
      salary: "Informasi Gaji",
      additional: "Informasi Tambahan",
    },
    cancel: "Batal",
    submit: "Simpan",
    submitting: "Menyimpan...",
  },

  actions: {
    approve: "Setujui",
    add: "Tambah Gaji",
    addSalary: "Tambah Catatan Gaji",
    refresh: "Perbarui",
    clearFilters: "Hapus Filter",
    clear: "Hapus",
    edit: "Edit",
    delete: "Hapus",
    activate: "Aktifkan",
    deactivate: "Nonaktifkan",
  },

  approve: {
    title: "Setujui Gaji",
    description:
      "Anda akan menyetujui catatan gaji ini. Ini akan mengaktifkannya dan menonaktifkan gaji aktif karyawan saat ini.",
    warning:
      "Gaji aktif sebelumnya akan ditandai tidak aktif. Tindakan ini tidak dapat dibatalkan.",
    processing: "Menyetujui...",
  },

  delete: {
    title: "Hapus Draft Gaji",
    description:
      "Apakah Anda yakin ingin menghapus draft gaji ini? Hanya draft yang dapat dihapus.",
    item: "draft gaji",
  },

  detail: {
    title: "Detail Gaji",
  },

  toast: {
    created: "Gaji berhasil ditambahkan",
    updated: "Gaji berhasil diperbarui",
    deleted: "Gaji berhasil dihapus",
    approved: "Gaji berhasil disetujui",
    activated: "Gaji berhasil diaktifkan",
    deactivated: "Gaji berhasil dinonaktifkan",
    failed: "Operasi gagal. Silakan coba lagi.",
  },

  placeholders: {
    select: "Pilih...",
    selectEmployee: "Pilih karyawan...",
    notes: "Tambah catatan opsional...",
  },
};

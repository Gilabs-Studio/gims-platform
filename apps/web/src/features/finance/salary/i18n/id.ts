export const financeSalaryId = {
  title: "Struktur Gaji",
  description: "Kelola gaji pokok karyawan.",
  empty: "Tidak ada data gaji.",
  fields: {
    employee: "Karyawan",
    effectiveDate: "Tanggal Efektif",
    basicSalary: "Gaji Pokok",
    notes: "Catatan",
    status: "Status",
  },
  status: {
    draft: "Draft",
    active: "Aktif",
    inactive: "Tidak Aktif",
  },
  form: {
    createTitle: "Tambah Gaji Baru",
    editTitle: "Edit Gaji",
    cancel: "Batal",
    submit: "Simpan",
  },
  actions: {
    approve: "Approve",
  },
  toast: {
    created: "Gaji berhasil ditambahkan",
    updated: "Gaji berhasil diperbarui",
    deleted: "Gaji berhasil dihapus",
    approved: "Gaji berhasil disetujui",
    failed: "Operasi gagal",
  },
  placeholders: {
    select: "Pilih...",
  },
};

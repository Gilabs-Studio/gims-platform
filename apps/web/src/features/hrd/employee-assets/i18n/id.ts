export const employeeAssetsId = {
  employeeAssets: {
    title: "Aset Karyawan",
    description: "Kelola aset perusahaan yang dipinjam karyawan",
    
    // Actions
    addAsset: "Pinjam Aset",
    editAsset: "Edit Aset",
    returnAsset: "Kembalikan Aset",
    viewDetail: "Lihat Detail",
    delete: "Hapus Aset",
    
    // Filters
    searchPlaceholder: "Cari berdasarkan nama, kode, atau kategori aset...",
    filterByEmployee: "Filter Karyawan",
    filterByStatus: "Filter Status",
    allEmployees: "Semua Karyawan",
    allStatuses: "Semua Status",
    
    // Status
    status: {
      BORROWED: "Dipinjam",
      RETURNED: "Dikembalikan",
    },
    
    // Condition
    condition: {
      NEW: "Baru",
      GOOD: "Baik",
      FAIR: "Cukup",
      POOR: "Buruk",
      DAMAGED: "Rusak",
    },
    
    // Table columns
    columns: {
      assetCode: "Kode Aset",
      assetName: "Nama Aset",
      category: "Kategori",
      employee: "Karyawan",
      borrowDate: "Tanggal Pinjam",
      returnDate: "Tanggal Kembali",
      borrowCondition: "Kondisi Pinjam",
      returnCondition: "Kondisi Kembali",
      daysBorrowed: "Hari Dipinjam",
      status: "Status",
      actions: "Aksi",
    },
    
    // Form fields
    form: {
      employee: "Karyawan",
      employeePlaceholder: "Pilih karyawan",
      assetName: "Nama Aset",
      assetNamePlaceholder: "mis., MacBook Pro 14-inch",
      assetCode: "Kode Aset",
      assetCodePlaceholder: "mis., LAP-001",
      assetCategory: "Kategori Aset",
      assetCategoryPlaceholder: "mis., Laptop, Handphone, Kendaraan",
      borrowDate: "Tanggal Pinjam",
      borrowCondition: "Kondisi Pinjam",
      borrowConditionPlaceholder: "Pilih kondisi",
      returnDate: "Tanggal Kembali",
      returnCondition: "Kondisi Kembali",
      returnConditionPlaceholder: "Pilih kondisi pengembalian",
      notes: "Catatan",
      notesPlaceholder: "Catatan tambahan (opsional)",
      submit: "Simpan",
      cancel: "Batal",
      saving: "Menyimpan...",
    },
    
    // Detail modal
    detail: {
      title: "Detail Aset",
      assetInfo: "Informasi Aset",
      borrowInfo: "Informasi Peminjaman",
      returnInfo: "Informasi Pengembalian",
      notReturned: "Belum dikembalikan",
      daysBorrowedLabel: "Durasi dipinjam:",
      daysTotal: "{days} hari",
    },
    
    // Return modal
    returnModal: {
      title: "Kembalikan Aset",
      description: "Catat pengembalian aset ini",
      confirmReturn: "Konfirmasi Pengembalian",
      returning: "Mengembalikan...",
    },
    
    // Messages
    messages: {
      createSuccess: "Aset berhasil dipinjam",
      updateSuccess: "Aset berhasil diperbarui",
      returnSuccess: "Aset berhasil dikembalikan",
      deleteSuccess: "Aset berhasil dihapus",
      createError: "Gagal meminjam aset",
      updateError: "Gagal memperbarui aset",
      returnError: "Gagal mengembalikan aset",
      deleteError: "Gagal menghapus aset",
      confirmDelete: "Apakah Anda yakin ingin menghapus aset ini?",
      cannotUpdateReturned: "Tidak dapat memperbarui aset yang sudah dikembalikan",
      assetAlreadyReturned: "Aset ini sudah dikembalikan",
    },
    
    // Empty state
    empty: {
      title: "Tidak ada aset",
      description: "Tidak ada aset karyawan yang sesuai dengan filter Anda",
      action: "Pinjam aset pertama",
    },
    
    // Validation
    validation: {
      required: "Field ini wajib diisi",
      invalid_uuid: "Pilihan karyawan tidak valid",
      invalid_date: "Format tanggal tidak valid",
      invalid_condition: "Pilihan kondisi tidak valid",
      max_length: "Maksimal {max} karakter",
    },
  },
};

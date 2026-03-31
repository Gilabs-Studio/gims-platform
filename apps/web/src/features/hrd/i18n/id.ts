export const hrdId = {
  hrd: {
    // Common
    title: "SDM",
    description: "Sumber Daya Manusia",

    // Dashboard
    dashboard: {
      totalEmployees: "Total Karyawan",
      presentToday: "Hadir Hari Ini",
      pendingOvertime: "Lembur Pending",
      upcomingHolidays: "Libur Mendatang",
      modules: "Modul SDM",
      recentActivity: "Aktivitas Terbaru",
      noRecentActivity: "Tidak ada aktivitas terbaru",
      stats: {
        todayPresent: "Hadir Hari Ini",
        activeSchedules: "Jadwal Aktif",
        thisYear: "Tahun Ini",
        pendingApproval: "Menunggu Persetujuan",
        pendingRequests: "Permintaan Pending",
        totalActive: "Total Aktif",
      },
    },

    // Modules
    modules: {
      attendance: {
        title: "Absensi",
        description: "Pantau clock in/out dan catatan kehadiran harian",
      },
      workSchedules: {
        title: "Jadwal Kerja",
        description: "Kelola jadwal kerja dan pola shift",
      },
      holidays: {
        title: "Hari Libur",
        description: "Konfigurasi libur perusahaan dan cuti bersama",
      },
      overtime: {
        title: "Lembur",
        description: "Kelola permintaan dan persetujuan lembur",
      },
      leaves: {
        title: "Manajemen Cuti",
        description: "Kelola permintaan dan saldo cuti",
      },
      employees: {
        title: "Karyawan",
        description: "Kelola data dan profil karyawan",
      },
    },

    // Attendance
    attendance: {
      title: "Absensi",
      description: "Kelola catatan kehadiran karyawan",
      historyTitle: "Riwayat Absensi",
      historySubtitle: "Lihat kalender absensi dan permintaan cuti Anda",
      historyAction: "Riwayat Absensi",
      requestLeaveAction: "Ajukan Cuti",
      overtimeAction: "Lembur Saya",
      calendarTab: "Kalender",
      leaveTab: "Permintaan Cuti",
      overtimeTab: "Lembur",
      clockIn: "Masuk",
      clockOut: "Pulang",
      clockedIn: "Sudah Masuk",
      clockedOut: "Sudah Pulang",
      today: "Hari Ini",
      todayAttendance: "Absensi Hari Ini",
      notClockedIn: "Belum absen masuk",
      alreadyClockedOut: "Sudah absen pulang",
      holiday: "Hari Libur",
      offDay: "Hari Libur",
      myStats: "Statistik Kehadiran Saya",
      monthlyStats: "Statistik Bulanan",
      loading: "Memuat...",
      listView: "Tampilan Daftar",
      calendarView: "Tampilan Kalender",
      noRecords: "Tidak ada catatan kehadiran",
      noRecordsDesc:
        "Tidak ada catatan kehadiran yang sesuai dengan filter saat ini",
      calendar: {
        workDay: "Hari Kerja",
        nonWorkDay: "Bukan Hari Kerja",
      },

      // Status
      status: {
        // Lowercase variants
        present: "Hadir",
        absent: "Tidak Hadir",
        late: "Terlambat",
        early_leave: "Pulang Awal",
        half_day: "Setengah Hari",
        holiday: "Libur",
        leave: "Cuti",
        wfh: "Kerja dari Rumah",
        off_day: "Hari Libur",
        field_work: "Kerja Lapangan",
        pending: "Menunggu",
        approved: "Disetujui",
        rejected: "Ditolak",
        canceled: "Dibatalkan",
        // Uppercase variants
        PRESENT: "Hadir",
        ABSENT: "Tidak Hadir",
        LATE: "Terlambat",
        EARLY_LEAVE: "Pulang Awal",
        HALF_DAY: "Setengah Hari",
        HOLIDAY: "Libur",
        LEAVE: "Cuti",
        WFH: "Kerja dari Rumah",
        OFF_DAY: "Hari Libur",
        FIELD_WORK: "Kerja Lapangan",
        PENDING: "Menunggu",
        APPROVED: "Disetujui",
        REJECTED: "Ditolak",
        CANCELED: "Dibatalkan",
      },

      // Check-in type
      checkInType: {
        normal: "Kantor",
        wfh: "Kerja dari Rumah",
        field_work: "Kerja Lapangan",
        NORMAL: "Kantor",
        WFH: "Kerja dari Rumah",
        FIELD_WORK: "Kerja Lapangan",
      },

      // Fields
      fields: {
        date: "Tanggal",
        checkInTime: "Waktu Masuk",
        checkOutTime: "Waktu Pulang",
        checkIn: "Masuk",
        checkOut: "Pulang",
        checkInType: "Tipe Absen Masuk",
        status: "Status",
        lateMinutes: "Terlambat (menit)",
        schedule: "Jadwal",
        paidTime: "Waktu Dibayar",
        workingMinutes: "Waktu Kerja",
        workingHours: "Jam Kerja",
        overtimeMinutes: "Lembur",
        overtimeHours: "Jam Lembur",
        earlyLeaveMinutes: "Pulang Awal (menit)",
        note: "Catatan",
        notes: "Catatan",
        reason: "Alasan",
        employee: "Karyawan",
        employeeName: "Nama Karyawan",
        employeeCode: "Kode Karyawan",
        division: "Divisi",
        location: "Lokasi",
        address: "Alamat",
        isManualEntry: "Input Manual",
        manualEntryReason: "Alasan Input Manual",
        photo: "Foto",
        checkInPhoto: "Foto Absen Masuk",
      },

      // Form
      form: {
        employeeInfo: "Informasi Karyawan",
        attendanceDetails: "Detail Kehadiran",
        reasonAndNotes: "Alasan & Catatan",
        employee: "Karyawan",
        selectEmployee: "Pilih karyawan",
        date: "Tanggal",
        status: "Status",
        selectStatus: "Pilih status",
        checkInType: "Tipe Absen Masuk",
        selectCheckInType: "Pilih tipe absen masuk",
        checkInTime: "Waktu Masuk",
        checkInTimeDesc: "Waktu karyawan absen masuk",
        checkInTimeDisabled: "Tidak berlaku untuk status ini",
        checkOutTime: "Waktu Pulang",
        checkOutTimeDesc: "Waktu karyawan absen pulang",
        checkOutTimeDisabled: "Tidak berlaku untuk status ini",
        scheduleHint: "Berdasarkan jadwal: {name} ({startTime} - {endTime})",
        reason: "Alasan",
        reasonPlaceholder: "Jelaskan alasan input manual ini...",
        reasonDesc: "Opsional untuk input absensi manual",
        notes: "Catatan",
        notesPlaceholder: "Tambahkan catatan tambahan...",
        notesDesc: "Catatan opsional tentang rekaman ini",
        cancel: "Batal",
        submitting: "Mengirim...",
        update: "Perbarui Rekaman",
        create: "Buat Rekaman",
        holidayWarningTitle: "Tanggal Libur Dipilih",
        holidayWarningDesc:
          "Tanggal yang dipilih ({date}) adalah hari libur: {name}. Apakah Anda yakin ingin membuat catatan kehadiran pada tanggal ini?",
        holidayWarningDescWithType:
          "Tanggal yang dipilih ({date}) adalah hari libur: {name} ({type}). Apakah Anda yakin ingin membuat catatan kehadiran pada tanggal ini?",
      },

      // Actions
      actions: {
        create: "Tambah Absensi",
        edit: "Ubah Absensi",
        delete: "Hapus Absensi",
        manualEntry: "Input Manual",
        viewDetails: "Lihat Detail",
        search: "Cari karyawan...",
        filterByStatus: "Filter berdasarkan status",
        allStatuses: "Semua Status",
      },

      // Messages
      messages: {
        clockInSuccess: "Berhasil absen masuk",
        clockOutSuccess: "Berhasil absen pulang",
        createSuccess: "Catatan absensi berhasil dibuat",
        updateSuccess: "Catatan absensi berhasil diperbarui",
        deleteSuccess: "Catatan absensi berhasil dihapus",
        deleteConfirm: "Apakah Anda yakin ingin menghapus catatan absensi ini?",
        deleteConfirmDesc:
          "Tindakan ini tidak dapat dibatalkan. Catatan absensi akan dihapus secara permanen.",
        locationRequired: "Akses lokasi diperlukan untuk absen",
        outsideRadius: "Anda berada di luar radius lokasi yang diizinkan",
        alreadyClockedIn: "Anda sudah absen masuk hari ini",
        notClockedInYet: "Anda belum absen masuk",
        overtimeDetected:
          "Lembur terdeteksi: {duration}. Menunggu persetujuan.",
        viewOvertime: "Lihat",
        checkInAvailableAt: "Absen masuk tersedia pukul {time}",
      },

      // Errors
      errors: {
        fetchFailed: "Gagal memuat data absensi",
      },

      // Legend
      legend: {
        title: "Legenda",
      },

      // Accessibility
      aria: {
        previousMonth: "Bulan sebelumnya",
        nextMonth: "Bulan berikutnya",
      },

      // Detail modal
      detail: {
        title: "Detail Kehadiran",
        description: "Lihat informasi catatan kehadiran",
        employeeInfo: "Informasi Karyawan",
        checkInDetails: "Detail Masuk",
        checkOutDetails: "Detail Pulang",
        workingTime: "Waktu Kerja",
        notesAndInfo: "Catatan & Informasi",
        notRecorded: "Belum tercatat",
        checkInAddress: "Alamat Masuk",
        checkOutAddress: "Alamat Pulang",
        checkInNote: "Catatan Masuk",
        checkOutNote: "Catatan Pulang",
      },

      // Stats
      stats: {
        totalRecords: "Total Rekaman",
        totalRecordsDescription: "Total entri absensi untuk periode saat ini",
        totalWorkingDays: "Hari Kerja",
        presentDays: "Hadir",
        absentDays: "Tidak Hadir",
        lateDays: "Terlambat",
        leaveDays: "Cuti",
        halfDays: "Setengah Hari",
        totalWorkingHours: "Jam Kerja",
        totalWorkingHoursDescription:
          "Total jam kerja dari semua catatan absensi",
        totalOvertimeHours: "Jam Lembur",
        totalOvertimeDescription: "Total jam lembur dari semua catatan",
        totalLateMinutes: "Menit Terlambat",
        totalLateDescription: "Total menit terlambat dari semua catatan",
        attendanceRate: "Tingkat Kehadiran",
      },

      // Dialog alasan terlambat
      lateDialog: {
        title: "Absen Terlambat",
        description:
          "Anda terlambat {minutes} menit. Mohon berikan alasan keterlambatan Anda.",
        reasonLabel: "Alasan keterlambatan",
        reasonPlaceholder: "Jelaskan alasan keterlambatan Anda...",
        cancel: "Batal",
        confirm: "Absen Masuk",
      },

      // Dialog foto bukti kehadiran
      cameraDialog: {
        title: "Bukti Foto Diperlukan",
        description_WFH:
          "Silakan ambil foto selfie sebagai bukti kehadiran Kerja dari Rumah.",
        description_FIELD_WORK:
          "Silakan ambil foto selfie sebagai bukti kehadiran Kerja Lapangan.",
        capture: "Ambil Foto",
        retake: "Ulangi",
        confirm: "Gunakan Foto & Absen Masuk",
        cancel: "Batal",
        retry: "Coba Lagi",
        permissionDenied:
          "Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.",
        notAvailable: "Kamera tidak tersedia di perangkat ini.",
        uploading: "Mengunggah...",
        uploadFailed: "Gagal mengunggah foto. Silakan coba lagi.",
      },

      // Geolokasi / izin lokasi
      location: {
        permissionDenied: "Akses lokasi ditolak",
        enableInSettings:
          "Silakan aktifkan akses lokasi di pengaturan browser Anda untuk absen masuk/keluar.",
        permissionPrompt: "Akses lokasi diperlukan untuk absensi.",
        enable: "Aktifkan",
        denied: "Lokasi ditolak",
        atOffice: "Di kantor",
        notAtOffice: "Di luar kantor ({distance}m jauhnya)",
        requestPermission: "Aktifkan Akses Lokasi",
        openSettings: "Pengaturan Lokasi",
        deniedInstructions:
          "Akses lokasi diblokir. Untuk mengaktifkan: klik ikon gembok/tune di address bar → Setelan situs → Lokasi → Izinkan, lalu muat ulang halaman.",
        settingsDialog: {
          title: "Akses Lokasi Diblokir",
          description:
            "Akses lokasi telah ditolak oleh browser Anda. Ikuti langkah-langkah di bawah untuk mengaktifkannya, lalu muat ulang halaman.",
          stepsTitle: "Langkah untuk {browser}",
          addressBarHint:
            "Cari ikon gembok/tune di sisi kiri address bar — klik untuk mengakses izin situs dengan cepat.",
          retryPermission: "Coba Lagi Izin",
          reloadPage: "Muat Ulang",
          steps_chrome: {
            1: "Klik ikon gembok/tune (🔒) di sebelah kiri address bar",
            2: 'Temukan "Lokasi" di daftar izin dan atur ke "Izinkan"',
            3: 'Klik "Muat ulang" atau tekan tombol di bawah untuk menerapkan perubahan',
          },
          steps_edge: {
            1: "Klik ikon gembok (🔒) di sebelah kiri address bar",
            2: 'Temukan "Lokasi" dan ubah ke "Izinkan"',
            3: 'Klik "Muat ulang" atau tekan tombol di bawah untuk menerapkan perubahan',
          },
          steps_firefox: {
            1: "Klik ikon gembok (🔒) di sebelah kiri address bar",
            2: 'Klik "Hapus cookie dan data situs" atau buka "Izin" → "Akses Lokasi Anda" → hapus pemblokiran',
            3: "Muat ulang halaman menggunakan tombol di bawah",
          },
          steps_safari: {
            1: "Buka menu Safari → Pengaturan → Situs Web → Lokasi",
            2: 'Temukan situs web ini dan ubah izin ke "Izinkan"',
            3: "Tutup Pengaturan dan muat ulang halaman menggunakan tombol di bawah",
          },
          steps_other: {
            1: "Buka pengaturan situs atau izin browser Anda",
            2: 'Temukan izin "Lokasi" dan atur ke "Izinkan" untuk situs ini',
            3: "Muat ulang halaman menggunakan tombol di bawah",
          },
        },
      },
    },

    // Leave Request
    leaveRequest: {
      title: "Permintaan Cuti",
      description: "Kelola permintaan cuti Anda dan lihat riwayat cuti",
    },

    // Work Schedule
    workSchedule: {
      title: "Jadwal Kerja",
      description: "Kelola jadwal kerja untuk divisi",
      default: "Jadwal Default",
      setAsDefault: "Jadikan Default",

      fields: {
        name: "Nama",
        description: "Deskripsi",
        startTime: "Waktu Mulai",
        endTime: "Waktu Selesai",
        isFlexible: "Jam Fleksibel",
        flexibleStartTime: "Mulai Fleksibel",
        flexibleEndTime: "Selesai Fleksibel",
        breakStartTime: "Mulai Istirahat",
        breakEndTime: "Selesai Istirahat",
        breakDuration: "Durasi Istirahat (menit)",
        workingDays: "Hari Kerja",
        workingHoursPerDay: "Jam/Hari",
        lateTolerance: "Toleransi Terlambat (menit)",
        earlyLeaveTolerance: "Toleransi Pulang Awal (menit)",
        requireGPS: "Wajib GPS",
        gpsRadius: "Radius GPS (m)",
        officeLatitude: "Latitude Kantor",
        officeLongitude: "Longitude Kantor",
        division: "Divisi",
        officeLocation: "Lokasi Kantor",
        coordinates: "Koordinat",
        isActive: "Aktif",
        isDefault: "Default",
      },

      workingDaysOptions: {
        weekdays: "Senin - Jumat",
        weekdaysSaturday: "Senin - Sabtu",
        everyDay: "Setiap Hari",
      },

      sections: {
        workHours: "Jam Kerja",
        breakTime: "Waktu Istirahat",
        workingDays: "Hari Kerja",
        tolerance: "Toleransi",
        gpsSettings: "Pengaturan GPS",
        assignment: "Penugasan",
      },

      descriptions: {
        flexible:
          "Aktifkan jam kerja fleksibel dengan rentang waktu mulai dan selesai yang diizinkan",
        gps: "Wajibkan karyawan untuk absen masuk/keluar dalam radius GPS yang ditentukan dari kantor",
        division:
          "Tetapkan jadwal ini ke divisi tertentu, atau kosongkan untuk jadwal umum",
        officeLocation:
          "Pilih perusahaan untuk menggunakan koordinat GPS-nya untuk verifikasi kehadiran",
      },

      placeholders: {
        selectDivision: "Pilih divisi",
        allDivisions: "Semua Divisi (Umum)",
        selectCompany: "Pilih lokasi perusahaan",
        manualCoordinates: "Masukkan koordinat manual",
      },

      days: {
        mon: "Sen",
        tue: "Sel",
        wed: "Rab",
        thu: "Kam",
        fri: "Jum",
        sat: "Sab",
        sun: "Min",
        Mon: "Sen",
        Tue: "Sel",
        Wed: "Rab",
        Thu: "Kam",
        Fri: "Jum",
        Sat: "Sab",
        Sun: "Min",
      },

      actions: {
        create: "Tambah Jadwal Kerja",
        edit: "Ubah Jadwal Kerja",
        delete: "Hapus Jadwal Kerja",
      },

      messages: {
        createSuccess: "Jadwal kerja berhasil dibuat",
        updateSuccess: "Jadwal kerja berhasil diperbarui",
        deleteSuccess: "Jadwal kerja berhasil dihapus",
        setDefaultSuccess: "Jadwal kerja default berhasil diperbarui",
        deleteConfirm: "Apakah Anda yakin ingin menghapus jadwal kerja ini?",
        cannotDeleteDefault: "Tidak dapat menghapus jadwal kerja default",
      },
    },

    // Holiday
    holiday: {
      title: "Hari Libur",
      description: "Kelola hari libur nasional dan cuti bersama",
      calendar: "Kalender Libur",
      importCSV: "Impor dari CSV",
      addBatch: "Tambah Beberapa",

      types: {
        NATIONAL: "Libur Nasional",
        COLLECTIVE: "Cuti Bersama",
        COMPANY: "Libur Perusahaan",
      },

      fields: {
        date: "Tanggal",
        name: "Nama",
        description: "Deskripsi",
        type: "Jenis",
        year: "Tahun",
        isCollectiveLeave: "Cuti Bersama",
        cutsAnnualLeave: "Potong Cuti Tahunan",
        isActive: "Aktif",
      },

      actions: {
        create: "Tambah Hari Libur",
        edit: "Ubah Hari Libur",
        delete: "Hapus Hari Libur",
        import: "Impor",
        export: "Ekspor",
      },

      messages: {
        createSuccess: "Hari libur berhasil dibuat",
        updateSuccess: "Hari libur berhasil diperbarui",
        deleteSuccess: "Hari libur berhasil dihapus",
        importSuccess: "Hari libur berhasil diimpor: {count} entri",
        importPartial: "Impor selesai: {imported} diimpor, {skipped} dilewati",
        deleteConfirm: "Apakah Anda yakin ingin menghapus hari libur ini?",
      },
    },

    // Overtime
    overtime: {
      title: "Lembur",
      description: "Kelola permintaan dan persetujuan lembur",
      myRequests: "Permintaan Lembur Saya",
      pending: "Menunggu Persetujuan",
      summary: "Ringkasan Lembur",
      calendarView: "Kalender",
      listView: "Daftar",
      today: "Hari Ini",
      clear: "Bersihkan",
      noRecordsForDate: "Tidak ada permintaan lembur untuk tanggal ini",
      backToCalendar: "Kembali ke Kalender",
      records: "records",
      calendar: {
        hasOvertime: "Ada Lembur",
        noOvertime: "Tidak Ada Lembur",
        more: "lainnya",
      },

      types: {
        AUTO_DETECTED: "Terdeteksi Otomatis",
        MANUAL_CLAIM: "Klaim Manual",
        PRE_APPROVED: "Disetujui Sebelumnya",
      },

      status: {
        PENDING: "Menunggu",
        APPROVED: "Disetujui",
        REJECTED: "Ditolak",
        CANCELED: "Dibatalkan",
        HOLIDAY: "Libur",
        pending: "Menunggu",
        approved: "Disetujui",
        rejected: "Ditolak",
        canceled: "Dibatalkan",
      },

      fields: {
        date: "Tanggal",
        startTime: "Waktu Mulai",
        endTime: "Waktu Selesai",
        duration: "Durasi",
        planned: "Rencana",
        actual: "Aktual",
        requestedMinutes: "Diminta (menit)",
        approvedMinutes: "Disetujui (menit)",
        minutes: "menit",
        rateMultiplier: "Rate",
        reason: "Alasan",
        description: "Deskripsi",
        type: "Jenis",
        status: "Status",
        approvedBy: "Disetujui Oleh",
        approvedAt: "Disetujui Pada",
        rejectedBy: "Ditolak Oleh",
        rejectionReason: "Alasan Penolakan",
        rejectReason: "Alasan Penolakan",
        employee: "Karyawan",
        division: "Divisi",
        taskDetails: "Detail Tugas",
      },

      filters: {
        search: "Cari karyawan atau alasan...",
        status: "Status",
        allStatus: "Semua Status",
        month: "Bulan",
        year: "Tahun",
      },

      actions: {
        add: "Tambah Lembur",
        create: "Ajukan Lembur",
        edit: "Ubah Permintaan",
        cancel: "Batalkan Permintaan",
        approve: "Setujui",
        reject: "Tolak",
        viewDetails: "Lihat Detail",
        submit: "Ajukan",
      },

      detail: {
        title: "Detail Permintaan Lembur",
      },

      delete: {
        title: "Hapus Permintaan Lembur",
        description:
          "Apakah Anda yakin ingin menghapus permintaan lembur ini? Tindakan ini tidak dapat dibatalkan.",
      },

      empty: {
        noRecords: "Tidak ada permintaan lembur",
      },

      errors: {
        loadFailed: "Gagal memuat permintaan lembur",
        fetchFailed: "Gagal memuat data lembur",
      },

      form: {
        employeeInfo: "Informasi Karyawan",
        overtimeDetails: "Detail Lembur",
        reasonAndNotes: "Alasan & Catatan",
        selectEmployee: "Pilih karyawan",
        submit: "Ajukan Permintaan",
      },

      validation: {
        rejectionReasonRequired: "Harap berikan alasan penolakan",
      },

      messages: {
        createSuccess: "Permintaan lembur berhasil diajukan",
        updateSuccess: "Permintaan lembur berhasil diperbarui",
        deleteSuccess: "Permintaan lembur berhasil dihapus",
        cancelSuccess: "Permintaan lembur dibatalkan",
        approveSuccess: "Permintaan lembur disetujui",
        rejectSuccess: "Permintaan lembur ditolak",
        cancelConfirm:
          "Apakah Anda yakin ingin membatalkan permintaan lembur ini?",
        rejectConfirm: "Harap berikan alasan penolakan",
        autoDetectedInfo:
          "Lembur ini terdeteksi otomatis berdasarkan waktu pulang Anda",
        cancelError: "Gagal membatalkan permintaan lembur",
        fetchFailed: "Gagal memuat data lembur",
      },

      requestTypes: {
        autoDetected: "Terdeteksi Otomatis",
        manualClaim: "Klaim Manual",
        preApproved: "Disetujui Sebelumnya",
      },

      emptyState: {
        noOvertime: "Tidak ada permintaan lembur",
        autoDetectInfo:
          "Lembur akan terdeteksi otomatis saat Anda absen pulang melebihi jam kerja",
      },

      cancelDialog: {
        title: "Batalkan Permintaan Lembur",
        description:
          "Apakah Anda yakin ingin membatalkan permintaan lembur ini?",
      },

      approvedBy: "Disetujui oleh",

      stats: {
        totalRequested: "Total Diminta",
        totalApproved: "Total Disetujui",
        pendingCount: "Menunggu",
        approvedCount: "Disetujui",
        rejectedCount: "Ditolak",
        autoDetectedCount: "Terdeteksi Otomatis",
        manualClaimCount: "Klaim Manual",
      },
    },
  },
};

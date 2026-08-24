class AttendanceRecord {
  final String id;
  final DateTime date;
  final String checkInTime;
  final String checkOutTime;
  final String status; // "Tepat Waktu", "Terlambat", "Izin", "Cuti"
  final String locationName;
  final String notes;

  const AttendanceRecord({
    required this.id,
    required this.date,
    required this.checkInTime,
    required this.checkOutTime,
    required this.status,
    this.locationName = "Pabrik Utama - GiLabs",
    this.notes = "-",
  });
}

class LeaveRequest {
  final String id;
  final String type; // "Cuti Tahunan", "Izin Sakit", "Cuti Melahirkan"
  final DateTime startDate;
  final DateTime endDate;
  final String reason;
  final String status; // "PENDING", "APPROVED"

  const LeaveRequest({
    required this.id,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.status,
  });
}

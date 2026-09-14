import '../../domain/entities/attendance_entity.dart';

class MockHrisDatasource {
  Future<AttendanceRecord?> getTodayAttendance() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return AttendanceRecord(
      id: "ATT-TODAY",
      date: DateTime.now(),
      checkInTime: "07:54",
      checkOutTime: "--:--",
      status: "Tepat Waktu",
      locationName: "HQ Factory - Floor 2",
    );
  }

  Future<List<AttendanceRecord>> getAttendanceLogs() async {
    await Future.delayed(const Duration(milliseconds: 300));
    final now = DateTime.now();
    return [
      AttendanceRecord(
        id: "ATT-01",
        date: now.subtract(const Duration(days: 1)),
        checkInTime: "07:55",
        checkOutTime: "17:05",
        status: "Tepat Waktu",
      ),
      AttendanceRecord(
        id: "ATT-02",
        date: now.subtract(const Duration(days: 2)),
        checkInTime: "08:12",
        checkOutTime: "17:30",
        status: "Terlambat",
        notes: "Macet parah di Tol Cikampek",
      ),
      AttendanceRecord(
        id: "ATT-03",
        date: now.subtract(const Duration(days: 3)),
        checkInTime: "07:48",
        checkOutTime: "17:00",
        status: "Tepat Waktu",
      ),
      AttendanceRecord(
        id: "ATT-04",
        date: now.subtract(const Duration(days: 4)),
        checkInTime: "07:50",
        checkOutTime: "17:15",
        status: "Tepat Waktu",
      ),
      AttendanceRecord(
        id: "ATT-05",
        date: now.subtract(const Duration(days: 5)),
        checkInTime: "-",
        checkOutTime: "-",
        status: "Cuti",
        notes: "Cuti Tahunan - Urusan Keluarga",
      ),
    ];
  }

  Future<List<LeaveRequest>> getLeaveRequests() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return [
      LeaveRequest(
        id: "LEAVE-001",
        type: "Cuti Tahunan",
        startDate: DateTime.now().add(const Duration(days: 5)),
        endDate: DateTime.now().add(const Duration(days: 7)),
        reason: "Acara keluarga tahunan di Bandung",
        status: "PENDING",
      ),
      LeaveRequest(
        id: "LEAVE-002",
        type: "Izin Sakit",
        startDate: DateTime.now().subtract(const Duration(days: 14)),
        endDate: DateTime.now().subtract(const Duration(days: 14)),
        reason: "Demam & Flu berat dengan surat dokter",
        status: "APPROVED",
      ),
    ];
  }
}

import '../../domain/entities/attendance_entity.dart';
import '../../domain/repositories/hris_repository.dart';
import '../datasources/mock_hris_datasource.dart';
import '../../core/utils/date_formatter.dart';

class HrisRepositoryImpl implements HrisRepository {
  final MockHrisDatasource _datasource;

  HrisRepositoryImpl({MockHrisDatasource? datasource})
      : _datasource = datasource ?? MockHrisDatasource();

  AttendanceRecord? _currentTodayAttendance;
  final List<LeaveRequest> _localLeaves = [];

  @override
  Future<AttendanceRecord?> getTodayAttendance() async {
    if (_currentTodayAttendance != null) return _currentTodayAttendance;
    _currentTodayAttendance = await _datasource.getTodayAttendance();
    return _currentTodayAttendance;
  }

  @override
  Future<List<AttendanceRecord>> getAttendanceLogs() => _datasource.getAttendanceLogs();

  @override
  Future<List<LeaveRequest>> getLeaveRequests() async {
    final list = await _datasource.getLeaveRequests();
    return [..._localLeaves, ...list];
  }

  @override
  Future<AttendanceRecord> performClockIn(String notes) async {
    await Future.delayed(const Duration(milliseconds: 300));
    final now = DateTime.now();
    _currentTodayAttendance = AttendanceRecord(
      id: "ATT-${now.millisecondsSinceEpoch}",
      date: now,
      checkInTime: DateFormatter.formatTime(now),
      checkOutTime: "--:--",
      status: now.hour > 8 || (now.hour == 8 && now.minute > 15) ? "Terlambat" : "Tepat Waktu",
      notes: notes.isNotEmpty ? notes : "Presensi Masuk via SuperApp Mobile",
    );
    return _currentTodayAttendance!;
  }

  @override
  Future<AttendanceRecord> performClockOut() async {
    await Future.delayed(const Duration(milliseconds: 300));
    final now = DateTime.now();
    if (_currentTodayAttendance != null) {
      _currentTodayAttendance = AttendanceRecord(
        id: _currentTodayAttendance!.id,
        date: _currentTodayAttendance!.date,
        checkInTime: _currentTodayAttendance!.checkInTime,
        checkOutTime: DateFormatter.formatTime(now),
        status: _currentTodayAttendance!.status,
        notes: _currentTodayAttendance!.notes,
      );
    }
    return _currentTodayAttendance!;
  }

  @override
  Future<void> submitLeaveRequest(LeaveRequest request) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _localLeaves.insert(0, request);
  }
}

import '../entities/attendance_entity.dart';

abstract class HrisRepository {
  Future<AttendanceRecord?> getTodayAttendance();
  Future<List<AttendanceRecord>> getAttendanceLogs();
  Future<List<LeaveRequest>> getLeaveRequests();
  Future<AttendanceRecord> performClockIn(String notes);
  Future<AttendanceRecord> performClockOut();
  Future<void> submitLeaveRequest(LeaveRequest request);
}

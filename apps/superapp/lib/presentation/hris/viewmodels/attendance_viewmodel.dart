import 'package:flutter/material.dart';
import '../../../domain/entities/attendance_entity.dart';
import '../../../domain/repositories/hris_repository.dart';

class AttendanceViewModel extends ChangeNotifier {
  final HrisRepository _repository;

  AttendanceViewModel(this._repository);

  AttendanceRecord? _todayAttendance;
  List<AttendanceRecord> _logs = [];
  List<LeaveRequest> _leaves = [];
  bool _isLoading = false;

  AttendanceRecord? get todayAttendance => _todayAttendance;
  List<AttendanceRecord> get logs => _logs;
  List<LeaveRequest> get leaves => _leaves;
  bool get isLoading => _isLoading;

  bool get isClockedIn =>
      _todayAttendance != null && _todayAttendance!.checkOutTime == "--:--";

  Future<void> loadAttendanceData() async {
    _isLoading = true;
    notifyListeners();

    try {
      _todayAttendance = await _repository.getTodayAttendance();
      _logs = await _repository.getAttendanceLogs();
      _leaves = await _repository.getLeaveRequests();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> clockIn(String notes) async {
    _todayAttendance = await _repository.performClockIn(notes);
    await loadAttendanceData();
  }

  Future<void> clockOut() async {
    _todayAttendance = await _repository.performClockOut();
    await loadAttendanceData();
  }

  Future<void> submitLeave(String type, DateTime start, DateTime end, String reason) async {
    final request = LeaveRequest(
      id: "LEAVE-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
      type: type,
      startDate: start,
      endDate: end,
      reason: reason,
      status: "PENDING",
    );
    await _repository.submitLeaveRequest(request);
    await loadAttendanceData();
  }
}

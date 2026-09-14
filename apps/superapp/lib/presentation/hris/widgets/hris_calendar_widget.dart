import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../domain/entities/attendance_entity.dart';

class HrisCalendarWidget extends StatefulWidget {
  final List<AttendanceRecord> attendanceLogs;
  final List<LeaveRequest> leaveRequests;
  final Function(DateTime selectedDate)? onDateSelected;

  const HrisCalendarWidget({
    super.key,
    required this.attendanceLogs,
    required this.leaveRequests,
    this.onDateSelected,
  });

  @override
  State<HrisCalendarWidget> createState() => _HrisCalendarWidgetState();
}

class _HrisCalendarWidgetState extends State<HrisCalendarWidget> {
  late DateTime _displayedMonth;
  late DateTime _selectedDate;

  @override
  void initState() {
    super.initState();
    _displayedMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
    _selectedDate = DateTime.now();
  }

  void _previousMonth() {
    setState(() {
      _displayedMonth = DateTime(_displayedMonth.year, _displayedMonth.month - 1, 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _displayedMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1, 1);
    });
  }

  AttendanceRecord? _getLogForDate(DateTime date) {
    for (var log in widget.attendanceLogs) {
      if (log.date.year == date.year &&
          log.date.month == date.month &&
          log.date.day == date.day) {
        return log;
      }
    }
    return null;
  }

  LeaveRequest? _getLeaveForDate(DateTime date) {
    for (var leave in widget.leaveRequests) {
      if (date.isAfter(leave.startDate.subtract(const Duration(days: 1))) &&
          date.isBefore(leave.endDate.add(const Duration(days: 1)))) {
        return leave;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final monthName = DateFormatter.formatMonthYear(_displayedMonth);
    final daysInMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1, 0).day;
    final firstWeekday = DateTime(_displayedMonth.year, _displayedMonth.month, 1).weekday; // 1 = Mon, 7 = Sun

    final selectedLog = _getLogForDate(_selectedDate);
    final selectedLeave = _getLeaveForDate(_selectedDate);

    return CustomCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Navigation
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Visualisasi Kalender HRIS", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 2),
                  Text(
                    monthName,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    onPressed: _previousMonth,
                    icon: const Icon(Icons.chevron_left_rounded, color: AppColors.textPrimary),
                    visualDensity: VisualDensity.compact,
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _displayedMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
                        _selectedDate = DateTime.now();
                      });
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text("Hari Ini", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                  IconButton(
                    onPressed: _nextMonth,
                    icon: const Icon(Icons.chevron_right_rounded, color: AppColors.textPrimary),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Days of Week Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: const ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) {
              return Expanded(
                child: Center(
                  child: Text(
                    day,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: (day == "Sab" || day == "Min") ? AppColors.textMuted : AppColors.textSecondary,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 10),

          // Days Grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 42, // 6 weeks grid
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
            ),
            itemBuilder: (context, index) {
              final dayOffset = index - (firstWeekday - 1);
              if (dayOffset < 0 || dayOffset >= daysInMonth) {
                return const SizedBox();
              }

              final dayNumber = dayOffset + 1;
              final cellDate = DateTime(_displayedMonth.year, _displayedMonth.month, dayNumber);
              final isToday = cellDate.year == DateTime.now().year &&
                  cellDate.month == DateTime.now().month &&
                  cellDate.day == DateTime.now().day;
              final isSelected = cellDate.year == _selectedDate.year &&
                  cellDate.month == _selectedDate.month &&
                  cellDate.day == _selectedDate.day;

              final log = _getLogForDate(cellDate);
              final leave = _getLeaveForDate(cellDate);

              Color dotColor = Colors.transparent;
              if (leave != null) {
                dotColor = AppColors.info;
              } else if (log != null) {
                dotColor = log.status == "Tepat Waktu"
                    ? AppColors.success
                    : (log.status == "Terlambat" ? AppColors.warning : AppColors.danger);
              }

              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedDate = cellDate;
                  });
                  if (widget.onDateSelected != null) {
                    widget.onDateSelected!(cellDate);
                  }
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : (isToday ? AppColors.primarySoft : Colors.transparent),
                    borderRadius: BorderRadius.circular(12),
                    border: isToday && !isSelected
                        ? Border.all(color: AppColors.primary, width: 1.5)
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "$dayNumber",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected
                              ? Colors.white
                              : ((cellDate.weekday == 6 || cellDate.weekday == 7)
                                  ? AppColors.textMuted
                                  : AppColors.textPrimary),
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (dotColor != Colors.transparent)
                        Container(
                          width: 5,
                          height: 5,
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.white : dotColor,
                            shape: BoxShape.circle,
                          ),
                        )
                      else
                        const SizedBox(height: 5),
                    ],
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 12),

          // Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildLegendItem(AppColors.success, "Masuk"),
              _buildLegendItem(AppColors.warning, "Terlambat"),
              _buildLegendItem(AppColors.info, "Cuti/Izin"),
              _buildLegendItem(AppColors.danger, "Alpha"),
            ],
          ),

          const SizedBox(height: 16),

          // Selected Date Details Box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.event_note_rounded, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormatter.formatFullDate(_selectedDate),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      if (selectedLeave != null) ...[
                        Text(
                          "Status: ${selectedLeave.type} (${selectedLeave.status})",
                          style: const TextStyle(color: AppColors.info, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ] else if (selectedLog != null) ...[
                        Text(
                          "Masuk: ${selectedLog.checkInTime} • Pulang: ${selectedLog.checkOutTime}",
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        ),
                      ] else ...[
                        const Text(
                          "Tidak Ada Catatan Presensi Khusus",
                          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ),
                if (selectedLog != null)
                  StatusBadge(
                    label: selectedLog.status,
                    type: selectedLog.status == "Tepat Waktu"
                        ? BadgeType.success
                        : (selectedLog.status == "Terlambat" ? BadgeType.warning : BadgeType.danger),
                  )
                else if (selectedLeave != null)
                  StatusBadge(
                    label: selectedLeave.type,
                    type: BadgeType.info,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}

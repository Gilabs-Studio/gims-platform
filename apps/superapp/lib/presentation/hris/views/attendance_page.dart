import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../viewmodels/attendance_viewmodel.dart';
import '../widgets/hris_calendar_widget.dart';

class AttendancePage extends StatefulWidget {
  final bool isOversightMode;

  const AttendancePage({super.key, this.isOversightMode = false});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AttendanceViewModel>().loadAttendanceData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AttendanceViewModel>(
      builder: (context, vm, child) {
        if (vm.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final today = vm.todayAttendance;
        final isClockedIn = vm.isClockedIn;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            title: Text(
              widget.isOversightMode ? "HRIS Presensi & Absensi (Oversight)" : "HRIS Presensi",
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Live Clock-in / Clock-out Interactive Card
                CustomCard(
                  gradient: AppColors.primaryGradient,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                DateFormatter.formatFullDate(DateTime.now()),
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                "Jadwal Shift: 08:00 - 17:00",
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          StatusBadge(
                            label: isClockedIn ? "PRESENSI MASUK" : "BELUM ABSEN",
                            type: isClockedIn ? BadgeType.success : BadgeType.warning,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Large Time Display
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              const Text("Jam Masuk", style: TextStyle(color: Colors.white70, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text(
                                today?.checkInTime ?? "--:--",
                                style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          Container(width: 1, height: 40, color: Colors.white24),
                          Column(
                            children: [
                              const Text("Jam Keluar", style: TextStyle(color: Colors.white70, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text(
                                today?.checkOutTime ?? "--:--",
                                style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Clock In/Out Button
                      ElevatedButton(
                        onPressed: () {
                          if (!isClockedIn) {
                            vm.clockIn("Presensi Masuk Prototype");
                          } else {
                            vm.clockOut();
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          backgroundColor: isClockedIn ? AppColors.danger : AppColors.success,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(isClockedIn ? Icons.logout_rounded : Icons.login_rounded, color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              isClockedIn ? "Absen Pulang (Clock Out)" : "Absen Masuk (Clock In)",
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Interactive Real-time Calendar
                HrisCalendarWidget(
                  attendanceLogs: vm.logs,
                  leaveRequests: vm.leaves,
                ),
                const SizedBox(height: 24),

                // Quick Action: Pengajuan Izin / Cuti
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Pengajuan Cuti / Izin Sakit",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    TextButton.icon(
                      onPressed: () => _showLeaveModal(context),
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text("Ajukan Cuti"),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                ...vm.leaves.map((l) => Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: CustomCard(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.infoBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.calendar_month_rounded, color: AppColors.info, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l.type, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              Text(
                                "${DateFormatter.formatShortDate(l.startDate)} - ${DateFormatter.formatShortDate(l.endDate)}",
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(
                          label: l.status,
                          type: l.status == "APPROVED" ? BadgeType.success : BadgeType.warning,
                        ),
                      ],
                    ),
                  ),
                )),
                const SizedBox(height: 24),

                // Attendance Logs
                const Text(
                  "Riwayat Absensi 30 Hari Terakhir",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                ...vm.logs.map((log) => Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: CustomCard(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormatter.formatShortDate(log.date),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "Masuk: ${log.checkInTime} • Pulang: ${log.checkOutTime}",
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                            ),
                          ],
                        ),
                        StatusBadge(
                          label: log.status,
                          type: log.status == "Tepat Waktu"
                              ? BadgeType.success
                              : (log.status == "Terlambat" ? BadgeType.danger : BadgeType.info),
                        ),
                      ],
                    ),
                  ),
                )),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showLeaveModal(BuildContext context) {
    final reasonCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Form Pengajuan Cuti / Izin Sakit", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: "Cuti Tahunan",
                items: const [
                  DropdownMenuItem(value: "Cuti Tahunan", child: Text("Cuti Tahunan")),
                  DropdownMenuItem(value: "Izin Sakit", child: Text("Izin Sakit")),
                ],
                onChanged: (val) {},
                decoration: const InputDecoration(labelText: "Jenis Pengajuan", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                decoration: const InputDecoration(labelText: "Alasan Cuti / Keterangan", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  context.read<AttendanceViewModel>().submitLeave(
                    "Cuti Tahunan",
                    DateTime.now().add(const Duration(days: 3)),
                    DateTime.now().add(const Duration(days: 5)),
                    reasonCtrl.text,
                  );
                  Navigator.pop(ctx);
                },
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: AppColors.primary),
                child: const Text("Kirim Pengajuan Cuti", style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }
}

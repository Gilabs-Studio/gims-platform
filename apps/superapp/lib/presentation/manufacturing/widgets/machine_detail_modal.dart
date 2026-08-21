import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../domain/entities/manufacturing_entity.dart';
import '../../ticketing/views/ticketing_page.dart';
import 'oee_donut_chart.dart';

class MachineDetailModal extends StatelessWidget {
  final MachineItem machine;

  const MachineDetailModal({
    super.key,
    required this.machine,
  });

  static void show(BuildContext context, MachineItem machine) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => MachineDetailModal(machine: machine),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isRun = machine.status == MachineStatus.running;
    final isDown = machine.status == MachineStatus.downtime;
    final isMaint = machine.status == MachineStatus.maintenance;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primarySoft,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              machine.lineName,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: isRun ? "RUNNING" : (isDown ? "DOWN" : (isMaint ? "SERVIS" : "IDLE")),
                            type: isRun ? BadgeType.success : (isDown ? BadgeType.danger : BadgeType.warning),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        machine.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        "ID Mesin: ${machine.id} • Servis Terakhir: ${machine.lastMaintenance}",
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Detail Body
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // OEE & Core Telemetry Overview Card
                  CustomCard(
                    padding: const EdgeInsets.all(16),
                    backgroundColor: AppColors.background,
                    child: Row(
                      children: [
                        OeeDonutChart(
                          availability: isRun ? 70 : 18,
                          performance: isRun ? 20 : 32,
                          quality: isRun ? 10 : 50,
                          size: 80,
                          strokeWidth: 10,
                          centerText: "${machine.oeeScore.toStringAsFixed(0)}%",
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "SKOR OEE KESELURUHAN",
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                              ),
                              Text(
                                "${machine.oeeScore.toStringAsFixed(1)}%",
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: machine.oeeScore >= 75.0 ? AppColors.success : AppColors.danger,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  _buildMiniDot(const Color(0xFF3B82F6), isRun ? "Avail 70%" : "Avail 18%"),
                                  const SizedBox(width: 8),
                                  _buildMiniDot(const Color(0xFFF59E0B), isRun ? "Perf 20%" : "Perf 32%"),
                                  const SizedBox(width: 8),
                                  _buildMiniDot(const Color(0xFF10B981), isRun ? "Qual 10%" : "Qual 50%"),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Realtime Sensor Metrics Grid
                  const Text(
                    "Sensor & Telemetri Real-Time",
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricBox(
                          icon: Icons.thermostat_rounded,
                          iconColor: machine.temperature > 85 ? AppColors.danger : AppColors.primary,
                          label: "Suhu Mesin",
                          value: "${machine.temperature.toStringAsFixed(1)}°C",
                          statusText: machine.temperature > 85 ? "PERINGATAN OVERHEAT" : "Normal Target < 80°C",
                          isAlert: machine.temperature > 85,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildMetricBox(
                          icon: Icons.vibration_rounded,
                          iconColor: machine.vibrationLevel > 3.5 ? AppColors.danger : AppColors.success,
                          label: "Vibrasi Spindle",
                          value: "${machine.vibrationLevel} mm/s",
                          statusText: machine.vibrationLevel > 3.5 ? "Getaran Tinggi" : "Batas Toleransi Safe",
                          isAlert: machine.vibrationLevel > 3.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricBox(
                          icon: Icons.speed_rounded,
                          iconColor: AppColors.info,
                          label: "Speed Output",
                          value: isRun ? "248 P/h" : "14 P/h",
                          statusText: "Target: 250 Parts/Jam",
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildMetricBox(
                          icon: Icons.timer_outlined,
                          iconColor: AppColors.primary,
                          label: "Cycle Time",
                          value: isRun ? "2.51 Min" : "6.21 Min",
                          statusText: "Standard: 2.45 Min",
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // 24h Graphic Timeline & History Log Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text(
                        "Visualisasi Waktu & Histori Downtime",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      Text(
                        "24 Jam Terakhir",
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  MachineGraphicTimeline(
                    logs: machine.downtimeLogs,
                    currentStatus: machine.status,
                    compactMode: false,
                  ),
                  const SizedBox(height: 16),

                  // Chronological Timeline Event List
                  if (machine.downtimeLogs.isNotEmpty) ...[
                    const Text(
                      "Catatan Kejadian Operasional",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 8),

                    ...machine.downtimeLogs.map((log) {
                      Color statusColor;
                      IconData statusIcon;
                      String statusTitle;

                      switch (log.status) {
                        case MachineStatus.running:
                          statusColor = AppColors.success;
                          statusIcon = Icons.play_circle_fill_rounded;
                          statusTitle = "Running (Normal)";
                          break;
                        case MachineStatus.downtime:
                          statusColor = AppColors.danger;
                          statusIcon = Icons.error_rounded;
                          statusTitle = "Downtime / Stop";
                          break;
                        case MachineStatus.maintenance:
                          statusColor = AppColors.warning;
                          statusIcon = Icons.build_circle_rounded;
                          statusTitle = "Servis / Maintenance";
                          break;
                        case MachineStatus.idle:
                          statusColor = Colors.grey;
                          statusIcon = Icons.pause_circle_filled_rounded;
                          statusTitle = "Idle / Menunggu";
                          break;
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: statusColor.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            Icon(statusIcon, color: statusColor, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        "${log.startTime} - ${log.endTime} (${log.durationMinutes}m)",
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: statusColor,
                                        ),
                                      ),
                                      Text(
                                        statusTitle,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: statusColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    log.reason,
                                    style: const TextStyle(fontSize: 11, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
          ),

          // Bottom Action Footer
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const TicketingPage()),
                      );
                    },
                    icon: const Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.danger),
                    label: const Text("Lapor Ticket Modul", style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 13)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: const BorderSide(color: AppColors.danger),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Tutup Detail", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricBox({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required String statusText,
    bool isAlert = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isAlert ? AppColors.dangerBg : AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isAlert ? AppColors.danger.withValues(alpha: 0.3) : AppColors.cardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 16),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isAlert ? AppColors.danger : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            statusText,
            style: TextStyle(
              fontSize: 9,
              color: isAlert ? AppColors.danger : AppColors.textMuted,
              fontWeight: isAlert ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniDot(Color color, String text) {
    return Row(
      children: [
        Container(width: 5, height: 5, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 9)),
      ],
    );
  }
}

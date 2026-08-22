import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../domain/entities/manufacturing_entity.dart';

/// OEE Breakdown Donut Chart (Availability, Performance, Quality)
class OeeDonutChart extends StatelessWidget {
  final double availability; // e.g. 60.0 (%)
  final double performance;  // e.g. 28.0 (%)
  final double quality;      // e.g. 12.0 (%)
  final double size;
  final double strokeWidth;
  final String? centerText;

  const OeeDonutChart({
    super.key,
    required this.availability,
    required this.performance,
    required this.quality,
    this.size = 90,
    this.strokeWidth = 12,
    this.centerText,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _OeeDonutPainter(
          availability: availability,
          performance: performance,
          quality: quality,
          strokeWidth: strokeWidth,
        ),
        child: centerText != null
            ? Center(
                child: Text(
                  centerText!,
                  style: TextStyle(
                    fontSize: size * 0.22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              )
            : null,
      ),
    );
  }
}

class _OeeDonutPainter extends CustomPainter {
  final double availability;
  final double performance;
  final double quality;
  final double strokeWidth;

  _OeeDonutPainter({
    required this.availability,
    required this.performance,
    required this.quality,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (math.min(size.width, size.height) - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final total = (availability + performance + quality).clamp(1.0, 100.0);
    final availSweep = (availability / total) * 2 * math.pi;
    final perfSweep = (performance / total) * 2 * math.pi;
    final qualSweep = (quality / total) * 2 * math.pi;

    // Background track
    final bgPaint = Paint()
      ..color = AppColors.cardBorder
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawCircle(center, radius, bgPaint);

    double startAngle = -math.pi / 2;

    // 1. Availability Arc (Blue/Cyan)
    final availPaint = Paint()
      ..color = const Color(0xFF3B82F6) // Bright Blue
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, startAngle, availSweep - 0.05, false, availPaint);
    startAngle += availSweep;

    // 2. Performance Arc (Orange/Amber)
    final perfPaint = Paint()
      ..color = const Color(0xFFF59E0B) // Amber
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, startAngle, perfSweep - 0.05, false, perfPaint);
    startAngle += perfSweep;

    // 3. Quality Arc (Green/Emerald)
    final qualPaint = Paint()
      ..color = const Color(0xFF10B981) // Emerald Green
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, startAngle, qualSweep - 0.05, false, qualPaint);
  }

  @override
  bool shouldRepaint(covariant _OeeDonutPainter oldDelegate) {
    return oldDelegate.availability != availability ||
        oldDelegate.performance != performance ||
        oldDelegate.quality != quality;
  }
}

/// Enhanced Graphic Timeline Widget showing Machine Uptime & Downtime intervals
class MachineGraphicTimeline extends StatelessWidget {
  final List<DowntimeLogEvent> logs;
  final MachineStatus currentStatus;
  final bool compactMode;

  const MachineGraphicTimeline({
    super.key,
    required this.logs,
    required this.currentStatus,
    this.compactMode = false,
  });

  @override
  Widget build(BuildContext context) {
    // Find key downtime / maintenance event if any
    final downLog = logs.cast<DowntimeLogEvent?>().firstWhere(
          (l) => l?.status == MachineStatus.downtime,
          orElse: () => null,
        );
    final maintLog = logs.cast<DowntimeLogEvent?>().firstWhere(
          (l) => l?.status == MachineStatus.maintenance,
          orElse: () => null,
        );

    final highlightLog = downLog ?? maintLog;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Flexible(
              child: Text(
                "Timeline Status 24h",
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 4),
            if (highlightLog != null)
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: highlightLog.status == MachineStatus.downtime
                        ? AppColors.dangerBg
                        : AppColors.warningBg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    "${highlightLog.status == MachineStatus.downtime ? '🔴 Down' : '🟡 Servis'}: ${highlightLog.startTime}-${highlightLog.endTime}",
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: highlightLog.status == MachineStatus.downtime
                          ? AppColors.danger
                          : AppColors.warning,
                    ),
                  ),
                ),
              )
            else
              const Flexible(
                child: Text(
                  "🟢 Uptime 100%",
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: AppColors.success,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        // Timeline Bar
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Container(
            height: compactMode ? 8 : 10,
            color: Colors.grey[200],
            child: Row(
              children: logs.isNotEmpty
                  ? logs.map((log) {
                      Color color;
                      switch (log.status) {
                        case MachineStatus.running:
                          color = const Color(0xFF10B981);
                          break;
                        case MachineStatus.downtime:
                          color = const Color(0xFFEF4444);
                          break;
                        case MachineStatus.maintenance:
                          color = const Color(0xFFF59E0B);
                          break;
                        case MachineStatus.idle:
                          color = const Color(0xFF9CA3AF);
                          break;
                      }
                      return Expanded(
                        flex: log.durationMinutes,
                        child: Tooltip(
                          message: "${log.startTime} - ${log.endTime}: ${log.reason}",
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 0.5),
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                        ),
                      );
                    }).toList()
                  : [
                      Expanded(
                        child: Container(
                          color: currentStatus == MachineStatus.running
                              ? const Color(0xFF10B981)
                              : const Color(0xFFEF4444),
                        ),
                      )
                    ],
            ),
          ),
        ),
        if (!compactMode) ...[
          const SizedBox(height: 3),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text("06:00", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
              Text("08:00", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
              Text("10:00", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
              Text("12:00", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
              Text("14:00", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
              Text("16:00", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
            ],
          ),
        ],
      ],
    );
  }
}

/// 24h Downtime Timeline Bar Widget (Image 1 Style)
class DowntimeTimelineBar extends StatelessWidget {
  final List<DowntimeSegment> segments;

  const DowntimeTimelineBar({
    super.key,
    required this.segments,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Flexible(
              child: Text(
                "Downtime (Last 24h)",
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(width: 4),
            Text("24 hrs", style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: Container(
            height: 10,
            color: Colors.grey[200],
            child: Row(
              children: segments.map((seg) {
                return Expanded(
                  flex: seg.flex,
                  child: Container(
                    color: seg.color,
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(height: 3),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text("12.00pm", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
            Text("2.00pm", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
            Text("4.00pm", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
            Text("6.00pm", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
            Text("8.00pm", style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
          ],
        ),
      ],
    );
  }
}

class DowntimeSegment {
  final int flex;
  final Color color;

  const DowntimeSegment(this.flex, this.color);

  static const Color running = Color(0xFF10B981);     // Green
  static const Color down = Color(0xFFEF4444);        // Red
  static const Color maintenance = Color(0xFFF59E0B); // Amber
  static const Color idle = Color(0xFF9CA3AF);        // Grey
}

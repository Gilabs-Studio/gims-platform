import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../viewmodels/manufacturing_viewmodel.dart';
import '../../../domain/entities/manufacturing_entity.dart';
import '../widgets/oee_donut_chart.dart';
import '../widgets/machine_detail_modal.dart';

class ManufacturingDashboardPage extends StatefulWidget {
  const ManufacturingDashboardPage({super.key});

  @override
  State<ManufacturingDashboardPage> createState() => _ManufacturingDashboardPageState();
}

class _ManufacturingDashboardPageState extends State<ManufacturingDashboardPage> {
  String _selectedFilter = "Shift";
  bool _outOfToleranceOnly = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<ManufacturingViewModel>(
      builder: (context, vm, child) {
        if (vm.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final machines = _outOfToleranceOnly
            ? vm.machines.where((m) => m.status == MachineStatus.downtime || m.oeeScore < 50.0).toList()
            : vm.machines;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            automaticallyImplyLeading: false,
            leading: Navigator.canPop(context)
                ? IconButton(
                    icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                    onPressed: () => Navigator.pop(context),
                  )
                : null,
            title: const Text(
              "Manufaktur",
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          body: Stack(
            children: [
              SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Shift / Day Filter Pills (Image 1 Style)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ...["Shift", "Day", "Product run"].map((f) {
                            final isSel = _selectedFilter == f;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(f),
                                selected: isSel,
                                onSelected: (_) => setState(() => _selectedFilter = f),
                                selectedColor: AppColors.primary,
                                backgroundColor: AppColors.surface,
                                checkmarkColor: Colors.white,
                                labelStyle: TextStyle(
                                  color: isSel ? Colors.white : AppColors.textPrimary,
                                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                                  fontSize: 12,
                                ),
                              ),
                            );
                          }),
                          const SizedBox(width: 8),
                          FilterChip(
                            label: const Text("Out of tolerance first"),
                            selected: _outOfToleranceOnly,
                            onSelected: (val) => setState(() => _outOfToleranceOnly = val),
                            selectedColor: AppColors.dangerBg,
                            checkmarkColor: AppColors.danger,
                            labelStyle: TextStyle(
                              color: _outOfToleranceOnly ? AppColors.danger : AppColors.textPrimary,
                              fontWeight: _outOfToleranceOnly ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Plant Overall OEE Card Header (Light Surface Theme)
                    CustomCard(
                      backgroundColor: AppColors.surface,
                      padding: const EdgeInsets.all(18),
                      child: Row(
                        children: [
                          OeeDonutChart(
                            availability: 60,
                            performance: 28,
                            quality: 12,
                            size: 90,
                            strokeWidth: 12,
                            centerText: "${vm.averageOee.toStringAsFixed(0)}%",
                          ),
                          const SizedBox(width: 18),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text("TOTAL OEE PABRIK", style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
                                    StatusBadge(
                                      label: "TARGET: 85%",
                                      type: BadgeType.success,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  "${vm.averageOee.toStringAsFixed(1)}%",
                                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 24, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    _buildOeeLegendDot(const Color(0xFF3B82F6), "Avail 92%"),
                                    const SizedBox(width: 8),
                                    _buildOeeLegendDot(const Color(0xFFF59E0B), "Perf 95%"),
                                    const SizedBox(width: 8),
                                    _buildOeeLegendDot(const Color(0xFF10B981), "Qual 98%"),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Line & Mold Mesin (${machines.length})",
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Text(
                          "${vm.runningCount} Running • ${vm.downtimeCount} Down",
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // OEE Machine Cards Grid (Directly inspired by Reference Image 1)
                    ...machines.map((mch) {
                      final isRun = mch.status == MachineStatus.running;
                      final isDown = mch.status == MachineStatus.downtime;
                      final isHighOee = mch.oeeScore >= 75.0;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: InkWell(
                          onTap: () => MachineDetailModal.show(context, mch),
                          borderRadius: BorderRadius.circular(16),
                          child: CustomCard(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Header Machine Title & Status Chip
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        "${mch.name} - ${mch.lineName}",
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                                      ),
                                    ),
                                    StatusBadge(
                                      label: isRun ? "RUNNING" : (isDown ? "DOWN" : "IDLE"),
                                      type: isRun ? BadgeType.success : (isDown ? BadgeType.danger : BadgeType.warning),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),

                                // 4 Key OEE Metrics Row (Image 1 Style)
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    _buildKeyMetricTile(
                                      "OEE",
                                      "${mch.oeeScore.toStringAsFixed(0)}%",
                                      isHighOee ? AppColors.success : AppColors.danger,
                                    ),
                                    _buildKeyMetricTile(
                                      "Parts/Hour",
                                      isRun ? (mch.oeeScore * 3.2).toStringAsFixed(0) : "14",
                                      isRun ? AppColors.success : AppColors.danger,
                                    ),
                                    _buildKeyMetricTile(
                                      "Cavitation",
                                      isRun ? "11/12" : "2/12",
                                      AppColors.textPrimary,
                                    ),
                                    _buildKeyMetricTile(
                                      "Rejects",
                                      isRun ? "14" : "72",
                                      isRun ? AppColors.textSecondary : AppColors.danger,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // Middle Donut Chart & Breakdown Legend
                                Row(
                                  children: [
                                    OeeDonutChart(
                                      availability: isRun ? 70 : 18,
                                      performance: isRun ? 20 : 32,
                                      quality: isRun ? 10 : 50,
                                      size: 76,
                                      strokeWidth: 10,
                                    ),
                                    const SizedBox(width: 16),

                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("OEE Breakdown", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                          const SizedBox(height: 4),
                                          _buildBreakdownItem(const Color(0xFF3B82F6), isRun ? "70% Availability" : "18% Availability"),
                                          _buildBreakdownItem(const Color(0xFFF59E0B), isRun ? "20% Performance" : "32% Performance"),
                                          _buildBreakdownItem(const Color(0xFF10B981), isRun ? "10% Quality" : "50% Quality"),
                                        ],
                                      ),
                                    ),

                                    // Cycle Time
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        const Icon(Icons.timer_outlined, size: 20, color: AppColors.primary),
                                        const SizedBox(height: 4),
                                        Text(
                                          isRun ? "2.51m" : "6.21m",
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                                        ),
                                        const Text("Cycle Time", style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // Graphic Machine Time Timeline Widget (Shows exact time of down)
                                MachineGraphicTimeline(
                                  logs: mch.downtimeLogs,
                                  currentStatus: mch.status,
                                  compactMode: false,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),

                    const SizedBox(height: 110), // Spacing for sticky OEE bottom bar
                  ],
                ),
              ),

              // Sticky Travelio/Dashboard Style OEE Target Bar (Light Surface Theme)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 16,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStickyOeeMetric("Target", "85%", AppColors.danger),
                        _buildStickyOeeMetric("Availability", "92%", AppColors.textPrimary),
                        _buildStickyOeeMetric("Performance", "95%", AppColors.textPrimary),
                        _buildStickyOeeMetric("Quality", "98%", AppColors.textPrimary),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: _buildStickyOeeMetric("OEE Total", "${vm.averageOee.toStringAsFixed(0)}%", Colors.white, isHighlighted: true),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildKeyMetricTile(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: valueColor)),
      ],
    );
  }

  Widget _buildBreakdownItem(Color color, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(text, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildOeeLegendDot(Color color, String text) {
    return Row(
      children: [
        Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 10)),
      ],
    );
  }

  Widget _buildStickyOeeMetric(String label, String value, Color textColor, {bool isHighlighted = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: TextStyle(fontSize: 10, color: isHighlighted ? Colors.white70 : AppColors.textSecondary)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textColor)),
      ],
    );
  }
}
